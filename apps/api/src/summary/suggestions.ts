import type { AiWeekPlan } from "@health/shared";
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

export async function generateWeekSuggestions(): Promise<AiWeekPlan | null> {
  try {
    const userId = await getOrCreateUserId();
    const today = isoDateInTimeZone(new Date(), ATHLETE_TIMEZONE);

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
    if (!s) return null;

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

    const tsb = Math.round(s.load7d - s.load28d);
    const state =
      tsb > 10 ? "fresh/rested" :
      tsb > -10 ? "balanced" :
      tsb > -20 ? "slightly fatigued" : "fatigued";

    const systemPrompt =
      "You are an expert endurance coach. Return ONLY valid JSON with no markdown, " +
      "no explanation, no code fences. The JSON must match the requested schema exactly.";

    const userPrompt =
      "Generate a 7-day training plan for this athlete.\n\n" +
      "Fitness snapshot (as of " + s.date + "):\n" +
      "- CTL (chronic load/fitness): " + Math.round(s.load28d) + "\n" +
      "- ATL (acute load/fatigue): " + Math.round(s.load7d) + "\n" +
      "- TSB (form): " + tsb + " -> athlete is " + state + "\n" +
      "- ACR: " + s.acuteChronicRatio.toFixed(2) + "\n" +
      (hrvLines ? "- HRV trend (recent): " + hrvLines + "\n" : "") +
      (actLines ? "- Recent sessions: " + actLines + "\n" : "") +
      "\nPlan these 7 dates: " + dates.join(", ") + "\n\n" +
      "Return this JSON schema:\n" +
      '{"overview":"string","days":[{"date":"YYYY-MM-DD","name":"string",' +
      '"type":"Run|Ride|Swim|WeightTraining|Rest","plannedDurationSec":3600,' +
      '"plannedLoad":65,"rationale":"string"}]}\n\n' +
      "Rules:\n" +
      "- Rest days: type=Rest, plannedDurationSec=null, plannedLoad=0\n" +
      "- If fatigued or ACR>1.3 prioritise easy/rest days\n" +
      "- Alternate hard and easy days\n" +
      "- plannedLoad: rest=0, easy=20-45, moderate=45-70, hard=70-120\n" +
      "- plannedDurationSec in seconds; null for rest days\n" +
      "- rationale: one short sentence per day";

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
    if (!match) return null;

    return JSON.parse(match[0]) as AiWeekPlan;
  } catch {
    return null;
  }
}
