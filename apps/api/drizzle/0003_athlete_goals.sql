CREATE TABLE "athlete_profile" (
  "user_id" integer PRIMARY KEY REFERENCES "users"("id") ON DELETE CASCADE,
  "bio" text,
  "weekly_training_hours" integer,
  "training_days_per_week" integer,
  "updated_at" timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE "training_goals" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "user_id" integer NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
  "event_name" text NOT NULL,
  "event_type" text,
  "target_date" date NOT NULL,
  "notes" text,
  "created_at" timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX "training_goals_user_date_idx" ON "training_goals"("user_id", "target_date");
