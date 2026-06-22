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
  /** Wellness for the same date as the latest summary (null if not synced). */
  wellness: Wellness | null;
  /** Recent daily load for the trend sparkline. */
  trend: Array<{ date: IsoDate; trainingLoadDaily: number }>;
}

/** One day of merged load + wellness data for the analytics view. */
export interface AnalyticsDay {
  date: IsoDate;
  trainingLoadDaily: number | null;
  load7d: number | null;
  load28d: number | null;
  acuteChronicRatio: number | null;
  hrv: number | null;
  restingHr: number | null;
  sleepSec: number | null;
  steps: number | null;
  weightKg: number | null;
}

export interface AnalyticsResponse {
  days: AnalyticsDay[];
  from: IsoDate;
  to: IsoDate;
}

/** One day in an AI-generated training suggestion. */
export interface AiDaySuggestion {
  date: IsoDate;
  name: string;
  type: string | null;
  plannedDurationSec: number | null;
  plannedLoad: number;
  rationale: string;
  /** Workout steps in intervals.icu format (- 40m 50-60%, 8x blocks, etc.) */
  description?: string | null;
}

/** A full AI-generated week plan returned when the calendar is empty. */
export interface AiWeekPlan {
  overview: string;
  days: AiDaySuggestion[];
}

/** A planned workout from the intervals.icu calendar. */
export interface PlannedWorkout {
  date: IsoDate;
  name: string;
  type: string | null;
  plannedDurationSec: number | null;
  plannedLoad: number | null;
  description: string | null;
}

/** Claude model used for the daily summary (SPEC §7). */
export const SUMMARY_MODEL = "claude-haiku-4-5-20251001" as const;
