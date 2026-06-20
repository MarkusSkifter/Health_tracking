import type { FastifyInstance } from "fastify";
import { getHistory, getToday } from "../summary/queries";

/** Routes that serve the frontend (SPEC §8, §9). */
export async function registerSummaryRoutes(app: FastifyInstance): Promise<void> {
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
}
