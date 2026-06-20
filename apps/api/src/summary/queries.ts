import type { DailySummary, TodayResponse } from "@health/shared";
import { desc, eq } from "drizzle-orm";
import { db } from "../db/client";
import { type DailySummaryRow, dailySummary } from "../db/schema";
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

/** Latest summary + a recent load trend for the sparkline (SPEC §8 today screen). */
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

  // Oldest-first for the sparkline.
  const trend = rows
    .slice()
    .reverse()
    .map((r) => ({ date: r.date, trainingLoadDaily: r.trainingLoadDaily }));

  return { summary: toDailySummary(latest), trend };
}
