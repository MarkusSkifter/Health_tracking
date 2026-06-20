import type { IsoDate } from "@health/shared";
import { and, between, eq } from "drizzle-orm";
import { db } from "../db/client";
import { activities, dailySummary, wellness } from "../db/schema";
import { getOrCreateUserId } from "../ingest/store";
import { ATHLETE_TIMEZONE, isoDateInTimeZone } from "../intervals/dates";
import { fetchUpcomingWorkouts } from "../intervals/upcoming";
import { addDays, computeLoadMetrics } from "../metrics/load";
import { generateSummaryText } from "./claude";
import { buildSummaryUserPrompt } from "./prompt";

export interface GenerateOptions {
  /** Target day (YYYY-MM-DD). Defaults to today in the athlete timezone. */
  date?: IsoDate;
  /** Regenerate even if a summary already exists (SPEC §7: otherwise never retroactive). */
  force?: boolean;
}

export interface GenerateResult {
  date: IsoDate;
  aiSummaryText: string;
  skipped: boolean;
}

/**
 * Generate (and store) the daily summary for one day (SPEC §7).
 * Metrics are computed deterministically; Claude only narrates them.
 */
export async function generateDailySummary(
  opts: GenerateOptions = {},
): Promise<GenerateResult> {
  const userId = await getOrCreateUserId();
  const date = opts.date ?? isoDateInTimeZone(new Date(), ATHLETE_TIMEZONE);

  const existing = await db.query.dailySummary.findFirst({
    where: and(eq(dailySummary.userId, userId), eq(dailySummary.date, date)),
  });
  if (existing && !opts.force) {
    return { date, aiSummaryText: existing.aiSummaryText, skipped: true };
  }

  // 28-day window for metrics; 14-day window for wellness context.
  const acts = await db
    .select()
    .from(activities)
    .where(
      and(
        eq(activities.userId, userId),
        between(activities.date, addDays(date, -27), date),
      ),
    );
  const wells = await db
    .select()
    .from(wellness)
    .where(
      and(
        eq(wellness.userId, userId),
        between(wellness.date, addDays(date, -13), date),
      ),
    );

  const metrics = computeLoadMetrics(acts, date);
  const upcoming = await fetchUpcomingWorkouts(7).catch(() => []);
  const userPrompt = buildSummaryUserPrompt({
    date,
    metrics,
    activities: acts,
    wellness: wells,
    upcoming,
  });
  const aiSummaryText = await generateSummaryText(userPrompt);

  const row = {
    userId,
    date,
    trainingLoadDaily: metrics.trainingLoadDaily,
    load7d: metrics.load7d,
    load28d: metrics.load28d,
    acuteChronicRatio: metrics.acuteChronicRatio,
    aiSummaryText,
  };

  await db
    .insert(dailySummary)
    .values(row)
    .onConflictDoUpdate({
      target: [dailySummary.userId, dailySummary.date],
      set: {
        trainingLoadDaily: row.trainingLoadDaily,
        load7d: row.load7d,
        load28d: row.load28d,
        acuteChronicRatio: row.acuteChronicRatio,
        aiSummaryText: row.aiSummaryText,
      },
    });

  return { date, aiSummaryText, skipped: false };
}
