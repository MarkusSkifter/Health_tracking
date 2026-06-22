"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export function DeleteWorkoutButton({
  eventId,
  onSuccess,
}: {
  eventId: number;
  onSuccess?: () => void;
}) {
  const router = useRouter();
  const [state, setState] = useState<"idle" | "confirm" | "deleting" | "error">("idle");
  const [err, setErr] = useState<string | null>(null);

  async function doDelete() {
    setState("deleting");
    const res = await fetch(`/api/events/${eventId}`, { method: "DELETE" });
    if (res.ok) {
      onSuccess?.();
      router.refresh();
    } else {
      const b = await res.json().catch(() => ({})) as { error?: string };
      setErr(b.error ?? "Failed to delete");
      setState("error");
    }
  }

  if (state === "confirm") {
    return (
      <div className="flex items-center gap-1.5">
        <span className="text-[11px]" style={{ color: "rgba(255,255,255,0.4)" }}>Remove?</span>
        <button
          onClick={doDelete}
          className="rounded px-2 py-0.5 text-[11px] font-semibold transition-colors"
          style={{ color: "#F87171" }}
          onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.background = "rgba(248,113,113,0.12)"; }}
          onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = "transparent"; }}
        >
          Yes
        </button>
        <button
          onClick={() => setState("idle")}
          className="rounded px-2 py-0.5 text-[11px] transition-colors"
          style={{ color: "rgba(255,255,255,0.35)" }}
          onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.background = "rgba(255,255,255,0.06)"; }}
          onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = "transparent"; }}
        >
          No
        </button>
      </div>
    );
  }

  if (state === "deleting") {
    return <span className="text-[11px]" style={{ color: "rgba(255,255,255,0.35)" }}>Removing…</span>;
  }

  if (state === "error") {
    return <span className="text-[11px]" style={{ color: "#F87171" }}>{err}</span>;
  }

  return (
    <button
      onClick={() => setState("confirm")}
      aria-label="Remove workout"
      className="flex h-6 w-6 items-center justify-center rounded transition-colors"
      style={{ color: "rgba(255,255,255,0.2)" }}
      onMouseEnter={(e) => {
        (e.currentTarget as HTMLElement).style.background = "rgba(248,113,113,0.12)";
        (e.currentTarget as HTMLElement).style.color = "#F87171";
      }}
      onMouseLeave={(e) => {
        (e.currentTarget as HTMLElement).style.background = "transparent";
        (e.currentTarget as HTMLElement).style.color = "rgba(255,255,255,0.2)";
      }}
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
