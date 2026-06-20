/**
 * The daily job (SPEC §9): ingest the rolling window, then generate today's
 * summary. Run by Railway Cron at 05:00 Europe/Copenhagen.
 *
 *   pnpm --filter @health/api job:daily
 */
import { ingestWindow } from "../ingest/ingest";
import { generateDailySummary } from "../summary/generate";

const ingest = await ingestWindow(7);
console.log("Ingest complete:", ingest);

// Not forced: per SPEC §7 a day's summary is not regenerated once written.
const summary = await generateDailySummary();
console.log(
  summary.skipped
    ? `Summary for ${summary.date} already existed (skipped).`
    : `Summary generated for ${summary.date}:`,
);
console.log(summary.aiSummaryText);

process.exit(0);
