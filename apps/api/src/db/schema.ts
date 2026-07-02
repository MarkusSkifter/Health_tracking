/**
 * Postgres schema (SPEC §5).
 *
 * Designed multi-user from day one (every domain row carries `userId`) so the
 * v2 transition needs only an auth layer, not a schema redesign. v1 runs with a
 * single hardcoded user. Raw tables preserve the original intervals.icu payload
 * so the normalized schema can be rebuilt without re-fetching.
 *
 * Column names are snake_case in Postgres (via the `casing` option on both the
 * drizzle client and drizzle-kit config); TS keys stay camelCase.
 */
import {
  date,
  index,
  integer,
  jsonb,
  pgTable,
  real,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";

export const users = pgTable("users", {
  id: integer().primaryKey().generatedAlwaysAsIdentity(),
  name: text().notNull(),
  email: text().notNull().unique(),
  intervalsAthleteId: text().notNull(),
  /** Encrypted at rest in v2; null in v1 (the key lives in a server env var). */
  intervalsApiKeyEncrypted: text(),
  createdAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
});

export const activitiesRaw = pgTable(
  "activities_raw",
  {
    id: integer().primaryKey().generatedAlwaysAsIdentity(),
    userId: integer()
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    intervalsActivityId: text().notNull(),
    fetchedAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
    rawJson: jsonb().$type<Record<string, unknown>>().notNull(),
  },
  (t) => [uniqueIndex().on(t.userId, t.intervalsActivityId)],
);

export const activities = pgTable(
  "activities",
  {
    id: integer().primaryKey().generatedAlwaysAsIdentity(),
    userId: integer()
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    intervalsActivityId: text().notNull(),
    date: date({ mode: "string" }).notNull(),
    type: text().notNull(),
    durationSec: integer(),
    distanceM: real(),
    avgPower: integer(),
    avgHr: integer(),
    trainingLoad: real(),
    createdAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    uniqueIndex().on(t.userId, t.intervalsActivityId),
    index().on(t.userId, t.date),
  ],
);

export const wellnessRaw = pgTable(
  "wellness_raw",
  {
    id: integer().primaryKey().generatedAlwaysAsIdentity(),
    userId: integer()
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    date: date({ mode: "string" }).notNull(),
    fetchedAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
    rawJson: jsonb().$type<Record<string, unknown>>().notNull(),
  },
  (t) => [uniqueIndex().on(t.userId, t.date)],
);

export const wellness = pgTable(
  "wellness",
  {
    id: integer().primaryKey().generatedAlwaysAsIdentity(),
    userId: integer()
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    date: date({ mode: "string" }).notNull(),
    restingHr: integer(),
    hrv: real(),
    sleepSec: integer(),
    steps: integer(),
    weightKg: real(),
    createdAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [uniqueIndex().on(t.userId, t.date)],
);

export const dailySummary = pgTable(
  "daily_summary",
  {
    id: integer().primaryKey().generatedAlwaysAsIdentity(),
    userId: integer()
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    date: date({ mode: "string" }).notNull(),
    trainingLoadDaily: real().notNull(),
    load7d: real("load_7d").notNull(),
    load28d: real("load_28d").notNull(),
    acuteChronicRatio: real().notNull(),
    aiSummaryText: text().notNull(),
    createdAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [uniqueIndex().on(t.userId, t.date)],
);

export const userSettings = pgTable(
  "user_settings",
  {
    id: integer().primaryKey().generatedAlwaysAsIdentity(),
    userId: integer()
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    ftpWatts: integer(),
    runThresholdSec: integer(),
    updatedAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [uniqueIndex().on(t.userId)],
);

export const pushSubscriptions = pgTable(
  "push_subscriptions",
  {
    id: integer().primaryKey().generatedAlwaysAsIdentity(),
    userId: integer()
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    endpoint: text().notNull(),
    p256dh: text().notNull(),
    auth: text().notNull(),
    createdAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [uniqueIndex().on(t.userId, t.endpoint)],
);

export const corosWorkouts = pgTable(
  "coros_workouts",
  {
    id: integer().primaryKey().generatedAlwaysAsIdentity(),
    userId: integer()
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    sportType: integer(),
    workoutId: text().notNull(),
    startTime: integer(),
    endTime: integer(),
    totalTime: integer(),
    distance: real(),
    calories: integer(),
    avgHr: integer(),
    maxHr: integer(),
    avgPower: integer(),
    maxPower: integer(),
    rawJson: jsonb().$type<Record<string, unknown>>().notNull(),
    receivedAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [uniqueIndex().on(t.userId, t.workoutId)],
);

export const athleteProfiles = pgTable("athlete_profile", {
  userId: integer("user_id")
    .primaryKey()
    .references(() => users.id, { onDelete: "cascade" }),
  bio: text(),
  weeklyTrainingHours: integer("weekly_training_hours"),
  trainingDaysPerWeek: integer("training_days_per_week"),
  updatedAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
});

export const trainingGoals = pgTable(
  "training_goals",
  {
    id: uuid().primaryKey().defaultRandom(),
    userId: integer("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    eventName: text("event_name").notNull(),
    eventType: text("event_type"),
    targetDate: date("target_date", { mode: "string" }).notNull(),
    notes: text(),
    createdAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index().on(t.userId, t.targetDate)],
);

// Row-type helpers for use across the API.
export type ActivityRow = typeof activities.$inferSelect;
export type WellnessRow = typeof wellness.$inferSelect;
export type DailySummaryRow = typeof dailySummary.$inferSelect;
export type NewActivity = typeof activities.$inferInsert;
export type NewWellness = typeof wellness.$inferInsert;
