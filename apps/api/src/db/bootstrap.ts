/**
 * Idempotent bootstrap: creates any tables that may not exist yet.
 * Safe to re-run — all statements use IF NOT EXISTS.
 * Used as the Railway release command so new tables land before the server starts.
 */
import postgres from "postgres";
import { databaseEnv } from "../env";

const { DATABASE_URL } = databaseEnv();
const sql = postgres(DATABASE_URL, { max: 1 });

await sql`
  CREATE TABLE IF NOT EXISTS "user_settings" (
    "id"               integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
    "user_id"          integer NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
    "ftp_watts"        integer,
    "run_threshold_sec" integer,
    "updated_at"       timestamptz NOT NULL DEFAULT now()
  )
`;

await sql`
  CREATE UNIQUE INDEX IF NOT EXISTS "user_settings_user_id_idx"
  ON "user_settings"("user_id")
`;

await sql.end();
console.log("Bootstrap complete — user_settings ready");
