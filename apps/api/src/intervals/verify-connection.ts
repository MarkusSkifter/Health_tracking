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
import { intervalsActivitySchema } from "./types";
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

console.log(`✓ Activities: ${activities.length} record(s)\n`);

let parseOk = 0;
let parseFail = 0;

for (const item of activities) {
  const raw = item as Record<string, unknown>;
  const id = raw.id ?? "?";
  const date = String(raw.start_date_local ?? "").slice(0, 10);
  const type = raw.type ?? "(null)";

  const result = intervalsActivitySchema.safeParse(item);
  if (result.success) {
    parseOk++;
    const p = result.data;
    console.log(
      `  ✓ ${date}  id=${id}  type=${type}` +
        `  move=${p.moving_time ?? "-"}s  dist=${p.distance ?? "-"}m` +
        `  watts=${p.icu_average_watts ?? p.average_watts ?? "-"}` +
        `  load=${p.icu_training_load ?? "-"}`,
    );
  } else {
    parseFail++;
    console.log(`  ✗ ${date}  id=${id}  type=${type}  PARSE FAILED:`);
    for (const issue of result.error.issues) {
      console.log(`      field="${issue.path.join(".")}"  ${issue.message}  (received: ${JSON.stringify((raw as Record<string, unknown>)[issue.path[0] as string])})`);
    }
    console.log("    Full raw payload:");
    console.log(indent(JSON.stringify(item, null, 2)));
  }

  // Print full raw JSON for activities that parsed but have no useful fields —
  // these are likely from a device integration that uses different field names.
  if (result.success) {
    const p = result.data;
    const isEmpty = p.type == null && p.moving_time == null && p.distance == null;
    if (isEmpty) {
      console.log(`    ↳ null-data activity — full raw payload:`);
      console.log(indent(JSON.stringify(item, null, 2)));
    }
  }
}

console.log(`\n  Parse summary: ${parseOk} ok, ${parseFail} failed`);

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
