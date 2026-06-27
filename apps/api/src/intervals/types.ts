import { z } from "zod";

/**
 * Validated subsets of intervals.icu payloads — only the fields we normalize
 * (SPEC §5). Unknown keys are ignored (zod strips them); the complete original
 * payload is preserved separately in the `*_raw` tables.
 *
 * Field names mirror the live API: activities are snake_case, wellness is
 * camelCase, and wellness `id` is the calendar date.
 */

export const intervalsActivitySchema = z.object({
  // intervals.icu IDs are strings ("i…") but some integrations return plain
  // integers — coerce so either form is accepted.
  id: z.coerce.string(),
  start_date_local: z.string(),
  type: z.string().nullish(),
  // Numeric fields: coerce from string just in case an integration serialises
  // them as quoted numbers (e.g. "155" instead of 155).
  moving_time: z.coerce.number().nullish(),
  elapsed_time: z.coerce.number().nullish(),
  distance: z.coerce.number().nullish(),
  icu_average_watts: z.coerce.number().nullish(),
  average_watts: z.coerce.number().nullish(),
  average_heartrate: z.coerce.number().nullish(),
  icu_training_load: z.coerce.number().nullish(),
  // Stub detection: intervals.icu sets _note when a third-party source (e.g.
  // Strava) owns the activity and prevents the data from being served via API.
  _note: z.string().nullish(),
});

export const intervalsWellnessSchema = z.object({
  id: z.string(), // YYYY-MM-DD
  restingHR: z.number().nullish(),
  hrv: z.number().nullish(),
  sleepSecs: z.number().nullish(),
  steps: z.number().nullish(),
  weight: z.number().nullish(),
});

export const intervalsEventSchema = z.object({
  id: z.number().nullish(),
  start_date_local: z.string(),
  name: z.string().nullish(),
  type: z.string().nullish(),
  moving_time: z.number().nullish(),
  icu_training_load: z.number().nullish(),
  description: z.string().nullish(),
  category: z.string().nullish(),
  plan_id: z.number().nullish(),
});

export type IntervalsActivity = z.infer<typeof intervalsActivitySchema>;
export type IntervalsWellness = z.infer<typeof intervalsWellnessSchema>;
export type IntervalsEvent = z.infer<typeof intervalsEventSchema>;
