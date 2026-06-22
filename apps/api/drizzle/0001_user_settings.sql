CREATE TABLE "user_settings" (
  "id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
  "user_id" integer NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
  "ftp_watts" integer,
  "run_threshold_sec" integer,
  "updated_at" timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX "user_settings_user_id_idx" ON "user_settings"("user_id");
