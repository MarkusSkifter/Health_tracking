import type { AiDaySuggestion, AiWeekPlan } from "@health/shared";
import { SUMMARY_MODEL } from "@health/shared";
import Anthropic from "@anthropic-ai/sdk";
import { and, between, desc, eq } from "drizzle-orm";
import { db } from "../db/client";
import { activities, dailySummary, wellness } from "../db/schema";
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
    days: dates.map((date, i) => ({
      date,
      name: templates[i].name,
      type: templates[i].type,
      plannedDurationSec: templates[i].dur,
      plannedLoad: templates[i].load,
      rationale: templates[i].rationale,
    })),
  };
}

export async function generateWeekSuggestions(): Promise<AiWeekPlan> {
  const today = isoDateInTimeZone(new Date(), ATHLETE_TIMEZONE);
  let tsb = 0;
  let acr = 1.0;

  try {
    const userId = await getOrCreateUserId();

    const [latestRows, recentWellness, recentActs] = await Promise.all([
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
    ]);

    const s = latestRows[0];
    if (s) {
      tsb = Math.round(s.load7d - s.load28d);
      acr = s.acuteChronicRatio;
    }

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

    const systemPrompt =
      "You are an expert endurance coach. Return ONLY valid JSON — no markdown, no code fences, no explanation.";

    const userPrompt =
      "Generate a 7-day training plan.\n\n" +
      (s ? (
        "Fitness (as of " + s.date + "): CTL=" + Math.round(s.load28d) +
        " ATL=" + Math.round(s.load7d) +
        " TSB=" + tsb + " (" + state + ")" +
        " ACR=" + s.acuteChronicRatio.toFixed(2) + "\n"
      ) : "") +
      (hrvLines ? "HRV trend: " + hrvLines + "\n" : "") +
      (actLines ? "Recent sessions: " + actLines + "\n" : "") +
      "\nDates: " + dates.join(", ") + "\n\n" +
      "Schema: {\"overview\":\"...\",\"days\":[{\"date\":\"YYYY-MM-DD\",\"name\":\"...\",\"type\":\"Run|Ride|Swim|WeightTraining|Rest\",\"plannedDurationSec\":3600,\"plannedLoad\":65,\"rationale\":\"...\"}]}\n\n" +
      "Rules: Rest => plannedDurationSec=null plannedLoad=0. Alternate hard/easy. " +
      "Easy load 20-45, moderate 45-70, hard 70-120. If fatigued or ACR>1.3 prioritise rest.";

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
