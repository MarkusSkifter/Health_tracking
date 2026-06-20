import type { FastifyInstance } from "fastify";
import { ingestWindow } from "../ingest/ingest";
import { fetchUpcomingWorkouts } from "../intervals/upcoming";
import { getActivities, getAnalytics, getHistory, getToday } from "../summary/queries";
import { generateWeekSuggestions } from "../summary/suggestions";

/** Routes that serve the frontend (SPEC §8, §9). */
export async function registerSummaryRoutes(app: FastifyInstance): Promise<void> {
  app.post("/api/ingest", async (_req, reply) => {
    try {
      const result = await ingestWindow(7);
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
}
