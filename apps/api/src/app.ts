import cors from "@fastify/cors";
import Fastify, { type FastifyInstance } from "fastify";
import { registerSummaryRoutes } from "./routes/summaries";

/**
 * Build the Fastify app (routes + plugins) without binding a port.
 * Separated from the server entry point so it can be exercised in tests
 * via `app.inject(...)`.
 */
export async function buildApp(): Promise<FastifyInstance> {
  const app = Fastify({ logger: true });

  await app.register(cors, { origin: true });

  app.get("/", async () => ({ status: "ok", service: "@health/api" }));

  app.get("/health", async () => ({
    status: "ok",
    service: "@health/api",
  }));

  await registerSummaryRoutes(app);

  return app;
}
