"use client";

import { useEffect, useState } from "react";
import { ledgerInput, ledgerPrimaryBtn } from "./ledger/forms";

function secToPace(sec: number | null): string {
  if (!sec) return "";
  return `${Math.floor(sec / 60)}:${String(sec % 60).padStart(2, "0")}`;
}

function paceToSec(pace: string): number | null {
  const m = pace.match(/^(\d{1,3}):(\d{2})$/);
  if (!m) return null;
  return parseInt(m[1]!) * 60 + parseInt(m[2]!);
}

const inputStyle: React.CSSProperties = { ...ledgerInput, width: 160 };

export function TrainingSettings() {
  const [ftp, setFtp] = useState("");
  const [pace, setPace] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/settings")
      .then((r) => r.json())
      .then((d: { ftpWatts: number | null; runThresholdSec: number | null }) => {
        setFtp(d.ftpWatts ? String(d.ftpWatts) : "");
        setPace(secToPace(d.runThresholdSec));
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    setSaved(false);
    const ftpWatts = ftp ? parseInt(ftp) : null;
    const runThresholdSec = paceToSec(pace);
    if (pace && runThresholdSec === null) {
      setError("Pace must be MM:SS (e.g. 4:30)");
      setSaving(false);
      return;
    }
    try {
      const res = await fetch("/api/settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ftpWatts, runThresholdSec }),
      });
      if (res.ok) {
        setSaved(true);
        setTimeout(() => setSaved(false), 2500);
      } else {
        const b = await res.json().catch(() => ({})) as { error?: string };
        setError(`[${res.status}] ${b.error ?? "Unknown error"}`);
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Network error");
    }
    setSaving(false);
  }

  if (loading) {
    return <p className="lx-sans text-sm" style={{ color: "var(--ink-3)" }}>Loading…</p>;
  }

  return (
    <form onSubmit={save} className="flex flex-col gap-5">
      <div className="flex flex-col gap-2">
        <label className="lx-eyebrow">Cycling FTP (watts)</label>
        <input type="number" min={50} max={600} value={ftp} onChange={(e) => setFtp(e.target.value)} placeholder="e.g. 280" style={inputStyle} />
        <p className="lx-sans text-xs" style={{ color: "var(--ink-3)" }}>
          Used to calculate zone targets for ride suggestions (Z1 = 50–60%, Z4 = 91–105%…).
        </p>
      </div>

      <div className="flex flex-col gap-2">
        <label className="lx-eyebrow">Run threshold pace (MM:SS per km)</label>
        <input type="text" value={pace} onChange={(e) => setPace(e.target.value)} placeholder="e.g. 4:30" style={inputStyle} />
        <p className="lx-sans text-xs" style={{ color: "var(--ink-3)" }}>
          Your lactate threshold pace. Used to calibrate run interval targets.
        </p>
      </div>

      {error && <p className="lx-mono text-xs" style={{ color: "var(--signal)" }}>{error}</p>}

      <div className="flex items-center gap-3">
        <button type="submit" disabled={saving} className="transition-opacity disabled:opacity-50" style={ledgerPrimaryBtn}>
          {saving ? "Saving…" : "Save"}
        </button>
        {saved && <span className="lx-eyebrow" style={{ color: "var(--signal-ink)" }}>Saved</span>}
      </div>
    </form>
  );
}
