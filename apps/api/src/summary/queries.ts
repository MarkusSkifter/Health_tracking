import type { Activity, AnalyticsDay, DailySummary, TodayResponse, Wellness } from "@health/shared";
import { and, asc, between, desc, eq, sql } from "drizzle-orm";
import { db } from "../db/client";
import { type DailySummaryRow, activities, dailySummary, wellness } from "../db/schema";
import { getOrCreateUserId } from "../ingest/store";

function toDailySummary(row: DailySummaryRow): DailySummary {
  return {
    date: row.date,
    trainingLoadDaily: row.trainingLoadDaily,
    load7d: row.load7d,
    load28d: row.load28d,
    acuteChronicRatio: row.acuteChronicRatio,
    aiSummaryText: row.aiSummaryText,
  };
}

/** Past daily summaries, most recent first (SPEC §8 history screen). */
export async function getHistory(limit = 60): Promise<DailySummary[]> {
  const userId = await getOrCreateUserId();
  const rows = await db
    .select()
    .from(dailySummary)
    .where(eq(dailySummary.userId, userId))
    .orderBy(desc(dailySummary.date))
    .limit(limit);
  return rows.map(toDailySummary);
}

/** Latest summary + wellness + a recent load trend for the sparkline. */
export async function getToday(): Promise<TodayResponse | null> {
  const userId = await getOrCreateUserId();
  const rows = await db
    .select()
    .from(dailySummary)
    .where(eq(dailySummary.userId, userId))
    .orderBy(desc(dailySummary.date))
    .limit(30);

  const latest = rows[0];
  if (!latest) return null;

  const wellnessRows = await db
    .select()
    .from(wellness)
    .where(and(eq(wellness.userId, userId), eq(wellness.date, latest.date)))
    .limit(1);

  const w = wellnessRows[0];
  const wellnessData: Wellness | null = w
    ? {
        date: w.date,
        restingHr: w.restingHr,
        hrv: w.hrv,
        sleepSec: w.sleepSec,
        steps: w.steps,
        weightKg: w.weightKg,
      }
    : null;

  const trend = rows
    .slice()
    .reverse()
    .map((r) => ({ date: r.date, trainingLoadDaily: r.trainingLoadDaily }));

  return { summary: toDailySummary(latest), wellness: wellnessData, trend };
}

/** All activities in a date range, oldest first. */
export async function getActivities(from: string, to: string): Promise<Activity[]> {
  const userId = await getOrCreateUserId();
  const rows = await db
    .select()
    .from(activities)
    .where(and(eq(activities.userId, userId), between(activities.date, from, to)))
    .orderBy(asc(activities.date), asc(activities.id));
  return rows.map((r) => ({
    intervalsActivityId: r.intervalsActivityId,
    date: r.date,
    type: r.type,
    durationSec: r.durationSec,
    distanceM: r.distanceM,
    avgPower: r.avgPower,
    avgHr: r.avgHr,
    trainingLoad: r.trainingLoad,
  }));
}

/** Per-day merged load + wellness for the analytics view. */
export async function getAnalytics(from: string, to: string): Promise<AnalyticsDay[]> {
  const userId = await getOrCreateUserId();
  const rows = await db.execute(sql`
    WITH
    -- Activity totals per day, extended 28 days before the window for rolling avg accuracy
    act AS (
      SELECT date, SUM(training_load) AS load
      FROM activities
      WHERE user_id = ${userId}
        AND date >= (${from}::date - INTERVAL '28 days')
        AND date <= ${to}::date
      GROUP BY date
    ),
    -- Merge daily_summary + wellness (existing rows), fallback load from activities
    base AS (
      SELECT
        COALESCE(ds.date, w.date)                    AS dt,
        COALESCE(ds.training_load_daily, act.load)   AS daily_load,
        ds.load_7d,
        ds.load_28d,
        ds.acute_chronic_ratio,
        w.hrv,
        w.resting_hr,
        w.sleep_sec,
        w.steps,
        w.weight_kg
      FROM daily_summary ds
      FULL OUTER JOIN wellness w
        ON ds.user_id = w.user_id AND ds.date = w.date
      LEFT JOIN act ON COALESCE(ds.date, w.date) = act.date
      WHERE (ds.user_id = ${userId} OR w.user_id = ${userId})
        AND COALESCE(ds.date, w.date) >= (${from}::date - INTERVAL '28 days')
        AND COALESCE(ds.date, w.date) <= ${to}::date

      UNION

      -- Days that only have activities (no summary and no wellness row)
      SELECT
        act.date, act.load,
        NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL
      FROM act
      WHERE NOT EXISTS (
        SELECT 1 FROM daily_summary ds WHERE ds.user_id = ${userId} AND ds.date = act.date
      ) AND NOT EXISTS (
        SELECT 1 FROM wellness w WHERE w.user_id = ${userId} AND w.date = act.date
      )
    )
    -- Fill missing rolling averages with window functions over the extended range
    SELECT
      dt::text                                                         AS date,
      daily_load                                                       AS "trainingLoadDaily",
      COALESCE(load_7d,
        ROUND(AVG(COALESCE(daily_load, 0))
          OVER (ORDER BY dt ROWS BETWEEN 6 PRECEDING AND CURRENT ROW))
      )                                                                AS "load7d",
      COALESCE(load_28d,
        ROUND(AVG(COALESCE(daily_load, 0))
          OVER (ORDER BY dt ROWS BETWEEN 27 PRECEDING AND CURRENT ROW))
      )                                                                AS "load28d",
      COALESCE(acute_chronic_ratio,
        CASE
          WHEN AVG(COALESCE(daily_load, 0))
               OVER (ORDER BY dt ROWS BETWEEN 27 PRECEDING AND CURRENT ROW) > 0
          THEN ROUND(
            AVG(COALESCE(daily_load, 0))
              OVER (ORDER BY dt ROWS BETWEEN 6 PRECEDING AND CURRENT ROW)::numeric /
            AVG(COALESCE(daily_load, 0))
              OVER (ORDER BY dt ROWS BETWEEN 27 PRECEDING AND CURRENT ROW)::numeric,
            2)
          ELSE NULL
        END
      )                                                                AS "acuteChronicRatio",
      hrv,
      resting_hr                                                       AS "restingHr",
      sleep_sec                                                        AS "sleepSec",
      steps,
      weight_kg                                                        AS "weightKg"
    FROM base
    WHERE dt BETWEEN ${from}::date AND ${to}::date
    ORDER BY dt ASC
  `);
  return rows as unknown as AnalyticsDay[];
}
