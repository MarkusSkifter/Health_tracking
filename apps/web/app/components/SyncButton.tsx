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

  const styles: Record<string, { background: string; color: string }> = {
    idle: { background: "rgba(255,255,255,0.08)", color: "rgba(255,255,255,0.6)" },
    syncing: { background: "rgba(255,255,255,0.08)", color: "rgba(255,255,255,0.4)" },
    done: { background: "rgba(29,158,117,0.15)", color: "#5DCAA5" },
    error: { background: "rgba(248,113,113,0.15)", color: "#F87171" },
  };

  return (
    <div className="flex flex-col items-end gap-1">
      <button
        onClick={handleSync}
        disabled={state === "syncing" || state === "done"}
        className="rounded-xl px-3.5 py-1.5 text-xs font-semibold transition-all duration-150 disabled:opacity-50"
        style={styles[state]}
      >
        {state === "idle" && "Sync now"}
        {state === "syncing" && "Syncing…"}
        {state === "done" && "Synced"}
        {state === "error" && "Retry"}
      </button>
      {state === "error" && errorMsg && (
        <p className="text-xs" style={{ color: "#F87171" }}>{errorMsg}</p>
      )}
    </div>
  );
}
