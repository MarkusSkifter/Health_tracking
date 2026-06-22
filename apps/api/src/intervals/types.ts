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
  id: z.string(),
  start_date_local: z.string(),
  type: z.string().nullish(),
  moving_time: z.number().nullish(),
  elapsed_time: z.number().nullish(),
  distance: z.number().nullish(),
  icu_average_watts: z.number().nullish(),
  average_watts: z.number().nullish(),
  average_heartrate: z.number().nullish(),
  icu_training_load: z.number().nullish(),
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
});

export type IntervalsActivity = z.infer<typeof intervalsActivitySchema>;
export type IntervalsWellness = z.infer<typeof intervalsWellnessSchema>;
export type IntervalsEvent = z.infer<typeof intervalsEventSchema>;
