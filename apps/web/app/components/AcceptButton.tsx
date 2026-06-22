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
      <span className="text-xs font-semibold" style={{ color: "#5DCAA5" }}>
        Added
      </span>
    );
  }

  return (
    <div className="flex flex-col items-end gap-1">
      <button
        onClick={handleAccept}
        disabled={state === "loading"}
        className="rounded-xl px-3 py-1.5 text-xs font-semibold text-white transition-all duration-150 disabled:opacity-40"
        style={{ background: state === "error" ? "rgba(248,113,113,0.2)" : "linear-gradient(135deg, #1D9E75, #2A7FC0)" }}
      >
        {state === "loading" ? "Adding…" : state === "error" ? "Retry" : "Accept"}
      </button>
      {state === "error" && errMsg && (
        <p className="max-w-[200px] text-right text-[10px] leading-tight" style={{ color: "#F87171" }}>{errMsg}</p>
      )}
    </div>
  );
}
