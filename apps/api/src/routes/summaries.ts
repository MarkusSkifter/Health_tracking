import type { AiDaySuggestion } from "@health/shared";
import type { FastifyInstance } from "fastify";
import { ingestWindow } from "../ingest/ingest";
import { IntervalsClient } from "../intervals/client";
import { fetchUpcomingWorkouts } from "../intervals/upcoming";
import { intervalsEnv } from "../env";
import { getActivities, getAnalytics, getHistory, getToday } from "../summary/queries";
import { generateDailySummary } from "../summary/generate";
import { generateWeekSuggestions } from "../summary/suggestions";

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
    const y = now.getFullYear();
    const mo = String(now.getMonth() + 1).padStart(2, "0");
    const from = req.query.from ?? `${y}-${mo}-01`;
    const to = req.query.to ?? now.toISOString().slice(0, 10);
    return { activities: await getActivities(from, to) };
  });

  app.get<{ Querystring: { from?: string; to?: string } }>("/api/analytics", async (req) => {
    const now = new Date();
    const y = now.getFullYear();
    const mo = String(now.getMonth() + 1).padStart(2, "0");
    const from = req.query.from ?? `${y}-${mo}-01`;
    const to = req.query.to ?? now.toISOString().slice(0, 10);
    const days = await getAnalytics(from, to);
    return { days, from, to };
  });

  app.get("/api/upcoming", async (_req, reply) => {
    try {
      const workouts = await fetchUpcomingWorkouts(7);
      const suggestions = workouts.length === 0 ? await generateWeekSuggestions() : null;
      return { workouts, suggestions };
    } catch (err) {
      app.log.error(err, "Failed to fetch upcoming workouts");
      return reply.code(500).send({ error: "Failed to fetch upcoming workouts" });
    }
  });

  app.get<{ Querystring: { from?: string; to?: string } }>("/api/events", async (req, reply) => {
    try {
      const now = new Date();
      const y = now.getFullYear();
      const mo = String(now.getMonth() + 1).padStart(2, "0");
      const from = req.query.from ?? `${y}-${mo}-01`;
      const to = req.query.to ?? `${y}-${mo}-${new Date(y, now.getMonth() + 1, 0).getDate()}`;
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
        description: day.rationale,
      });
      return { ok: true };
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Failed to create event";
      app.log.error(err, "Failed to create calendar event");
      return reply.code(500).send({ error: msg });
    }
  });
}
