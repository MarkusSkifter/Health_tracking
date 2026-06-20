/**
 * Ad-hoc summary generation.
 *
 *   pnpm --filter @health/api summary            # today
 *   pnpm --filter @health/api summary 2026-06-19 # a specific day
 *   pnpm --filter @health/api summary 2026-06-19 --force
 */
import { generateDailySummary } from "./generate";

const args = process.argv.slice(2);
const date = args.find((a) => !a.startsWith("--"));
const force = args.includes("--force");

const result = await generateDailySummary({ date, force });
console.log(
  result.skipped
    ? `Summary for ${result.date} already existed (skipped).`
    : `Summary generated for ${result.date}:\n`,
);
console.log(result.aiSummaryText);

process.exit(0);
