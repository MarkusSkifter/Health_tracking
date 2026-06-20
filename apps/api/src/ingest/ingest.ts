import { intervalsEnv } from "../env";
import { IntervalsClient } from "../intervals/client";
import { rollingWindow } from "../intervals/dates";
import { getOrCreateUserId, storeActivities, storeWellness } from "./store";

export interface IngestResult {
  userId: number;
  oldest: string;
  newest: string;
  activities: number;
  wellness: number;
}

/**
 * Pull a rolling window of intervals.icu data and upsert it (raw + normalized).
 * Spec recommends a 7-day window to catch late-arriving wellness syncs.
 */
export async function ingestWindow(days = 7): Promise<IngestResult> {
  const { INTERVALS_API_KEY, INTERVALS_ATHLETE_ID } = intervalsEnv();
  const client = new IntervalsClient({
    apiKey: INTERVALS_API_KEY,
    athleteId: INTERVALS_ATHLETE_ID,
  });

  const { oldest, newest } = rollingWindow(days);
  const userId = await getOrCreateUserId();

  const [rawActivities, rawWellness] = await Promise.all([
    client.getActivities(oldest, newest),
    client.getWellness(oldest, newest),
  ]);

  const activities = await storeActivities(userId, rawActivities);
  const wellness = await storeWellness(userId, rawWellness);

  return { userId, oldest, newest, activities, wellness };
}
