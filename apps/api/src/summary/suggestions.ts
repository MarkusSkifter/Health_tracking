import type { AiDaySuggestion, AiWeekPlan } from "@health/shared";
import { SUMMARY_MODEL } from "@health/shared";
import Anthropic from "@anthropic-ai/sdk";
import { and, asc, between, desc, eq, gte } from "drizzle-orm";
import { db } from "../db/client";
import { activities, athleteProfiles, dailySummary, trainingGoals, userSettings, wellness } from "../db/schema";
import { anthropicEnv } from "../env";
import { ATHLETE_TIMEZONE, isoDateInTimeZone } from "../intervals/dates";
import { getOrCreateUserId } from "../ingest/store";

function addDays(date: string, n: number): string {
  const d = new Date(`${date}T00:00:00`);
  d.setDate(d.getDate() + n);
  return d.toISOString().slice(0, 10);
}

function fallbackPlan(today: string, tsb: number, acr: number): AiWeekPlan {
  const dates = Array.from({ length: 7 }, (_, i) => addDays(today, i));
  const fatigued = tsb < -15 || acr > 1.3;

  type Template = { name: string; type: string; dur: number | null; load: number; rationale: string };

  const templates: Template[] = fatigued
    ? [
        { name: "Easy run", type: "Run", dur: 1800, load: 25, rationale: "Light aerobic work to aid recovery." },
        { name: "Rest", type: "Rest", dur: null, load: 0, rationale: "Full rest to absorb recent training." },
        { name: "Easy ride", type: "Ride", dur: 3600, load: 35, rationale: "Low-intensity aerobic maintenance." },
        { name: "Rest", type: "Rest", dur: null, load: 0, rationale: "Recovery is the priority this week." },
        { name: "Easy run", type: "Run", dur: 2700, load: 30, rationale: "Keep legs moving without adding stress." },
        { name: "Rest", type: "Rest", dur: null, load: 0, rationale: "Build freshness ahead of the weekend." },
        { name: "Long easy ride", type: "Ride", dur: 5400, load: 50, rationale: "Aerobic base work with fresh legs." },
      ]
    : [
        { name: "Easy run", type: "Run", dur: 2700, load: 35, rationale: "Aerobic base to start the week." },
        { name: "Threshold intervals", type: "Ride", dur: 3600, load: 80, rationale: "Quality work while legs are fresh." },
        { name: "Rest", type: "Rest", dur: null, load: 0, rationale: "Recovery between hard sessions." },
        { name: "Easy ride", type: "Ride", dur: 3600, load: 40, rationale: "Keep aerobic adaptation ticking over." },
        { name: "Tempo run", type: "Run", dur: 3000, load: 70, rationale: "Second quality session of the week." },
        { name: "Recovery ride", type: "Ride", dur: 2700, load: 30, rationale: "Flush legs after the hard run." },
        { name: "Long ride", type: "Ride", dur: 7200, load: 90, rationale: "Weekend endurance effort." },
      ];

  return {
    overview: fatigued
      ? "You are carrying significant fatigue this week. The plan prioritises recovery with easy sessions and rest days."
      : "Balanced week with two quality sessions and adequate recovery to build fitness steadily.",
    days: dates.map((date, i) => {
      const t = templates[i]!;
      return { date, name: t.name, type: t.type, plannedDurationSec: t.dur, plannedLoad: t.load, rationale: t.rationale };
    }),
  };
}

function daysBetween(a: string, b: string): number {
  return Math.round((new Date(`${b}T00:00:00`).getTime() - new Date(`${a}T00:00:00`).getTime()) / 86400000);
}

