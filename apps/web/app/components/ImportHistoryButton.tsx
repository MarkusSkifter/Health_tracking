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
      setState(res.ok ? "done" : "error");
      if (!res.ok) setTimeout(() => setState("idle"), 4000);
    } catch {
      setState("error");
      setTimeout(() => setState("idle"), 4000);
    }
  }

  if (state === "done") {
    return (
      <p className="text-sm font-medium text-emerald-600">
        Import complete — refresh Analytics to see your full history.
      </p>
    );
  }

  return (
    <div className="flex flex-col gap-2">
      <button
        onClick={handleImport}
        disabled={state === "loading"}
        className="w-fit rounded-xl bg-blue-600 px-4 py-2 text-sm font-semibold text-white transition-all duration-150 hover:bg-blue-700 disabled:opacity-50"
      >
        {state === "loading"
          ? "Importing… (this may take a minute)"
          : state === "error"
            ? "Failed — retry"
            : "Import full history"}
      </button>
    </div>
  );
}
