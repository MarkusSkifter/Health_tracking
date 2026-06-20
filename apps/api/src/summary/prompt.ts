import type { IsoDate, LoadMetrics, PlannedWorkout } from "@health/shared";
import type { ActivityRow, WellnessRow } from "../db/schema";
import { acrZone, addDays, dailyLoadByDate } from "../metrics/load";

export const SUMMARY_SYSTEM_PROMPT = `You are a sharp endurance coach giving a 2-sentence daily briefing.

Rules:
- Maximum 2 short sentences. Punchy and direct — the athlete reads this in 5 seconds.
- First sentence: what they did and how it sits relative to recent load (one fact, one judgement).
- Second sentence: what the recovery signals say and what to do next — a clear action or reassurance.
- If upcoming workouts are listed, fold in a one-word verdict on the next session (e.g. "Wednesday intervals look good" or "consider swapping Thursday to easy").
- Never invent data. If a signal is missing, skip it.
- No hedging, no padding, no "it's important to". Be direct.`;

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