function periodizationPhase(weeksToGoal: number): { phase: string; acrTarget: string; guidance: string } {
  if (weeksToGoal > 16) return {
    phase: "Base",
    acrTarget: "0.9–1.1",
    guidance: "Build aerobic base with progressive volume. Mostly easy/moderate sessions, one quality session per week.",
  };
  if (weeksToGoal > 8) return {
    phase: "Build",
    acrTarget: "1.0–1.2",
    guidance: "Increase intensity and volume. Two quality sessions per week. Build toward race-specific demands.",
  };
  if (weeksToGoal > 4) return {
    phase: "Peak",
    acrTarget: "1.1–1.3",
    guidance: "Highest load week. Race-specific intensity and volume. Push ACR toward upper end of optimal range.",
  };
  if (weeksToGoal > 2) return {
    phase: "Taper",
    acrTarget: "0.8–1.0",
    guidance: "Reduce volume by 30-40%, maintain intensity. Let fatigue dissipate while keeping sharpness.",
  };
  return {
    phase: "Race week",
    acrTarget: "0.7–0.9",
    guidance: "Very easy sessions only. Stay fresh and confident. Short activations, no new stress.",
  };
}

export async function generateWeekSuggestions(): Promise<AiWeekPlan> {
  const today = isoDateInTimeZone(new Date(), ATHLETE_TIMEZONE);
  let tsb = 0;
  let acr = 1.0;

  try {
    const userId = await getOrCreateUserId();

    const [latestRows, recentWellness, recentActs, settingsRows, profileRows, goalRows] = await Promise.all([
      db.select().from(dailySummary)
        .where(eq(dailySummary.userId, userId))
        .orderBy(desc(dailySummary.date))
        .limit(1),
      db.select().from(wellness)
        .where(and(eq(wellness.userId, userId), between(wellness.date, addDays(today, -13), today)))
        .orderBy(desc(wellness.date)),
      db.select().from(activities)
        .where(and(eq(activities.userId, userId), between(activities.date, addDays(today, -13), today)))
        .orderBy(desc(activities.date)),
      db.select().from(userSettings).where(eq(userSettings.userId, userId)).limit(1),
      db.select().from(athleteProfiles).where(eq(athleteProfiles.userId, userId)).limit(1),
      db.select().from(trainingGoals)
        .where(and(eq(trainingGoals.userId, userId), gte(trainingGoals.targetDate, today)))
        .orderBy(asc(trainingGoals.targetDate))
        .limit(5),
    ]);

    const s = latestRows[0];
    if (s) {
      tsb = Math.round(s.load7d - s.load28d);
      acr = s.acuteChronicRatio;
    }
    const cfg = settingsRows[0];
    const ftpWatts = cfg?.ftpWatts ?? null;
    const runThresholdSec = cfg?.runThresholdSec ?? null;
    const profile = profileRows[0];
    const nextGoal = goalRows[0] ?? null;

    const dates = Array.from({ length: 7 }, (_, i) => addDays(today, i));

    const hrvLines = recentWellness
      .filter((w) => w.hrv != null)
      .slice(0, 7)
      .map((w) => `${w.date}: HRV ${Math.round(w.hrv!)}ms`)
      .join(", ");

    const actLines = recentActs
      .slice(0, 10)
      .map((a) => `${a.date}: ${a.type} load=${Math.round(a.trainingLoad ?? 0)}`)
      .join(", ");

    const state =
      tsb > 10 ? "fresh/rested" :
      tsb > -10 ? "balanced" :
      tsb > -20 ? "slightly fatigued" : "fatigued";

    // Goal context
    let goalSection = "";
    if (nextGoal) {
      const daysToGoal = daysBetween(today, nextGoal.targetDate);
      const weeksToGoal = daysToGoal / 7;
      const phaseInfo = periodizationPhase(weeksToGoal);
      goalSection =
        `\nPrimary goal: ${nextGoal.eventName}` +
        (nextGoal.eventType ? ` (${nextGoal.eventType})` : "") +
        ` on ${nextGoal.targetDate} — ${daysToGoal} days away (${Math.round(weeksToGoal)} weeks)\n` +
        (nextGoal.notes ? `Goal notes: ${nextGoal.notes}\n` : "") +
        `Training phase: ${phaseInfo.phase}\n` +
        `ACR target this week: ${phaseInfo.acrTarget}\n` +
        `Phase guidance: ${phaseInfo.guidance}\n`;
    }

    // Athlete profile context
    let profileSection = "";
    if (profile?.bio) profileSection += `Athlete profile: ${profile.bio}\n`;
    if (profile?.weeklyTrainingHours) profileSection += `Typical training: ${profile.weeklyTrainingHours}h/week`;
    if (profile?.trainingDaysPerWeek) profileSection += `, ${profile.trainingDaysPerWeek} days/week`;
    if (profileSection.endsWith(", ")) profileSection = profileSection.slice(0, -2);
    if (profile?.weeklyTrainingHours || profile?.trainingDaysPerWeek) profileSection += "\n";

    const systemPrompt =
      "You are an expert endurance coach. Return ONLY valid JSON — no markdown, no code fences, no explanation.";

    const improvementNote = nextGoal
      ? "The athlete has a goal — design the week to build fitness toward it following the phase guidance above."
      : "The athlete wants to improve fitness. Design each week so training load trends upward gradually and ACR stays in the 0.9–1.2 range (optimal improvement zone). Avoid stagnation.";

    const userPrompt =
      "Generate a 7-day training plan.\n\n" +
      profileSection +
      (s ? (
        "Fitness (as of " + s.date + "): CTL=" + Math.round(s.load28d) +
        " ATL=" + Math.round(s.load7d) +
        " TSB=" + tsb + " (" + state + ")" +
        " ACR=" + s.acuteChronicRatio.toFixed(2) + "\n"
      ) : "") +
      (ftpWatts ? "Cycling FTP: " + ftpWatts + "W\n" : "") +
      (runThresholdSec ? "Run threshold pace: " + Math.floor(runThresholdSec / 60) + ":" + String(runThresholdSec % 60).padStart(2, "0") + "/km\n" : "") +
      (hrvLines ? "HRV trend: " + hrvLines + "\n" : "") +
      (actLines ? "Recent sessions: " + actLines + "\n" : "") +
      goalSection +
      "\nDates: " + dates.join(", ") + "\n\n" +
      "Schema: {\"overview\":\"...\",\"days\":[{\"date\":\"YYYY-MM-DD\",\"name\":\"...\",\"type\":\"Run|Ride|Swim|WeightTraining|Rest\",\"plannedDurationSec\":3600,\"plannedLoad\":65,\"rationale\":\"one sentence coach note\",\"description\":\"- 15m 50-60%\\n4x\\n- 8m 91-105%\\n- 3m 50-60%\\n- 15m 50-60%\"}]}\n\n" +
      "Rules:\n" +
      "- Rest => plannedDurationSec=null plannedLoad=0, omit description.\n" +
      "- Alternate hard/easy. Easy load 20-45, moderate 45-70, hard 70-120.\n" +
      "- If fatigued or ACR>1.3 prioritise rest and easy sessions.\n" +
      "- " + improvementNote + "\n" +
      "- description: workout steps in intervals.icu format. Each step on its own line prefixed with '- '. " +
      "Use 'Nx' on its own line for repeat blocks, then '- Nm X-Y%' for each step inside the block. " +
      "Intensity as % of FTP: Z1=50-60%, Z2=60-75%, Z3=76-90%, Z4=91-105%, Z5=106%+. " +
      "Duration as Nm (minutes) or Ns (seconds). Example: '- 15m 50-60%\\n4x\\n- 8m 91-105%\\n- 3m 50%\\n- 15m 50%'.";

    const { ANTHROPIC_API_KEY } = anthropicEnv();
    const client = new Anthropic({ apiKey: ANTHROPIC_API_KEY });
    const message = await client.messages.create({
      model: SUMMARY_MODEL,
      max_tokens: 1200,
      system: systemPrompt,
      messages: [{ role: "user", content: userPrompt }],
    });

    const raw = message.content
      .map((b) => (b.type === "text" ? b.text : ""))
      .join("")
      .trim();

    const match = raw.match(/\{[\s\S]*\}/);
    if (match) {
      const parsed = JSON.parse(match[0]) as AiWeekPlan;
      if (parsed.days?.length) return parsed;
    }
  } catch {
    // Fall through to rule-based fallback
  }

  return fallbackPlan(today, tsb, acr);
}
