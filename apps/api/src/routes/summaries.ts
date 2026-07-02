import type { AiDaySuggestion } from "@health/shared";
import type { FastifyInstance } from "fastify";
import { and, asc, eq, gte } from "drizzle-orm";
import { ingestWindow } from "../ingest/ingest";
import { IntervalsClient } from "../intervals/client";
import { fetchUpcomingWorkouts } from "../intervals/upcoming";
import { intervalsEnv } from "../env";
import { db } from "../db/client";
import { athleteProfiles, trainingGoals, userSettings } from "../db/schema";
import { getOrCreateUserId } from "../ingest/store";
import { getActivities, getAnalytics, getHistory, getToday } from "../summary/queries";
import { generateDailySummary } from "../summary/generate";
import { generateWeekSuggestions } from "../summary/suggestions";
import { isoDateInTimeZone, ATHLETE_TIMEZONE } from "../intervals/dates";

// In-process cooldown so auto-ingest doesn't hammer intervals.icu on every request.
let lastAutoIngestMs = 0;
const AUTO_INGEST_COOLDOWN_MS = 10 * 60 * 1000; // 10 minutes

/** Routes that serve the frontend (SPEC §8, §9). */
export async function registerSummaryRoutes(app: FastifyInstance): Promise<void> {
  app.post<{ Body?: { days?: number } }>("/api/ingest", async (req, reply) => {
    try {
      const days = Math.min(req.body?.days ?? 7, 365);
      const result = await ingestWindow(days);
      // Regenerate today's summary so the dashboard reflects newly synced activities
      await generateDailySummary({ force: true }).catch((err) => {
        app.log.warn(err, "Summary regeneration failed after ingest");
      });
      return reply.code(200).send({ ok: true, ...result });
    } catch (err) {
      app.log.error(err, "Ingest failed");
      return reply.code(500).send({ error: "Ingest failed" });
    }
  });
  app.get("/api/today", async (_req, reply) => {
    const todayDate = isoDateInTimeZone(new Date(), ATHLETE_TIMEZONE);
    // Proactively generate today's summary if it hasn't been written yet
    // (e.g. first page load of the day before the cron job fires).
    const existing = await getToday();
    if (!existing || existing.summary.date < todayDate) {
      await generateDailySummary().catch((err) => {
        app.log.warn(err, "On-demand summary generation failed");
      });
    }
    const today = await getToday();
    if (!today) {
      return reply.code(404).send({ error: "No summaries yet — run the daily job." });
    }
    return today;
  });

  app.get("/api/history", async () => {
    return { summaries: await getHistory() };
  });

  app.get<{ Querystring: { from?: string; to?: string } }>("/api/activities", async (req) => {
    const now = new Date();
    const today = isoDateInTimeZone(now, ATHLETE_TIMEZONE);
    const [y, mo] = today.split("-");
    const from = req.query.from ?? `${y}-${mo}-01`;
    const to = req.query.to ?? today;

    // Auto-ingest recent data when the range includes today so completed workouts
    // are always visible without requiring a manual sync. Cooldown prevents
    // hammering intervals.icu on repeated page loads.
    if (to >= today) {
      const nowMs = Date.now();
      if (nowMs - lastAutoIngestMs > AUTO_INGEST_COOLDOWN_MS) {
        lastAutoIngestMs = nowMs;
        await ingestWindow(2).catch((err) => {
          app.log.warn(err, "Auto-ingest failed during activities fetch");
        });
      }
    }

    return { activities: await getActivities(from, to) };
  });

  app.get<{ Querystring: { from?: string; to?: string } }>("/api/analytics", async (req) => {
    const now = new Date();
    const today = isoDateInTimeZone(now, ATHLETE_TIMEZONE);
    const [y, mo] = today.split("-");
    const from = req.query.from ?? `${y}-${mo}-01`;
    const to = req.query.to ?? today;
    const days = await getAnalytics(from, to);
    return { days, from, to };
  });

  app.get("/api/upcoming", async (_req, reply) => {
    try {
      const workouts = await fetchUpcomingWorkouts(7);
      let suggestions = null;
      try { suggestions = await generateWeekSuggestions(); } catch { /* optional */ }
      return { workouts, suggestions };
    } catch (err) {
      app.log.error(err, "Failed to fetch upcoming workouts");
      return reply.code(500).send({ error: "Failed to fetch upcoming workouts" });
    }
  });

  app.get<{ Querystring: { from?: string; to?: string } }>("/api/events", async (req, reply) => {
    try {
      const now = new Date();
      const today = isoDateInTimeZone(now, ATHLETE_TIMEZONE);
      const [y, mo] = today.split("-");
      const lastDay = new Date(Number(y), Number(mo), 0).getDate();
      const from = req.query.from ?? `${y}-${mo}-01`;
      const to = req.query.to ?? `${y}-${mo}-${lastDay}`;
      const { INTERVALS_API_KEY, INTERVALS_ATHLETE_ID } = intervalsEnv();
      const client = new IntervalsClient({ apiKey: INTERVALS_API_KEY, athleteId: INTERVALS_ATHLETE_ID });
      const { intervalsEventSchema } = await import("../intervals/types");
      const SKIP_CATEGORIES = new Set(["NOTE", "HOLIDAY", "TARGET"]);
      const raw = await client.getEvents(from, to);
      const workouts = [];
      for (const item of raw) {
        const parsed = intervalsEventSchema.safeParse(item);
        if (!parsed.success) continue;
        const e = parsed.data;
        if (e.category && SKIP_CATEGORIES.has(e.category)) continue;
        if (!e.type && !e.name) continue;
        workouts.push({
          id: e.id ?? null,
          planId: e.plan_id ?? null,
          date: e.start_date_local.slice(0, 10),
          name: e.name ?? e.type ?? "Workout",
          type: e.type ?? null,
          plannedDurationSec: e.moving_time ?? null,
          plannedLoad: e.icu_training_load ?? null,
          description: e.description ?? null,
        });
      }
      return { workouts: workouts.sort((a: { date: string }, b: { date: string }) => a.date.localeCompare(b.date)) };
    } catch (err) {
      app.log.error(err, "Failed to fetch events");
      return reply.code(500).send({ error: "Failed to fetch events" });
    }
  });

  app.post<{ Body: { date: string; name: string; type?: string; durationMin?: number; load?: number; description?: string } }>("/api/events", async (req, reply) => {
    try {
      const { date, name, type, durationMin, load, description } = req.body;
      const { INTERVALS_API_KEY, INTERVALS_ATHLETE_ID } = intervalsEnv();
      const client = new IntervalsClient({ apiKey: INTERVALS_API_KEY, athleteId: INTERVALS_ATHLETE_ID });
      await client.createEvent({
        start_date_local: `${date}T08:00:00`,
        category: "WORKOUT",
        name,
        type: type || undefined,
        moving_time: durationMin ? durationMin * 60 : undefined,
        icu_training_load: load || undefined,
        description: description || undefined,
      });
      return { ok: true };
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Failed to create workout";
      app.log.error(err, "Failed to create workout");
      return reply.code(500).send({ error: msg });
    }
  });

  app.delete<{ Params: { id: string } }>("/api/events/:id", async (req, reply) => {
    try {
      const eventId = parseInt(req.params.id);
      if (isNaN(eventId)) return reply.code(400).send({ error: "Invalid event id" });
      const { INTERVALS_API_KEY, INTERVALS_ATHLETE_ID } = intervalsEnv();
      const client = new IntervalsClient({ apiKey: INTERVALS_API_KEY, athleteId: INTERVALS_ATHLETE_ID });
      await client.deleteEvent(eventId);
      return { ok: true };
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Failed to delete event";
      app.log.error(err, "Failed to delete event");
      return reply.code(500).send({ error: msg });
    }
  });

  app.get("/api/settings", async (_req, reply) => {
    try {
      const userId = await getOrCreateUserId();
      const rows = await db.select().from(userSettings).where(eq(userSettings.userId, userId)).limit(1);
      const row = rows[0];
      return { ftpWatts: row?.ftpWatts ?? null, runThresholdSec: row?.runThresholdSec ?? null };
    } catch (err) {
      app.log.error(err, "Failed to fetch settings");
      return reply.code(500).send({ error: "Failed to fetch settings" });
    }
  });

  app.put<{ Body: { ftpWatts?: number | null; runThresholdSec?: number | null } }>("/api/settings", async (req, reply) => {
    try {
      const userId = await getOrCreateUserId();
      const { ftpWatts, runThresholdSec } = req.body;
      const existing = await db.select({ id: userSettings.id }).from(userSettings).where(eq(userSettings.userId, userId)).limit(1);
      if (existing[0]) {
        await db.update(userSettings)
          .set({ ftpWatts: ftpWatts ?? null, runThresholdSec: runThresholdSec ?? null, updatedAt: new Date() })
          .where(eq(userSettings.userId, userId));
      } else {
        await db.insert(userSettings)
          .values({ userId, ftpWatts: ftpWatts ?? null, runThresholdSec: runThresholdSec ?? null });
      }
      return { ok: true };
    } catch (err) {
      app.log.error(err, "Failed to save settings");
      const msg = err instanceof Error ? err.message : String(err);
      return reply.code(500).send({ error: `Failed to save settings: ${msg}` });
    }
  });

  // ── Athlete profile ───────────────────────────────────────────────────────
  app.get("/api/profile", async (_req, reply) => {
    try {
      const userId = await getOrCreateUserId();
      const rows = await db.select().from(athleteProfiles).where(eq(athleteProfiles.userId, userId)).limit(1);
      const row = rows[0];
      return { bio: row?.bio ?? null, weeklyTrainingHours: row?.weeklyTrainingHours ?? null, trainingDaysPerWeek: row?.trainingDaysPerWeek ?? null };
    } catch (err) {
      app.log.error(err, "Failed to fetch profile");
      return reply.code(500).send({ error: "Failed to fetch profile" });
    }
  });

  app.put<{ Body: { bio?: string | null; weeklyTrainingHours?: number | null; trainingDaysPerWeek?: number | null } }>("/api/profile", async (req, reply) => {
    try {
      const userId = await getOrCreateUserId();
      const { bio, weeklyTrainingHours, trainingDaysPerWeek } = req.body;
      const existing = await db.select({ userId: athleteProfiles.userId }).from(athleteProfiles).where(eq(athleteProfiles.userId, userId)).limit(1);
      if (existing[0]) {
        await db.update(athleteProfiles)
          .set({ bio: bio ?? null, weeklyTrainingHours: weeklyTrainingHours ?? null, trainingDaysPerWeek: trainingDaysPerWeek ?? null, updatedAt: new Date() })
          .where(eq(athleteProfiles.userId, userId));
      } else {
        await db.insert(athleteProfiles).values({ userId, bio: bio ?? null, weeklyTrainingHours: weeklyTrainingHours ?? null, trainingDaysPerWeek: trainingDaysPerWeek ?? null });
      }
      return { ok: true };
    } catch (err) {
      app.log.error(err, "Failed to save profile");
      return reply.code(500).send({ error: "Failed to save profile" });
    }
  });

  // ── Training goals ─────────────────────────────────────────────────────────
  app.get("/api/goals", async (_req, reply) => {
    try {
      const userId = await getOrCreateUserId();
      const today = isoDateInTimeZone(new Date(), ATHLETE_TIMEZONE);
      const rows = await db.select().from(trainingGoals)
        .where(eq(trainingGoals.userId, userId))
        .orderBy(asc(trainingGoals.targetDate));
      return { goals: rows.map((r) => ({ id: r.id, eventName: r.eventName, eventType: r.eventType, targetDate: r.targetDate, notes: r.notes, isPast: r.targetDate < today })) };
    } catch (err) {
      app.log.error(err, "Failed to fetch goals");
      return reply.code(500).send({ error: "Failed to fetch goals" });
    }
  });

  app.post<{ Body: { eventName: string; eventType?: string | null; targetDate: string; notes?: string | null } }>("/api/goals", async (req, reply) => {
    try {
      const userId = await getOrCreateUserId();
      const { eventName, eventType, targetDate, notes } = req.body;
      if (!eventName || !targetDate) return reply.code(400).send({ error: "eventName and targetDate are required" });
      const rows = await db.insert(trainingGoals).values({ userId, eventName, eventType: eventType ?? null, targetDate, notes: notes ?? null }).returning();
      const row = rows[0];
      if (!row) return reply.code(500).send({ error: "Insert returned no row" });
      return { ok: true, id: row.id };
    } catch (err) {
      app.log.error(err, "Failed to create goal");
      return reply.code(500).send({ error: "Failed to create goal" });
    }
  });

  app.delete<{ Params: { id: string } }>("/api/goals/:id", async (req, reply) => {
    try {
      const userId = await getOrCreateUserId();
      await db.delete(trainingGoals).where(and(eq(trainingGoals.userId, userId), eq(trainingGoals.id, req.params.id)));
      return { ok: true };
    } catch (err) {
      app.log.error(err, "Failed to delete goal");
      return reply.code(500).send({ error: "Failed to delete goal" });
    }
  });

  app.post<{ Body: AiDaySuggestion }>("/api/calendar/event", async (req, reply) => {
    try {
      const day = req.body;
      const { INTERVALS_API_KEY, INTERVALS_ATHLETE_ID } = intervalsEnv();
      const client = new IntervalsClient({ apiKey: INTERVALS_API_KEY, athleteId: INTERVALS_ATHLETE_ID });
      await client.createEvent({
        start_date_local: day.date + "T08:00:00",
        category: "WORKOUT",
        name: day.name,
        type: day.type && day.type !== "Rest" ? day.type : undefined,
        moving_time: day.plannedDurationSec ?? undefined,
        icu_training_load: day.plannedLoad > 0 ? day.plannedLoad : undefined,
        description: day.description ?? day.rationale,
      });
      return { ok: true };
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Failed to create event";
      app.log.error(err, "Failed to create calendar event");
      return reply.code(500).send({ error: msg });
    }
  });
}
