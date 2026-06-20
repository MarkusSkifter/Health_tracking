/**
 * Standalone end-to-end connectivity check (SPEC build step 3).
 *
 * Authenticates to intervals.icu with the personal API key, pulls a recent
 * rolling window of activities + wellness, and prints what it found. No database
 * involved — this only proves the round-trip works before anything is built on
 * top of it.
 *
 *   pnpm --filter @health/api verify:intervals
 */
import { intervalsEnv } from "../env";
import { IntervalsClient } from "./client";
import { ATHLETE_TIMEZONE, rollingWindow } from "./dates";

const { INTERVALS_API_KEY, INTERVALS_ATHLETE_ID } = intervalsEnv();

const client = new IntervalsClient({
  apiKey: INTERVALS_API_KEY,
  athleteId: INTERVALS_ATHLETE_ID,
});

// Spec recommends a 7-day window to catch late-arriving wellness syncs.
const { oldest, newest } = rollingWindow(7);

console.log(
  `Fetching intervals.icu data for athlete ${INTERVALS_ATHLETE_ID} ` +
    `from ${oldest} to ${newest} (${ATHLETE_TIMEZONE})\n`,
);

const [activities, wellness] = await Promise.all([
  client.getActivities(oldest, newest),
  client.getWellness(oldest, newest),
]);

console.log(`✓ Activities: ${activities.length} record(s)`);
if (activities.length > 0) {
  console.log("  Most recent activity (raw):");
  console.log(indent(JSON.stringify(activities.at(-1), null, 2)));
}

console.log(`\n✓ Wellness: ${wellness.length} record(s)`);
if (wellness.length > 0) {
  console.log("  Most recent wellness (raw):");
  console.log(indent(JSON.stringify(wellness.at(-1), null, 2)));
}

console.log("\n✓ intervals.icu round-trip OK.");

function indent(text: string): string {
  return text
    .split("\n")
    .map((line) => `    ${line}`)
    .join("\n");
}
