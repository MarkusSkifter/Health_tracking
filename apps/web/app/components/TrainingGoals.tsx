"use client";

import type { TrainingGoal } from "@health/shared";
import { useEffect, useState } from "react";
import { createGoal, deleteGoal, fetchGoals } from "../../lib/api";

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
    fetchGoals().then((g) => { setGoals(g); setLoading(false); });
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
        <p className="text-sm" style={{ color: "rgba(255,255,255,0.35)" }}>Loading…</p>
      ) : (
        <>
          {upcoming.length === 0 && !adding && (
            <p className="text-sm" style={{ color: "rgba(255,255,255,0.35)" }}>
              No upcoming goals yet. Add one below to focus your training.
            </p>
          )}

          {upcoming.map((g) => {
            const days = daysUntil(g.targetDate);
            return (
              <div key={g.id} className="flex items-start gap-3 rounded-2xl px-4 py-3.5" style={{ background: "rgba(255,255,255,0.05)", border: "0.5px solid rgba(255,255,255,0.1)" }}>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-semibold text-white">{g.eventName}</p>
                  <div className="mt-0.5 flex flex-wrap gap-x-3 gap-y-0.5 text-xs" style={{ color: "rgba(255,255,255,0.4)" }}>
                    {g.eventType && <span>{g.eventType}</span>}
                    <span>{formatTargetDate(g.targetDate)}</span>
                    <span className="font-semibold" style={{ color: days < 30 ? "#F87171" : days < 90 ? "#FCD34D" : "#5DCAA5" }}>
                      {days > 0 ? `${days} days away` : days === 0 ? "Today!" : `${Math.abs(days)} days ago`}
                    </span>
                  </div>
                  {g.notes && <p className="mt-1 text-xs" style={{ color: "rgba(255,255,255,0.3)" }}>{g.notes}</p>}
                </div>
                <button
                  onClick={() => handleDelete(g.id)}
                  className="mt-0.5 shrink-0 rounded-lg p-1.5 transition-opacity hover:opacity-60"
                  style={{ color: "rgba(255,255,255,0.3)" }}
                  aria-label="Delete goal"
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="3 6 5 6 21 6" /><path d="M19 6l-1 14a2 2 0 01-2 2H8a2 2 0 01-2-2L5 6" /><path d="M10 11v6M14 11v6" /><path d="M9 6V4h6v2" />
                  </svg>
                </button>
              </div>
            );
          })}

          {past.length > 0 && (
            <div className="flex flex-col gap-2">
              <p className="text-xs font-semibold uppercase tracking-widest" style={{ color: "rgba(255,255,255,0.2)" }}>Past goals</p>
              {past.map((g) => (
                <div key={g.id} className="flex items-center justify-between rounded-xl px-4 py-3" style={{ background: "rgba(255,255,255,0.03)", border: "0.5px solid rgba(255,255,255,0.07)" }}>
                  <div>
                    <p className="text-sm" style={{ color: "rgba(255,255,255,0.4)" }}>{g.eventName}</p>
                    <p className="text-xs" style={{ color: "rgba(255,255,255,0.2)" }}>{formatTargetDate(g.targetDate)}</p>
                  </div>
                  <button onClick={() => handleDelete(g.id)} className="rounded-lg p-1.5 hover:opacity-60" style={{ color: "rgba(255,255,255,0.2)" }} aria-label="Delete goal">
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
                    </svg>
                  </button>
                </div>
              ))}
            </div>
          )}
        </>
      )}

      {adding ? (
        <div className="flex flex-col gap-3 rounded-2xl p-4" style={{ background: "rgba(255,255,255,0.05)", border: "0.5px solid rgba(255,255,255,0.12)" }}>
          <div className="flex flex-col gap-1">
            <label className="text-xs font-medium" style={{ color: "rgba(255,255,255,0.5)" }}>Event name *</label>
            <input
              type="text"
              placeholder="e.g. Copenhagen Half Marathon"
              value={form.eventName}
              onChange={(e) => setForm((f) => ({ ...f, eventName: e.target.value }))}
              className="rounded-xl border px-3 py-2 text-sm text-white placeholder:text-[rgba(255,255,255,0.2)] focus:outline-none"
              style={{ background: "rgba(255,255,255,0.05)", border: "0.5px solid rgba(255,255,255,0.12)" }}
            />
          </div>
          <div className="flex gap-3">
            <div className="flex-1">
              <label className="mb-1 block text-xs font-medium" style={{ color: "rgba(255,255,255,0.5)" }}>Target date *</label>
              <input
                type="date"
                value={form.targetDate}
                onChange={(e) => setForm((f) => ({ ...f, targetDate: e.target.value }))}
                className="w-full rounded-xl border px-3 py-2 text-sm text-white focus:outline-none"
                style={{ background: "rgba(255,255,255,0.05)", border: "0.5px solid rgba(255,255,255,0.12)", colorScheme: "dark" }}
              />
            </div>
            <div className="flex-1">
              <label className="mb-1 block text-xs font-medium" style={{ color: "rgba(255,255,255,0.5)" }}>Type</label>
              <select
                value={form.eventType}
                onChange={(e) => setForm((f) => ({ ...f, eventType: e.target.value }))}
                className="w-full rounded-xl border px-3 py-2 text-sm text-white focus:outline-none"
                style={{ background: "rgba(30,30,40,0.95)", border: "0.5px solid rgba(255,255,255,0.12)" }}
              >
                <option value="">Any</option>
                {EVENT_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium" style={{ color: "rgba(255,255,255,0.5)" }}>Notes (optional)</label>
            <input
              type="text"
              placeholder="e.g. Goal time sub-2h, flat course"
              value={form.notes}
              onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))}
              className="w-full rounded-xl border px-3 py-2 text-sm text-white placeholder:text-[rgba(255,255,255,0.2)] focus:outline-none"
              style={{ background: "rgba(255,255,255,0.05)", border: "0.5px solid rgba(255,255,255,0.12)" }}
            />
          </div>
          {error && <p className="text-xs" style={{ color: "#F87171" }}>{error}</p>}
          <div className="flex gap-2">
            <button
              onClick={handleAdd}
              disabled={saving}
              className="rounded-xl px-4 py-2 text-sm font-semibold disabled:opacity-50"
              style={{ background: "rgba(93,202,165,0.15)", color: "#5DCAA5" }}
            >
              {saving ? "Saving…" : "Add goal"}
            </button>
            <button
              onClick={() => { setAdding(false); setError(null); }}
              className="rounded-xl px-4 py-2 text-sm"
              style={{ color: "rgba(255,255,255,0.4)" }}
            >
              Cancel
            </button>
          </div>
        </div>
      ) : (
        <button
          onClick={() => setAdding(true)}
          className="flex items-center gap-2 self-start rounded-xl px-4 py-2 text-sm font-semibold transition-opacity hover:opacity-80"
          style={{ background: "rgba(255,255,255,0.08)", color: "rgba(255,255,255,0.7)" }}
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" />
          </svg>
          Add goal
        </button>
      )}
    </div>
  );
}
