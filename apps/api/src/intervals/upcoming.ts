import type { PlannedWorkout } from "@health/shared";
import { intervalsEnv } from "../env";
import { IntervalsClient } from "./client";
import { intervalsEventSchema } from "./types";
import { isoDateInTimeZone, ATHLETE_TIMEZONE } from "./dates";

const SKIP_CATEGORIES = new Set(["NOTE", "HOLIDAY", "TARGET"]);

function isoToday(): string {
  return isoDateInTimeZone(new Date(), ATHLETE_TIMEZONE);
}

function addDays(date: string, n: number): string {
  const d = new Date(`${date}T00:00:00`);
  d.setDate(d.getDate() + n);
  return d.toISOString().slice(0, 10);
}

export async function fetchUpcomingWorkouts(days = 7): Promise<PlannedWorkout[]> {
  const { INTERVALS_API_KEY, INTERVALS_ATHLETE_ID } = intervalsEnv();
  const client = new IntervalsClient({
    apiKey: INTERVALS_API_KEY,
    athleteId: INTERVALS_ATHLETE_ID,
  });

  const oldest = isoToday();
  const newest = addDays(oldest, days);
  const raw = await client.getEvents(oldest, newest);

  const workouts: PlannedWorkout[] = [];

  for (const item of raw) {
    const parsed = intervalsEventSchema.safeParse(item);
    if (!parsed.success) continue;
    const e = parsed.data;

    // Skip notes, holidays, and targets — keep all actual workout sessions
    if (e.category && SKIP_CATEGORIES.has(e.category)) continue;
    if (!e.type && !e.name) continue;

    workouts.push({
      id: e.id ?? null,
      planId: e.plan_id ?? null,
      date: e.start_date_local.slice(0, 10),
      name: e.name ?? e.type ?? "Workout",
      type: e.type ?? null,
      plannedDurationSec: e.moving_time ?? null,
      plannedLoad: e.icu_training_load ?? null,
      description: e.description ?? null,
    });
  }

  return workouts.sort((a, b) => a.date.localeCompare(b.date));
}
