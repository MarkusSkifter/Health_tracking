"use client";

import { useState } from "react";
import { ledgerPrimaryBtn } from "./ledger/forms";

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
      <p className="lx-sans text-sm font-medium" style={{ color: "var(--signal-ink)" }}>
        Import complete — open Analytics to see your full history.
      </p>
    );
  }

  return (
    <button
      onClick={handleImport}
      disabled={state === "loading"}
      className="w-fit transition-opacity disabled:opacity-50"
      style={state === "error" ? { ...ledgerPrimaryBtn, background: "var(--signal-ink)" } : ledgerPrimaryBtn}
    >
      {state === "loading" ? "Importing… (this may take a minute)" : state === "error" ? "Failed — retry" : "Import full history"}
    </button>
  );
}
