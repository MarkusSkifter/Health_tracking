import type { IsoDate, LoadMetrics, PlannedWorkout } from "@health/shared";
import type { ActivityRow, WellnessRow } from "../db/schema";
import { acrZone, addDays, dailyLoadByDate } from "../metrics/load";

export const SUMMARY_SYSTEM_PROMPT = `You are a concise, supportive endurance-training analyst writing one athlete's daily summary.

Rules:
- Ground every statement in the numbers provided. Never invent or estimate data that isn't given.
- The load metrics are computed and authoritative — narrate them, don't recompute or contradict them.
- Write 4–7 sentences of plain, conversational prose. No headings, no bullet points, no markdown.
- Cover, in order: what the athlete did (today or most recently), how that compares to recent load, what the recovery signals (resting HR, HRV, sleep) suggest, and — if upcoming workouts are listed — briefly comment on how the plan looks given the current fitness and recovery state. Flag any session that looks aggressive given a low HRV trend, high ACR, or accumulated fatigue, and suggest adjustments if warranted.
- If a signal is missing, simply don't mention it — do not speculate about why.
- Be calm and factual. Flag genuine overreaching (high acute:chronic ratio) or detraining, but don't alarm.`;

export interface SummaryInput {
  date: IsoDate;
  metrics: LoadMetrics;
  /** Recent activities window (up to 28 days, ending on `date`). */
  activities: ActivityRow[];
  /** Recent wellness window (up to 14 days, ending on `date`). */
  wellness: WellnessRow[];
  /** Upcoming planned workouts (next 7 days from intervals.icu calendar). */
  upcoming?: PlannedWorkout[];
}

function fmtDuration(sec: number | null): string {
  if (sec == null) return "—";
  const h = Math.floor(sec / 3600);
  const m = Math.round((sec % 3600) / 60);
  return h > 0 ? `${h}h ${m}m` : `${m}m`;
}

function activityLine(a: ActivityRow): string {
  const parts: string[] = [a.type, fmtDuration(a.durationSec)];
  if (a.distanceM != null) parts.push(`${(a.distanceM / 1000).toFixed(1)} km`);
  if (a.trainingLoad != null) parts.push(`load ${Math.round(a.trainingLoad)}`);
  if (a.avgPower != null) parts.push(`${a.avgPower} W`);
  if (a.avgHr != null) parts.push(`${a.avgHr} bpm`);
  return `- ${parts.join(", ")}`;
}

function wellnessLine(w: WellnessRow): string {
  const parts: string[] = [];
  if (w.restingHr != null) parts.push(`RHR ${w.restingHr}`);
  if (w.hrv != null) parts.push(`HRV ${Math.round(w.hrv)}`);
  if (w.sleepSec != null) parts.push(`sleep ${(w.sleepSec / 3600).toFixed(1)}h`);
  if (w.steps != null) parts.push(`${w.steps} steps`);
  if (w.weightKg != null) parts.push(`${w.weightKg.toFixed(1)} kg`);
  return parts.length > 0 ? parts.join(", ") : "no data";
}

function fmtPlanned(w: PlannedWorkout): string {
  const parts: string[] = [w.name];
  if (w.type && w.type !== w.name) parts[0] = `${w.name} (${w.type})`;
  if (w.plannedDurationSec != null) parts.push(fmtDuration(w.plannedDurationSec));
  if (w.plannedLoad != null) parts.push(`load ${Math.round(w.plannedLoad)}`);
  return `- ${w.date}: ${parts.join(", ")}`;
}

/** Render the structured data block Claude narrates (SPEC §7). */
export function buildSummaryUserPrompt(input: SummaryInput): string {
  const { date, metrics, activities, wellness, upcoming } = input;

  const todays = activities.filter((a) => a.date === date);
  const wellnessByDate = new Map(wellness.map((w) => [w.date, w]));
  const todayWellness = wellnessByDate.get(date);
  const loadByDate = dailyLoadByDate(activities);
  const zone = acrZone(metrics.acuteChronicRatio, metrics.load28d > 0);

  const lines: string[] = [
    `Date: ${date}`,
    "",
    "Today's activities:",
    todays.length > 0
      ? todays.map(activityLine).join("\n")
      : "- none recorded yet today",
    "",
    "Today's wellness:",
    todayWellness ? `- ${wellnessLine(todayWellness)}` : "- none recorded yet today",
    "",
    "Computed load metrics (authoritative — narrate, do not recompute):",
    `- Daily training load: ${Math.round(metrics.trainingLoadDaily)}`,
    `- 7-day load: ${Math.round(metrics.load7d)}`,
    `- 28-day load: ${Math.round(metrics.load28d)}`,
    `- Acute:chronic ratio: ${metrics.acuteChronicRatio.toFixed(2)} (${zone})`,
    "",
    "Recent history (oldest first):",
  ];

  for (let i = 13; i >= 0; i--) {
    const d = addDays(date, -i);
    const load = Math.round(loadByDate.get(d) ?? 0);
    const w = wellnessByDate.get(d);
    lines.push(`- ${d}: load ${load}; ${w ? wellnessLine(w) : "—"}`);
  }

  if (upcoming && upcoming.length > 0) {
    lines.push("", "Upcoming planned workouts (next 7 days):");
    for (const w of upcoming) lines.push(fmtPlanned(w));
  } else {
    lines.push("", "Upcoming planned workouts: none scheduled in intervals.icu.");
  }

  return lines.join("\n");
}
