/**
 * Idempotent bootstrap: creates any tables that may not exist yet.
 * Safe to re-run — all statements use IF NOT EXISTS.
 * Called both from index.ts on every server start and as the Railway
 * release command so tables always exist before routes are hit.
 */
import postgres from "postgres";
import { databaseEnv } from "../env";

export async function bootstrap(): Promise<void> {
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

  await sql`
    CREATE TABLE IF NOT EXISTS "push_subscriptions" (
      "id"         integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
      "user_id"    integer NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
      "endpoint"   text NOT NULL,
      "p256dh"     text NOT NULL,
      "auth"       text NOT NULL,
      "created_at" timestamptz NOT NULL DEFAULT now()
    )
  `;

  await sql`
    CREATE UNIQUE INDEX IF NOT EXISTS "push_subscriptions_user_id_endpoint_idx"
    ON "push_subscriptions"("user_id", "endpoint")
  `;

  await sql`
    CREATE TABLE IF NOT EXISTS "athlete_profile" (
      "user_id"               integer PRIMARY KEY REFERENCES "users"("id") ON DELETE CASCADE,
      "bio"                   text,
      "weekly_training_hours" integer,
      "training_days_per_week" integer,
      "updated_at"            timestamptz NOT NULL DEFAULT now()
    )
  `;

  await sql`
    CREATE TABLE IF NOT EXISTS "training_goals" (
      "id"          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      "user_id"     integer NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
      "event_name"  text NOT NULL,
      "event_type"  text,
      "target_date" date NOT NULL,
      "notes"       text,
      "created_at"  timestamptz NOT NULL DEFAULT now()
    )
  `;

  await sql`
    CREATE INDEX IF NOT EXISTS "training_goals_user_date_idx"
    ON "training_goals"("user_id", "target_date")
  `;

  await sql.end();
  console.log("Bootstrap complete — tables ready");
}

// Allow running directly as a script: `tsx src/db/bootstrap.ts`
if (process.argv[1]?.endsWith("bootstrap.ts") || process.argv[1]?.endsWith("bootstrap.js")) {
  await bootstrap();
}
