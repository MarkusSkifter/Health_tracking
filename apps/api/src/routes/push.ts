import type { FastifyInstance } from "fastify";
import { and, eq } from "drizzle-orm";
import webPush from "web-push";
import { db } from "../db/client";
import { pushSubscriptions } from "../db/schema";
import { getOrCreateUserId } from "../ingest/store";
import { vapidEnv } from "../env";

interface PushKeys { p256dh: string; auth: string }
interface Subscription { endpoint: string; keys: PushKeys }

let vapidPublicKey: string | null = null;

function initVapid(): boolean {
  try {
    const { VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY, VAPID_SUBJECT } = vapidEnv();
    const subject = VAPID_SUBJECT.includes("@") && !VAPID_SUBJECT.startsWith("mailto:")
      ? `mailto:${VAPID_SUBJECT}`
      : VAPID_SUBJECT;
    webPush.setVapidDetails(subject, VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY);
    vapidPublicKey = VAPID_PUBLIC_KEY;
    return true;
  } catch {
    return false;
  }
}

export async function registerPushRoutes(app: FastifyInstance): Promise<void> {
  if (!initVapid()) {
    app.log.warn("VAPID env vars missing or invalid — push notification routes disabled");
    return;
  }
  // POST /api/push/subscribe — save a push subscription
  app.post<{ Body: { subscription: Subscription } }>("/api/push/subscribe", async (req, reply) => {
    const { subscription } = req.body ?? {};
    if (!subscription?.endpoint || !subscription.keys?.p256dh || !subscription.keys?.auth) {
      return reply.code(400).send({ error: "Invalid subscription object" });
    }
    const userId = await getOrCreateUserId();
    await db
      .insert(pushSubscriptions)
      .values({
        userId,
        endpoint: subscription.endpoint,
        p256dh: subscription.keys.p256dh,
        auth: subscription.keys.auth,
      })
      .onConflictDoNothing();
    return reply.code(201).send({ ok: true });
  });

  // DELETE /api/push/subscribe — remove a push subscription
  app.delete<{ Body: { endpoint: string } }>("/api/push/subscribe", async (req, reply) => {
    const { endpoint } = req.body ?? {};
    if (!endpoint) return reply.code(400).send({ error: "Missing endpoint" });
    const userId = await getOrCreateUserId();
    await db
      .delete(pushSubscriptions)
      .where(and(eq(pushSubscriptions.userId, userId), eq(pushSubscriptions.endpoint, endpoint)));
    return reply.code(200).send({ ok: true });
  });

  // GET /api/push/vapid-public-key — expose the public key to the client
  app.get("/api/push/vapid-public-key", async () => ({ publicKey: vapidPublicKey }));
}

/** Send a push notification to all subscriptions for the default user. */
export async function sendDailyPush(date: string, text: string): Promise<void> {
  if (!initVapid()) return; // no-op if VAPID not configured
  const userId = await getOrCreateUserId();
  const subs = await db
    .select()
    .from(pushSubscriptions)
    .where(eq(pushSubscriptions.userId, userId));

  if (!subs.length) return;

  const payload = JSON.stringify({
    title: "Training Insights",
    body: text.length > 200 ? text.slice(0, 197) + "…" : text,
    url: "/",
    tag: `daily-${date}`,
  });

  const staleEndpoints: string[] = [];
  await Promise.allSettled(
    subs.map(async (sub) => {
      try {
        await webPush.sendNotification(
          { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } },
          payload,
        );
      } catch (err: unknown) {
        const status = (err as { statusCode?: number }).statusCode;
        if (status === 410 || status === 404) staleEndpoints.push(sub.endpoint);
      }
    }),
  );

  // Remove expired subscriptions
  for (const endpoint of staleEndpoints) {
    await db
      .delete(pushSubscriptions)
      .where(and(eq(pushSubscriptions.userId, userId), eq(pushSubscriptions.endpoint, endpoint)));
  }
}
