"use client";

import type { TrainingGoal } from "@health/shared";
import { useEffect, useState } from "react";
import { createGoal, deleteGoal, fetchGoals } from "../../lib/api";
import { ledgerInput, ledgerGhostBtn, ledgerPrimaryBtn } from "./ledger/forms";

type GoalWithMeta = TrainingGoal & { isPast: boolean };

const EVENT_TYPES = ["Run", "Ride", "Swim", "Triathlon", "Other"];

function daysUntil(targetDate: string): number {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const target = new Date(`${targetDate}T00:00:00`);
  return Math.round((target.getTime() - today.getTime()) / 86400000);
}

function formatTargetDate(iso: string): string {
  return new Intl.DateTimeFormat("en-GB", { day: "numeric", month: "long", year: "numeric" }).format(new Date(`${iso}T00:00:00`));
}

export function TrainingGoals() {
  const [goals, setGoals] = useState<GoalWithMeta[]>([]);
  const [loading, setLoading] = useState(true);
  const [adding, setAdding] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ eventName: "", eventType: "", targetDate: "", notes: "" });
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchGoals()
      .then((g) => setGoals(g))
      .catch(() => setError("Could not load goals."))
      .finally(() => setLoading(false));
  }, []);

  async function handleAdd() {
    if (!form.eventName.trim() || !form.targetDate) { setError("Event name and date are required."); return; }
    setSaving(true);
    setError(null);
    try {
      const id = await createGoal({
        eventName: form.eventName.trim(),
        eventType: form.eventType || null,
        targetDate: form.targetDate,
        notes: form.notes.trim() || null,
      });
      const newGoal: GoalWithMeta = {
        id,
        eventName: form.eventName.trim(),
        eventType: form.eventType || null,
        targetDate: form.targetDate,
        notes: form.notes.trim() || null,
        isPast: false,
      };
      setGoals((prev) => [...prev, newGoal].sort((a, b) => a.targetDate.localeCompare(b.targetDate)));
      setForm({ eventName: "", eventType: "", targetDate: "", notes: "" });
      setAdding(false);
    } catch {
      setError("Failed to save goal. Please try again.");
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(id: string) {
    await deleteGoal(id).catch(() => null);
    setGoals((prev) => prev.filter((g) => g.id !== id));
  }

  const upcoming = goals.filter((g) => !g.isPast);
  const past = goals.filter((g) => g.isPast);

  return (
    <div className="flex flex-col gap-4">
      {loading ? (
        <p className="lx-sans text-sm" style={{ color: "var(--ink-3)" }}>Loading…</p>
      ) : (
        <>
          {upcoming.length === 0 && !adding && (
            <p className="lx-sans text-sm" style={{ color: "var(--ink-3)" }}>
              No upcoming goals yet. Add one below to focus your training.
            </p>
          )}

          {upcoming.map((g) => {
            const days = daysUntil(g.targetDate);
            const accent = days < 30 ? "var(--signal)" : "var(--ink)";
            return (
              <div key={g.id} className="flex items-start gap-3 lx-leaf px-4 py-3.5">
                <div className="min-w-0 flex-1">
                  <p className="lx-sans text-sm font-semibold" style={{ color: "var(--ink)" }}>{g.eventName}</p>
                  <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-0.5">
                    {g.eventType && <span className="lx-eyebrow" style={{ color: "var(--ink-3)" }}>{g.eventType}</span>}
                    <span className="lx-num text-xs" style={{ color: "var(--ink-2)" }}>{formatTargetDate(g.targetDate)}</span>
                    <span className="lx-num text-xs" style={{ color: accent, fontWeight: 600 }}>
                      {days > 0 ? `${days} days away` : days === 0 ? "Today" : `${Math.abs(days)} days ago`}
                    </span>
                  </div>
                  {g.notes && <p className="lx-sans mt-1 text-xs" style={{ color: "var(--ink-3)" }}>{g.notes}</p>}
                </div>
                <button onClick={() => handleDelete(g.id)} className="lx-eyebrow mt-0.5 shrink-0" style={{ color: "var(--ink-4)" }} aria-label="Delete goal">
                  Remove
                </button>
              </div>
            );
          })}

          {past.length > 0 && (
            <div className="flex flex-col gap-2">
              <p className="lx-eyebrow mt-2" style={{ color: "var(--ink-4)" }}>Past goals</p>
              {past.map((g) => (
                <div key={g.id} className="flex items-center justify-between py-2.5" style={{ borderBottom: "1px solid var(--line)" }}>
                  <div>
                    <p className="lx-sans text-sm" style={{ color: "var(--ink-2)" }}>{g.eventName}</p>
                    <p className="lx-num text-xs" style={{ color: "var(--ink-4)" }}>{formatTargetDate(g.targetDate)}</p>
                  </div>
                  <button onClick={() => handleDelete(g.id)} className="lx-eyebrow" style={{ color: "var(--ink-4)" }} aria-label="Delete goal">Remove</button>
                </div>
              ))}
            </div>
          )}
        </>
      )}

      {adding ? (
        <div className="flex flex-col gap-3 lx-leaf p-4">
          <div className="flex flex-col gap-1.5">
            <label className="lx-eyebrow">Event name *</label>
            <input type="text" placeholder="e.g. Copenhagen Half Marathon" value={form.eventName} onChange={(e) => setForm((f) => ({ ...f, eventName: e.target.value }))} style={ledgerInput} />
          </div>
          <div className="flex gap-3">
            <div className="flex-1">
              <label className="lx-eyebrow mb-1.5 block">Target date *</label>
              <input type="date" value={form.targetDate} onChange={(e) => setForm((f) => ({ ...f, targetDate: e.target.value }))} style={{ ...ledgerInput, colorScheme: "light" }} />
            </div>
            <div className="flex-1">
              <label className="lx-eyebrow mb-1.5 block">Type</label>
              <select value={form.eventType} onChange={(e) => setForm((f) => ({ ...f, eventType: e.target.value }))} style={ledgerInput}>
                <option value="">Any</option>
                {EVENT_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>
          </div>
          <div>
            <label className="lx-eyebrow mb-1.5 block">Notes (optional)</label>
            <input type="text" placeholder="e.g. Goal time sub-2h, flat course" value={form.notes} onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))} style={ledgerInput} />
          </div>
          {error && <p className="lx-mono text-xs" style={{ color: "var(--signal)" }}>{error}</p>}
          <div className="flex gap-2">
            <button onClick={handleAdd} disabled={saving} className="transition-opacity disabled:opacity-50" style={ledgerPrimaryBtn}>
              {saving ? "Saving…" : "Add goal"}
            </button>
            <button onClick={() => { setAdding(false); setError(null); }} style={ledgerGhostBtn}>Cancel</button>
          </div>
        </div>
      ) : (
        <button onClick={() => setAdding(true)} className="self-start transition-opacity hover:opacity-80" style={ledgerGhostBtn}>
          + Add goal
        </button>
      )}
    </div>
  );
}
