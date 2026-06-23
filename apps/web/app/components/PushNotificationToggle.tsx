"use client";

import { useEffect, useState } from "react";

// Public VAPID key — safe to embed in client code.
const VAPID_PUBLIC_KEY =
  "BC6-5bpCeNK9FYmHisrNldyWzbBYl6D4i4cTQuwNNNQSCzyMCIQ7dMr3fcu5AcqPVTbaP79uEOnF5wZqToMoTEQ";

function urlBase64ToUint8Array(base64: string): Uint8Array {
  const padding = "=".repeat((4 - (base64.length % 4)) % 4);
  const b64 = (base64 + padding).replace(/-/g, "+").replace(/_/g, "/");
  const raw = atob(b64);
  return Uint8Array.from(raw, (c) => c.charCodeAt(0));
}

type Status = "unsupported" | "denied" | "subscribed" | "unsubscribed" | "loading";

const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL ?? "";

export function PushNotificationToggle() {
  const [status, setStatus] = useState<Status>("loading");
  const [working, setWorking] = useState(false);

  useEffect(() => {
    if (!("serviceWorker" in navigator) || !("PushManager" in window)) {
      setStatus("unsupported");
      return;
    }
    if (Notification.permission === "denied") {
      setStatus("denied");
      return;
    }
    navigator.serviceWorker.ready.then(async (reg) => {
      const sub = await reg.pushManager.getSubscription();
      setStatus(sub ? "subscribed" : "unsubscribed");
    });
  }, []);

  async function subscribe() {
    setWorking(true);
    try {
      const reg = await navigator.serviceWorker.ready;
      const permission = await Notification.requestPermission();
      if (permission !== "granted") {
        setStatus("denied");
        return;
      }
      const sub = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY),
      });
      await fetch(`${API_BASE}/api/push/subscribe`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ subscription: sub.toJSON() }),
      });
      setStatus("subscribed");
    } catch {
      // User dismissed or browser blocked
      setStatus(Notification.permission === "denied" ? "denied" : "unsubscribed");
    } finally {
      setWorking(false);
    }
  }

  async function unsubscribe() {
    setWorking(true);
    try {
      const reg = await navigator.serviceWorker.ready;
      const sub = await reg.pushManager.getSubscription();
      if (sub) {
        await fetch(`${API_BASE}/api/push/subscribe`, {
          method: "DELETE",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ endpoint: sub.endpoint }),
        });
        await sub.unsubscribe();
      }
      setStatus("unsubscribed");
    } finally {
      setWorking(false);
    }
  }

  if (status === "loading") return null;

  if (status === "unsupported") {
    return (
      <p className="text-sm" style={{ color: "rgba(255,255,255,0.35)" }}>
        Push notifications are not supported in this browser.
      </p>
    );
  }

  if (status === "denied") {
    return (
      <p className="text-sm" style={{ color: "rgba(255,255,255,0.35)" }}>
        Notifications are blocked. Go to Settings → Safari → Training Insights to allow them.
      </p>
    );
  }

  return (
    <div className="flex items-center justify-between gap-4">
      <div>
        <p className="text-sm font-medium text-white">
          {status === "subscribed" ? "Notifications on" : "Notifications off"}
        </p>
        <p className="mt-0.5 text-xs" style={{ color: "rgba(255,255,255,0.4)" }}>
          {status === "subscribed"
            ? "Daily coaching message arrives around 05:00 Copenhagen time."
            : "Get your daily coaching message as a notification at 05:00."}
        </p>
      </div>
      <button
        onClick={status === "subscribed" ? unsubscribe : subscribe}
        disabled={working}
        className="shrink-0 rounded-xl px-4 py-2 text-sm font-semibold transition-opacity disabled:opacity-40"
        style={
          status === "subscribed"
            ? { background: "rgba(255,255,255,0.08)", color: "rgba(255,255,255,0.6)" }
            : { background: "linear-gradient(135deg, #1D9E75, #2A7FC0)", color: "#fff" }
        }
      >
        {working ? "…" : status === "subscribed" ? "Turn off" : "Turn on"}
      </button>
    </div>
  );
}
