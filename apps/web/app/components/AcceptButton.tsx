"use client";

import type { AiDaySuggestion } from "@health/shared";
import { useState } from "react";

export function AcceptButton({ day }: { day: AiDaySuggestion }) {
  const [state, setState] = useState<"idle" | "loading" | "done" | "error">("idle");

  async function handleAccept() {
    setState("loading");
    try {
      const res = await fetch("/api/calendar/event", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(day),
      });
      setState(res.ok ? "done" : "error");
      if (!res.ok) setTimeout(() => setState("idle"), 3000);
    } catch {
      setState("error");
      setTimeout(() => setState("idle"), 3000);
    }
  }

  if (state === "done") {
    return (
      <span className="text-xs font-medium text-emerald-600">
        Added to calendar
      </span>
    );
  }

  return (
    <button
      onClick={handleAccept}
      disabled={state === "loading"}
      className="rounded-lg bg-neutral-900 px-2.5 py-1 text-xs font-medium text-white transition-opacity hover:opacity-80 disabled:opacity-40"
    >
      {state === "loading" ? "Adding..." : state === "error" ? "Failed — retry" : "Accept workout"}
    </button>
  );
}
