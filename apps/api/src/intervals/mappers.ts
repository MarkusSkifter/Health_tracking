import type { NewActivity, NewWellness } from "../db/schema";
import { intervalsActivitySchema, intervalsWellnessSchema } from "./types";

const roundOrNull = (n: number | null | undefined): number | null =>
  n == null ? null : Math.round(n);

/** Map a raw intervals.icu activity to a normalized row (SPEC §5 `activities`). */
export function toActivity(raw: unknown, userId: number): NewActivity {
  const a = intervalsActivitySchema.parse(raw);
  return {
    userId,
    intervalsActivityId: a.id,
    // Use the athlete-local calendar day the activity started.
    date: a.start_date_local.slice(0, 10),
    type: a.type ?? "Unknown",
    durationSec: roundOrNull(a.moving_time ?? a.elapsed_time),
    distanceM: a.distance ?? null,
    avgPower: roundOrNull(a.icu_average_watts ?? a.average_watts),
    avgHr: roundOrNull(a.average_heartrate),
    trainingLoad: a.icu_training_load ?? null,
  };
}

/** Map a raw intervals.icu wellness record to a normalized row (SPEC §5 `wellness`). */
export function toWellness(raw: unknown, userId: number): NewWellness {
  const w = intervalsWellnessSchema.parse(raw);
  return {
    userId,
    date: w.id,
    restingHr: roundOrNull(w.restingHR),
    hrv: w.hrv ?? null,
    sleepSec: roundOrNull(w.sleepSecs),
    steps: roundOrNull(w.steps),
    weightKg: w.weight ?? null,
  };
}
