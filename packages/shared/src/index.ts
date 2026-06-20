/**
 * Shared domain types for Training Insights.
 * Kept framework-agnostic so both the API and the web app can import them.
 */

/** ISO calendar date string, `YYYY-MM-DD` (athlete-local day). */
export type IsoDate = string;

/** Normalized activity (SPEC §5 `activities`). */
export interface Activity {
  intervalsActivityId: string;
  date: IsoDate;
  type: string;
  durationSec: number | null;
  distanceM: number | null;
  avgPower: number | null;
  avgHr: number | null;
  trainingLoad: number | null;
}

/** Normalized wellness reading (SPEC §5 `wellness`). */
export interface Wellness {
  date: IsoDate;
  restingHr: number | null;
  hrv: number | null;
  sleepSec: number | null;
  steps: number | null;
  weightKg: number | null;
}

/** Deterministic, app-computed load metrics (SPEC §6). */
export interface LoadMetrics {
  /** Sum of per-activity training load for the day. */
  trainingLoadDaily: number;
  /** Trailing 7-day load sum. */
  load7d: number;
  /** Trailing 28-day load sum. */
  load28d: number;
  /** 7-day load ÷ (28-day load ÷ 4). */
  acuteChronicRatio: number;
}

/** A stored daily summary (SPEC §5 `daily_summary`). */
export interface DailySummary extends LoadMetrics {
  date: IsoDate;
  /** Claude-written 3–6 sentence narrative (SPEC §7). */
  aiSummaryText: string;
}

/** Payload for the frontend "today" screen (SPEC §8). */
export interface TodayResponse {
  summary: DailySummary;
  /** Recent daily load for the trend sparkline. */
  trend: Array<{ date: IsoDate; trainingLoadDaily: number }>;
}

/** Claude model used for the daily summary (SPEC §7). */
export const SUMMARY_MODEL = "claude-sonnet-4-6" as const;
