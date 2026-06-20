/**
 * Quick ops/debug snapshot of stored data.
 *
 *   pnpm --filter @health/api db:inspect
 */
import { desc } from "drizzle-orm";
import { db } from "./client";
import {
  activities,
  activitiesRaw,
  dailySummary,
  users,
  wellness,
  wellnessRaw,
} from "./schema";

const [userCount, actCount, actRawCount, wellCount, wellRawCount, summaryCount] =
  await Promise.all([
    db.$count(users),
    db.$count(activities),
    db.$count(activitiesRaw),
    db.$count(wellness),
    db.$count(wellnessRaw),
    db.$count(dailySummary),
  ]);

console.log("Row counts:", {
  users: userCount,
  activities: actCount,
  activities_raw: actRawCount,
  wellness: wellCount,
  wellness_raw: wellRawCount,
  daily_summary: summaryCount,
});

const [latestActivity] = await db
  .select()
  .from(activities)
  .orderBy(desc(activities.date))
  .limit(1);
const [latestWellness] = await db
  .select()
  .from(wellness)
  .orderBy(desc(wellness.date))
  .limit(1);

console.log("\nLatest normalized activity:", latestActivity);
console.log("Latest normalized wellness:", latestWellness);

process.exit(0);
