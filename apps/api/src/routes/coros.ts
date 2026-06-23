import type { FastifyInstance } from "fastify";
import { eq } from "drizzle-orm";
import { db } from "../db/client";
import { corosWorkouts } from "../db/schema";
import { corosEnv } from "../env";
import { getOrCreateUserId } from "../ingest/store";

interface CorosWorkoutPayload {
  userId?: string;
  sportType?: number;
  workoutId: string;
  startTime?: number;
  endTime?: number;
  totalTime?: number;
  distance?: number;
  calories?: number;
  avgHr?: number;
  maxHr?: number;
  avgPower?: number;
  maxPower?: number;
  [key: string]: unknown;
}

interface CороsWebhookBody {
  userId?: string;
  dataList?: CorosWorkoutPayload[];
}

export async function registerCorosRoutes(app: FastifyInstance): Promise<void> {
  let clientId: string;
  let clientSecret: string;
  try {
    const env = corosEnv();
    clientId = env.COROS_CLIENT_ID;
    clientSecret = env.COROS_CLIENT_SECRET;
  } catch {
    app.log.warn("COROS_CLIENT_ID / COROS_CLIENT_SECRET missing — COROS webhook route disabled");
    return;
  }

  app.post<{ Body: CороsWebhookBody }>("/api/coros/webhook", async (req, reply) => {
    const incomingClient = req.headers["client"];
    const incomingSecret = req.headers["secret"];

    if (incomingClient !== clientId || incomingSecret !== clientSecret) {
      app.log.warn("COROS webhook: invalid credentials");
      return reply.code(401).send({ result: "0001", message: "unauthorized" });
    }

    const workouts = req.body?.dataList ?? [];
    if (workouts.length === 0) {
      return reply.code(200).send({ result: "0000", message: "ok" });
    }

    const userId = await getOrCreateUserId();

    for (const w of workouts) {
      if (!w.workoutId) continue;
      await db
        .insert(corosWorkouts)
        .values({
          userId,
          workoutId: w.workoutId,
          sportType: w.sportType ?? null,
          startTime: w.startTime ?? null,
          endTime: w.endTime ?? null,
          totalTime: w.totalTime ?? null,
          distance: w.distance ?? null,
          calories: w.calories ?? null,
          avgHr: w.avgHr ?? null,
          maxHr: w.maxHr ?? null,
          avgPower: w.avgPower ?? null,
          maxPower: w.maxPower ?? null,
          rawJson: w as Record<string, unknown>,
        })
        .onConflictDoNothing();
    }

    app.log.info(`COROS webhook: stored ${workouts.length} workout(s)`);
    return reply.code(200).send({ result: "0000", message: "ok" });
  });

  app.get("/api/coros/workouts", async () => {
    const userId = await getOrCreateUserId();
    const rows = await db
      .select()
      .from(corosWorkouts)
      .where(eq(corosWorkouts.userId, userId))
      .orderBy(corosWorkouts.startTime);
    return { workouts: rows };
  });
}
