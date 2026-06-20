import { eq, sql } from "drizzle-orm";
import { db } from "../db/client";
import {
  activities,
  activitiesRaw,
  users,
  wellness,
  wellnessRaw,
} from "../db/schema";
import { intervalsEnv } from "../env";
import { toActivity, toWellness } from "../intervals/mappers";
import {
  intervalsActivitySchema,
  intervalsWellnessSchema,
} from "../intervals/types";

/**
 * Resolve the single v1 user by intervals.icu athlete id, creating the row on
 * first run. (Multi-user comes in v2; the schema already scopes every row by
 * `userId`.)
 */
export async function getOrCreateUserId(): Promise<number> {
  const { INTERVALS_ATHLETE_ID } = intervalsEnv();

  const existing = await db.query.users.findFirst({
    where: eq(users.intervalsAthleteId, INTERVALS_ATHLETE_ID),
  });
  if (existing) return existing.id;

  const [created] = await db
    .insert(users)
    .values({
      name: "Founder",
      email: `${INTERVALS_ATHLETE_ID}@local`,
      intervalsAthleteId: INTERVALS_ATHLETE_ID,
    })
    .returning({ id: users.id });

  if (!created) throw new Error("Failed to create user row");
  return created.id;
}

/** Upsert activities into both the raw and normalized tables. */
export async function storeActivities(
  userId: number,
  rawActivities: unknown[],
): Promise<number> {
  for (const item of rawActivities) {
    const parsed = intervalsActivitySchema.parse(item);
    const json = item as Record<string, unknown>;

    await db
      .insert(activitiesRaw)
      .values({ userId, intervalsActivityId: parsed.id, rawJson: json })
      .onConflictDoUpdate({
        target: [activitiesRaw.userId, activitiesRaw.intervalsActivityId],
        set: { rawJson: json, fetchedAt: sql`now()` },
      });

    const norm = toActivity(item, userId);
    await db
      .insert(activities)
      .values(norm)
      .onConflictDoUpdate({
        target: [activities.userId, activities.intervalsActivityId],
        set: {
          date: norm.date,
          type: norm.type,
          durationSec: norm.durationSec,
          distanceM: norm.distanceM,
          avgPower: norm.avgPower,
          avgHr: norm.avgHr,
          trainingLoad: norm.trainingLoad,
        },
      });
  }
  return rawActivities.length;
}

/** Upsert wellness records into both the raw and normalized tables. */
export async function storeWellness(
  userId: number,
  rawWellness: unknown[],
): Promise<number> {
  for (const item of rawWellness) {
    const parsed = intervalsWellnessSchema.parse(item);
    const json = item as Record<string, unknown>;

    await db
      .insert(wellnessRaw)
      .values({ userId, date: parsed.id, rawJson: json })
      .onConflictDoUpdate({
        target: [wellnessRaw.userId, wellnessRaw.date],
        set: { rawJson: json, fetchedAt: sql`now()` },
      });

    const norm = toWellness(item, userId);
    await db
      .insert(wellness)
      .values(norm)
      .onConflictDoUpdate({
        target: [wellness.userId, wellness.date],
        set: {
          restingHr: norm.restingHr,
          hrv: norm.hrv,
          sleepSec: norm.sleepSec,
          steps: norm.steps,
          weightKg: norm.weightKg,
        },
      });
  }
  return rawWellness.length;
}
