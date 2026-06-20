/**
 * Manual ingestion run (and the building block for the daily job).
 *
 *   pnpm --filter @health/api ingest
 */
import { ingestWindow } from "./ingest";

const result = await ingestWindow(7);
console.log("Ingest complete:", result);

// postgres.js keeps the connection pool open; exit explicitly so the CLI ends.
process.exit(0);
