/**
 * Deterministic training-load metrics (SPEC §6).
 *
 * These numbers are computed in application code (never by the LLM) and stored
 * in `daily_summary`, so the displayed figures and the AI narrative can never
 * disagree. All functions are pure.
 */
import type { Activity, IsoDate, LoadMetrics } from "@health/shared";

/** Add `n` days to a `YYYY-MM-DD` date (n may be negative). Calendar-date math, UTC-safe. */
export function addDays(date: IsoDate, n: number): IsoDate {
  const parts = date.split("-");
  const dt = new Date(
    Date.UTC(Number(parts[0]), Number(parts[1]) - 1, Number(parts[2])),
  );
  dt.setUTCDate(dt.getUTCDate() + n);
  return dt.toISOString().slice(0, 10);
}

/** Sum per-activity training load by calendar date. Null/absent loads count as 0. */
export function dailyLoadByDate(activities: Activity[]): Map<IsoDate, number> {
  const byDate = new Map<IsoDate, number>();
  for (const activity of activities) {
    const load = activity.trainingLoad ?? 0;
    byDate.set(activity.date, (byDate.get(activity.date) ?? 0) + load);
  }
  return byDate;
}

/**
 * Sum daily load over the trailing window of `days` ending at `endDate`
 * (inclusive). A 7-day window covers `endDate` and the preceding 6 days.
 */
export function trailingSum(
  loadByDate: Map<IsoDate, number>,
  endDate: IsoDate,
  days: number,
): number {
  let sum = 0;
  for (let i = 0; i < days; i++) {
    sum += loadByDate.get(addDays(endDate, -i)) ?? 0;
  }
  return sum;
}

/** Acute:chronic ratio band for flagging (SPEC §6). */
export type AcrZone = "none" | "detraining" | "optimal" | "high" | "veryHigh";

/**
 * Classify the acute:chronic ratio.
 * Common sweet-spot guidance: ~0.8–1.3 optimal, <0.8 detraining,
 * 1.3–1.5 elevated, >1.5 high overreaching/injury risk.
 * `none` when there is no chronic base yet (insufficient 28-day history).
 */
export function acrZone(ratio: number, hasChronicBase: boolean): AcrZone {
  if (!hasChronicBase) return "none";
  if (ratio < 0.8) return "detraining";
  if (ratio <= 1.3) return "optimal";
  if (ratio <= 1.5) return "high";
  return "veryHigh";
}

/** Compute the deterministic load metrics for `targetDate` (SPEC §6). */
export function computeLoadMetrics(
  activities: Activity[],
  targetDate: IsoDate,
): LoadMetrics {
  const loadByDate = dailyLoadByDate(activities);
  const trainingLoadDaily = loadByDate.get(targetDate) ?? 0;
  const load7d = trailingSum(loadByDate, targetDate, 7);
  const load28d = trailingSum(loadByDate, targetDate, 28);

  // Chronic load = 28-day load normalized to a 7-day-equivalent (÷4).
  const chronic = load28d / 4;
  const acuteChronicRatio = chronic > 0 ? load7d / chronic : 0;

  return { trainingLoadDaily, load7d, load28d, acuteChronicRatio };
}
