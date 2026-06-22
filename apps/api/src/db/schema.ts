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

// Row-type helpers for use across the API.
export type UserRow = typeof users.$inferSelect;
export type ActivityRow = typeof activities.$inferSelect;
export type WellnessRow = typeof wellness.$inferSelect;
export type DailySummaryRow = typeof dailySummary.$inferSelect;
export type NewActivity = typeof activities.$inferInsert;
export type NewWellness = typeof wellness.$inferInsert;
export type NewDailySummary = typeof dailySummary.$inferInsert;
