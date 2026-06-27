import type { FastifyInstance } from "fastify";
import { intervalsEnv } from "../env";
import { IntervalsClient } from "../intervals/client";
import { normalizeStreams } from "../intervals/streams";

/**
 * Activity stream proxy (SPEC §4). Fetches time-series streams live from
 * intervals.icu on demand, downsamples server-side, and returns a compact
 * payload. Nothing is persisted — streams are large and re-fetchable.
 */
export async function registerStreamRoutes(app: FastifyInstance): Promise<void> {
  app.get<{ Params: { id: string } }>("/api/activities/:id/streams", async (req, reply) => {
    const { id } = req.params;
    if (!id) return reply.code(400).send({ error: "Missing activity id" });
    try {
      const { INTERVALS_API_KEY, INTERVALS_ATHLETE_ID } = intervalsEnv();
      const client = new IntervalsClient({ apiKey: INTERVALS_API_KEY, athleteId: INTERVALS_ATHLETE_ID });
      const raw = await client.getStreams(id, [
        "time",
        "watts",
        "heartrate",
        "cadence",
        "altitude",
        "velocity_smooth",
      ]);
      // Cache briefly — streams for a completed activity never change.
      reply.header("Cache-Control", "private, max-age=3600");
      return normalizeStreams(id, raw);
    } catch (err) {
      app.log.error(err, "Failed to fetch activity streams");
      return reply.code(502).send({ error: "Failed to fetch activity streams" });
    }
  });
}
