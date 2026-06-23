CREATE TABLE "coros_workouts" (
  "id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
  "user_id" integer NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
  "sport_type" integer,
  "workout_id" text NOT NULL,
  "start_time" bigint,
  "end_time" bigint,
  "total_time" integer,
  "distance" real,
  "calories" integer,
  "avg_hr" integer,
  "max_hr" integer,
  "avg_power" integer,
  "max_power" integer,
  "raw_json" jsonb NOT NULL,
  "received_at" timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX "coros_workouts_user_workout_idx" ON "coros_workouts"("user_id", "workout_id");
