"use client";

import type { AiDaySuggestion } from "@health/shared";
import { useState } from "react";

export function AcceptButton({ day }: { day: AiDaySuggestion }) {
  const [state, setState] = useState<"idle" | "loading" | "done" | "error">("idle");
  const [errMsg, setErrMsg] = useState("");

  async function handleAccept() {
    setState("loading");
    setErrMsg("");
    try {
      const res = await fetch("/api/calendar/event", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(day),
      });
      if (res.ok) {
        setState("done");
      } else {
        const body = await res.json().catch(() => ({})) as { error?: string };
        setErrMsg(body.error ?? `Error ${res.status}`);
        setState("error");
        setTimeout(() => setState("idle"), 5000);
      }
    } catch (err) {
      setErrMsg(err instanceof Error ? err.message : "Network error");
      setState("error");
      setTimeout(() => setState("idle"), 5000);
    }
  }

  if (state === "done") {
    return (
      <span className="text-xs font-semibold text-emerald-600">
        Added
      </span>
    );
  }

  return (
    <div className="flex flex-col items-end gap-1">
      <button
        onClick={handleAccept}
        disabled={state === "loading"}
        className="rounded-xl bg-blue-600 px-3 py-1.5 text-xs font-semibold text-white transition-all duration-150 hover:bg-blue-700 disabled:opacity-40"
      >
        {state === "loading" ? "Adding…" : state === "error" ? "Retry" : "Accept"}
      </button>
      {state === "error" && errMsg && (
        <p className="max-w-[200px] text-right text-[10px] leading-tight text-rose-500">{errMsg}</p>
      )}
    </div>
  );
}
