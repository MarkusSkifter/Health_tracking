import type { PlannedWorkout } from "@health/shared";
import { intervalsEnv } from "../env";
import { IntervalsClient } from "./client";
import { intervalsEventSchema } from "./types";

const WORKOUT_TYPES = new Set([
  "Ride", "Run", "Swim", "Walk", "Hike", "WeightTraining",
  "Workout", "VirtualRide", "VirtualRun", "Rowing", "Kayaking",
  "NordicSki", "RollerSki", "Crossfit", "Yoga", "Pilates",
]);

function isoToday(): string {
  return new Date().toISOString().slice(0, 10);
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

    // Skip non-workout events (notes, races without a type, etc.)
    if (e.category && e.category !== "WORKOUT") continue;
    if (!e.type && !e.name) continue;
    if (e.type && !WORKOUT_TYPES.has(e.type)) continue;

    workouts.push({
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
