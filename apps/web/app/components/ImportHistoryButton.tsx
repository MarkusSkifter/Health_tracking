"use client";

import { useState } from "react";

export function ImportHistoryButton() {
  const [state, setState] = useState<"idle" | "loading" | "done" | "error">("idle");

  async function handleImport() {
    setState("loading");
    try {
      const res = await fetch("/api/sync", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ days: 365 }),
      });
      if (res.ok) {
        setState("done");
      } else {
        setState("error");
        setTimeout(() => setState("idle"), 4000);
      }
    } catch {
      setState("error");
      setTimeout(() => setState("idle"), 4000);
    }
  }

  if (state === "done") {
    return (
      <p className="text-sm font-medium text-emerald-600">
        Import complete — refresh the analytics page to see your full history.
      </p>
    );
  }

  return (
    <div className="flex flex-col gap-2">
      <button
        onClick={handleImport}
        disabled={state === "loading"}
        className="w-fit rounded-lg bg-neutral-900 px-4 py-2 text-sm font-medium text-white transition-opacity hover:opacity-80 disabled:opacity-40"
      >
        {state === "loading" ? "Importing... (this may take a minute)" : state === "error" ? "Failed — retry" : "Import full history"}
      </button>
      {state === "idle" && (
        <p className="text-xs text-neutral-400">
          Pulls up to 365 days of activities and wellness from intervals.icu.
        </p>
      )}
    </div>
  );
}
