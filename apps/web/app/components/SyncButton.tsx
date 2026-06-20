"use client";

import { useState } from "react";

export function SyncButton() {
  const [state, setState] = useState<"idle" | "syncing" | "done" | "error">("idle");

  async function handleSync() {
    setState("syncing");
    try {
      const res = await fetch("/api/sync", { method: "POST" });
      if (res.ok) {
        setState("done");
        setTimeout(() => setState("idle"), 4000);
      } else {
        setState("error");
        setTimeout(() => setState("idle"), 4000);
      }
    } catch {
      setState("error");
      setTimeout(() => setState("idle"), 4000);
    }
  }

  const labels = {
    idle: "Sync now",
    syncing: "Syncing…",
    done: "Synced",
    error: "Failed — retry?",
  };

  return (
    <button
      onClick={handleSync}
      disabled={state === "syncing"}
      className={`rounded-lg px-3 py-1.5 text-xs font-medium transition-colors ${
        state === "done"
          ? "bg-emerald-50 text-emerald-700"
          : state === "error"
            ? "bg-rose-50 text-rose-700"
            : "bg-neutral-100 text-neutral-600 hover:bg-neutral-200"
      } disabled:opacity-50`}
    >
      {labels[state]}
    </button>
  );
}
