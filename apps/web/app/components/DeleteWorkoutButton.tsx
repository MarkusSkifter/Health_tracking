"use client";

import { useState } from "react";

export function DeleteWorkoutButton({
  eventId,
  onDeleted,
}: {
  eventId: number;
  onDeleted?: () => void;
}) {
  const [state, setState] = useState<"idle" | "confirm" | "deleting" | "error">("idle");
  const [err, setErr] = useState<string | null>(null);

  async function doDelete() {
    setState("deleting");
    const res = await fetch(`/api/events/${eventId}`, { method: "DELETE" });
    if (res.ok) {
      onDeleted?.();
    } else {
      const b = await res.json().catch(() => ({})) as { error?: string };
      setErr(b.error ?? "Failed to delete");
      setState("error");
    }
  }

  if (state === "confirm") {
    return (
      <div className="flex items-center gap-1.5">
        <span className="text-[11px] text-slate-500">Remove?</span>
        <button
          onClick={doDelete}
          className="rounded px-2 py-0.5 text-[11px] font-semibold text-rose-600 hover:bg-rose-50"
        >
          Yes
        </button>
        <button
          onClick={() => setState("idle")}
          className="rounded px-2 py-0.5 text-[11px] text-slate-400 hover:bg-slate-100"
        >
          No
        </button>
      </div>
    );
  }

  if (state === "deleting") {
    return <span className="text-[11px] text-slate-400">Removing…</span>;
  }

  if (state === "error") {
    return <span className="text-[11px] text-rose-500">{err}</span>;
  }

  return (
    <button
      onClick={() => setState("confirm")}
      aria-label="Remove workout"
      className="flex h-6 w-6 items-center justify-center rounded text-slate-300 transition-colors hover:bg-rose-50 hover:text-rose-400"
    >
      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <polyline points="3 6 5 6 21 6" />
        <path d="M19 6l-1 14H6L5 6" />
        <path d="M10 11v6M14 11v6" />
        <path d="M9 6V4h6v2" />
      </svg>
    </button>
  );
}
