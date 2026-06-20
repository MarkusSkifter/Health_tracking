"use client";

import { useState } from "react";

export function SyncButton() {
  const [state, setState] = useState<"idle" | "syncing" | "done" | "error">("idle");
  const [errorMsg, setErrorMsg] = useState("");

  async function handleSync() {
    setState("syncing");
    setErrorMsg("");
    try {
      const res = await fetch("/api/sync", { method: "POST" });
      if (res.ok) {
        setState("done");
        // Reload to show freshly ingested data
        setTimeout(() => window.location.reload(), 800);
      } else {
        const body = await res.json().catch(() => ({}));
        setErrorMsg((body as { error?: string }).error ?? `HTTP ${res.status}`);
        setState("error");
        setTimeout(() => setState("idle"), 6000);
      }
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : "Network error");
      setState("error");
      setTimeout(() => setState("idle"), 6000);
    }
  }

  return (
    <div className="flex flex-col items-end gap-1">
      <button
        onClick={handleSync}
        disabled={state === "syncing" || state === "done"}
        className={`rounded-lg px-3 py-1.5 text-xs font-medium transition-colors ${
          state === "done"
            ? "bg-emerald-50 text-emerald-700"
            : state === "error"
              ? "bg-rose-50 text-rose-700"
              : "bg-neutral-100 text-neutral-600 hover:bg-neutral-200"
        } disabled:opacity-50`}
      >
        {state === "idle" && "Sync now"}
        {state === "syncing" && "Syncing…"}
        {state === "done" && "Synced ✓"}
        {state === "error" && "Retry sync"}
      </button>
      {state === "error" && errorMsg && (
        <p className="text-xs text-rose-500">{errorMsg}</p>
      )}
    </div>
  );
}
