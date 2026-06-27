"use client";

import type { Activity, PlannedWorkout } from "@health/shared";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { classifySession, fmtDuration, intensity, type IntensityKey } from "./ledger/shared";
import { LOAD_PER_MIN, parseWorkout } from "./WorkoutBars";

function shortType(type: string | null): string {
  if (!type) return "Workout";
  if (type === "VirtualRide") return "Ride";
  if (type === "VirtualRun") return "Run";
  if (type === "WeightTraining") return "Weights";
  return type;
}

function activityIntensity(a: Activity): IntensityKey {
  return classifySession({ name: a.type, type: a.type, load: a.trainingLoad, durationSec: a.durationSec });
}
function plannedIntensity(w: PlannedWorkout): IntensityKey {
  return classifySession({ name: w.name, type: w.type, load: w.plannedLoad, durationSec: w.plannedDurationSec });
}

// Collapse virtual variants so "VirtualRide" matches a planned "Ride", etc.
function canonicalType(type: string | null | undefined): string | null {
  if (!type) return null;
  if (type === "VirtualRun") return "Run";
  if (type === "VirtualRide") return "Ride";
  return type;
}

function fmtDist(meters: number | null): string {
  if (meters == null) return "";
  return `${(meters / 1000).toFixed(1)} km`;
}

interface DayDetail {
  date: string;
  activities: Activity[];
  planned: PlannedWorkout[];
}

const WORKOUT_TYPES = ["Run", "Ride", "Swim", "Walk", "WeightTraining", "Workout"] as const;

const inputStyle: React.CSSProperties = {
  background: "var(--paper-3)",
  border: "1px solid var(--line-2)",
  borderRadius: "var(--radius)",
  padding: "9px 12px",
  fontSize: 14,
  color: "var(--ink)",
  width: "100%",
  outline: "none",
  fontFamily: "var(--font-body)",
};

function AddWorkoutForm({ date, onCancel, onSaved }: { date: string; onCancel: () => void; onSaved: () => void }) {
  const [name, setName] = useState("");
  const [type, setType] = useState("Run");
  const [description, setDescription] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const blocks = description.trim() ? parseWorkout(description) : [];
  const totalMin = blocks.length ? Math.round(blocks.reduce((s, b) => s + b.minutes, 0)) : null;
  const estimatedLoad = blocks.length ? Math.round(blocks.reduce((s, b) => s + b.minutes * LOAD_PER_MIN[b.zone], 0)) : null;

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) return;
    setSaving(true);
    setError("");
    try {
      const res = await fetch("/api/events", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          date,
          name: name.trim(),
          type: type || undefined,
          durationMin: totalMin ?? undefined,
          load: estimatedLoad ?? undefined,
          description: description.trim() || undefined,
        }),
      });
      if (!res.ok) {
        const body = (await res.json().catch(() => ({}))) as { error?: string };
        throw new Error(body.error ?? `Error ${res.status}`);
      }
      onSaved();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save. Please try again.");
      setSaving(false);
    }
  }

  return (
    <form onSubmit={submit} className="flex flex-col gap-3">
      <div className="flex gap-2">
        <input style={{ ...inputStyle, flex: 1 }} placeholder="Session name" value={name} onChange={(e) => setName(e.target.value)} required autoFocus />
        <select style={{ ...inputStyle, width: "auto", flexShrink: 0 }} value={type} onChange={(e) => setType(e.target.value)}>
          {WORKOUT_TYPES.map((t) => (
            <option key={t} value={t}>{t === "WeightTraining" ? "Weights" : t}</option>
          ))}
        </select>
      </div>

      <textarea
        style={{ ...inputStyle, minHeight: 92, resize: "vertical", fontFamily: "var(--type-mono)", fontSize: 12, lineHeight: 1.6 }}
        placeholder={"e.g. 15min Z1\n3x(8min @ threshold, 3min easy)\n10min cooldown"}
        value={description}
        onChange={(e) => setDescription(e.target.value)}
      />

      {blocks.length > 0 && (
        <div className="flex gap-4 px-1">
          <span className="lx-num text-[12px]" style={{ color: "var(--ink-2)" }}>{totalMin} min</span>
          <span className="lx-num text-[12px]" style={{ color: "var(--ink-3)" }}>~{estimatedLoad} load</span>
        </div>
      )}

      {error && <p className="lx-mono text-xs" style={{ color: "var(--signal)" }}>{error}</p>}

      <div className="flex gap-2">
        <button
          type="submit"
          disabled={saving || !name.trim()}
          className="lx-eyebrow flex-1 py-2.5 transition-opacity disabled:opacity-40"
          style={{ background: "var(--signal)", color: "var(--paper)", borderRadius: "var(--radius)" }}
        >
          {saving ? "Saving…" : "Add to calendar"}
        </button>
        <button
          type="button"
          onClick={onCancel}
          className="lx-eyebrow px-4 py-2.5"
          style={{ border: "1px solid var(--line-2)", color: "var(--ink-2)", borderRadius: "var(--radius)" }}
        >
          Cancel
        </button>
      </div>
    </form>
  );
}

function DetailPanel({ detail, onClose }: { detail: DayDetail; onClose: () => void }) {
  const router = useRouter();
  const [adding, setAdding] = useState(false);
  const [saved, setSaved] = useState(false);
  const [deleting, setDeleting] = useState<number | null>(null);

  const label = new Intl.DateTimeFormat("en-GB", { weekday: "long", day: "numeric", month: "long" }).format(new Date(`${detail.date}T00:00:00`));

  function handleSaved() {
    setSaved(true);
    setTimeout(() => window.location.reload(), 900);
  }

  async function remove(id: number) {
    setDeleting(id);
    try {
      const res = await fetch(`/api/events/${id}`, { method: "DELETE" });
      if (res.ok) {
        onClose();
        router.refresh();
      } else {
        setDeleting(null);
      }
    } catch {
      setDeleting(null);
    }
  }

  return (
    <div className="fixed inset-0 z-40 flex items-end justify-center md:items-center" onClick={onClose}>
      <div className="absolute inset-0" style={{ background: "rgba(26,24,22,0.35)", backdropFilter: "blur(2px)", WebkitBackdropFilter: "blur(2px)" }} />
      <div
        className="relative z-50 w-full max-w-md p-6 md:p-7"
        style={{ background: "var(--paper-2)", border: "1px solid var(--line-2)", borderRadius: "var(--radius-lg)", boxShadow: "0 24px 70px rgba(26,24,22,0.18)" }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-5 flex items-center justify-between">
          <h3 className="lx-serif" style={{ fontSize: 26, fontWeight: 600, color: "var(--ink)" }}>{label}</h3>
          <button onClick={onClose} className="lx-eyebrow" style={{ color: "var(--ink-3)" }} aria-label="Close">Close</button>
        </div>

        {saved ? (
          <p className="lx-sans text-sm" style={{ color: "var(--signal-ink)" }}>Session added to the calendar.</p>
        ) : adding ? (
          <AddWorkoutForm date={detail.date} onCancel={() => setAdding(false)} onSaved={handleSaved} />
        ) : (
          <>
            {detail.activities.length === 0 && detail.planned.length === 0 && (
              <p className="lx-sans mb-5 text-sm" style={{ color: "var(--ink-3)" }}>No sessions recorded or planned.</p>
            )}

            {detail.activities.length > 0 && (
              <div className="mb-6">
                <p className="lx-eyebrow mb-3">Completed</p>
                <div className="flex flex-col gap-3">
                  {detail.activities.map((a) => {
                    const meta = intensity(activityIntensity(a));
                    return (
                      <div key={a.intervalsActivityId} className="flex items-baseline gap-2.5" style={{ borderBottom: "1px solid var(--line)", paddingBottom: 10 }}>
                        <span style={{ width: 8, height: 8, borderRadius: "50%", background: `var(${meta.varName})`, flex: "none", transform: "translateY(1px)" }} />
                        <span className="lx-sans text-sm font-medium" style={{ color: "var(--ink)" }}>{shortType(a.type)}</span>
                        <span className="lx-num text-xs" style={{ color: "var(--ink-2)" }}>{fmtDuration(a.durationSec)}</span>
                        {a.distanceM != null && <span className="lx-num text-xs" style={{ color: "var(--ink-3)" }}>{fmtDist(a.distanceM)}</span>}
                        {a.avgPower != null && <span className="lx-num text-xs" style={{ color: "var(--ink-3)" }}>{a.avgPower}W</span>}
                        {a.trainingLoad != null && <span className="lx-num ml-auto text-xs" style={{ color: "var(--ink-2)" }}>load {Math.round(a.trainingLoad)}</span>}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {detail.planned.length > 0 && (
              <div className="mb-6">
                <p className="lx-eyebrow mb-3">Planned</p>
                <div className="flex flex-col gap-3">
                  {detail.planned.map((w) => {
                    const meta = intensity(plannedIntensity(w));
                    return (
                      <div key={`${w.date}-${w.name}`} style={{ borderBottom: "1px solid var(--line)", paddingBottom: 10 }}>
                        <div className="flex items-baseline gap-2.5">
                          <span style={{ width: 8, height: 8, borderRadius: "50%", border: `1.5px solid var(${meta.varName})`, flex: "none", transform: "translateY(1px)" }} />
                          <span className="lx-sans text-sm font-medium" style={{ color: "var(--ink)" }}>{w.name}</span>
                          {w.plannedDurationSec != null && <span className="lx-num text-xs" style={{ color: "var(--ink-3)" }}>{fmtDuration(w.plannedDurationSec)}</span>}
                          {w.id != null && w.planId == null && (
                            <button onClick={() => remove(w.id!)} disabled={deleting === w.id} className="lx-eyebrow ml-auto disabled:opacity-40" style={{ color: "var(--ink-4)" }}>
                              {deleting === w.id ? "…" : "Remove"}
                            </button>
                          )}
                        </div>
                        {w.description && <p className="lx-mono mt-1.5 pl-[18px] text-[11px] leading-relaxed" style={{ color: "var(--ink-3)" }}>{w.description}</p>}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            <button
              onClick={() => setAdding(true)}
              className="lx-eyebrow w-full py-2.5 transition-colors"
              style={{ border: "1px dashed var(--line-2)", color: "var(--ink-2)", borderRadius: "var(--radius)" }}
            >
              + Add session
            </button>
          </>
        )}
      </div>
    </div>
  );
}

const WEEKDAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

export function CalendarGrid({
  year,
  month,
  activities,
  planned,
}: {
  year: number;
  month: number;
  activities: Activity[];
  planned: PlannedWorkout[];
}) {
  const [selected, setSelected] = useState<string | null>(null);
  const today = new Date().toISOString().slice(0, 10);

  const byDate = new Map<string, { activities: Activity[]; planned: PlannedWorkout[] }>();
  for (const a of activities) {
    const e = byDate.get(a.date) ?? { activities: [], planned: [] };
    e.activities.push(a);
    byDate.set(a.date, e);
  }
  for (const w of planned) {
    const e = byDate.get(w.date) ?? { activities: [], planned: [] };
    // If there's already a completed activity of the same sport type, the plan is
    // fulfilled — hide it so the completed workout takes its place.
    const fulfilled = e.activities.some(
      (a) => canonicalType(a.type) === canonicalType(w.type),
    );
    if (!fulfilled) e.planned.push(w);
    byDate.set(w.date, e);
  }

  const firstDay = new Date(year, month - 1, 1);
  const dayOfWeek = (firstDay.getDay() + 6) % 7;
  const daysInMonth = new Date(year, month, 0).getDate();
  const cells: (number | null)[] = [
    ...Array(dayOfWeek).fill(null),
    ...Array.from({ length: daysInMonth }, (_, i) => i + 1),
  ];
  while (cells.length % 7 !== 0) cells.push(null);

  const selectedDetail = selected ? { date: selected, ...(byDate.get(selected) ?? { activities: [], planned: [] }) } : null;

  return (
    <>
      <div className="overflow-hidden lx-leaf">
        {/* Weekday headers */}
        <div className="grid grid-cols-7" style={{ borderBottom: "1px solid var(--line-2)" }}>
          {WEEKDAYS.map((d, i) => (
            <div key={d} className="lx-eyebrow py-2.5 text-center" style={{ color: i >= 5 ? "var(--ink-4)" : "var(--ink-3)", fontSize: 9.5 }}>
              {d}
            </div>
          ))}
        </div>

        {/* Day cells */}
        <div className="grid grid-cols-7">
          {cells.map((day, idx) => {
            if (!day) {
              return <div key={`pad-${idx}`} className="h-20 md:h-24" style={{ background: "var(--paper-3)", borderRight: "1px solid var(--line)", borderBottom: "1px solid var(--line)" }} />;
            }
            const iso = `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
            const entry = byDate.get(iso);
            const isToday = iso === today;
            const isPast = iso < today;
            const d = new Date(year, month - 1, day);
            const isWeekend = d.getDay() === 0 || d.getDay() === 6;
            const isSelected = selected === iso;
            const acts = entry?.activities ?? [];
            const plans = entry?.planned ?? [];
            const totalEntries = acts.length + plans.length;

            return (
              <button
                key={iso}
                onClick={() => setSelected(iso === selected ? null : iso)}
                className="flex h-20 flex-col gap-1 p-1.5 text-left transition-colors md:h-24"
                style={{
                  background: isSelected ? "var(--signal-wash)" : isWeekend ? "var(--paper-3)" : "transparent",
                  borderRight: "1px solid var(--line)",
                  borderBottom: "1px solid var(--line)",
                  boxShadow: isSelected ? "inset 0 0 0 1.5px var(--signal)" : "none",
                }}
              >
                <span
                  className="lx-num flex h-5 w-5 items-center justify-center text-xs"
                  style={{
                    background: isToday ? "var(--signal)" : "transparent",
                    color: isToday ? "var(--paper)" : isPast ? "var(--ink-3)" : "var(--ink)",
                    borderRadius: "50%",
                    fontWeight: isToday ? 700 : 500,
                  }}
                >
                  {day}
                </span>

                <div className="flex min-h-0 flex-col gap-0.5 overflow-hidden">
                  {acts.slice(0, 2).map((a) => {
                    const meta = intensity(activityIntensity(a));
                    return (
                      <span key={a.intervalsActivityId} className="flex items-center gap-1 truncate">
                        <span style={{ width: 5, height: 5, borderRadius: "50%", background: `var(${meta.varName})`, flex: "none" }} />
                        <span className="lx-sans truncate text-[10px] font-medium" style={{ color: "var(--ink-2)" }}>{shortType(a.type)}</span>
                      </span>
                    );
                  })}
                  {plans.slice(0, totalEntries > 2 ? 1 : 2 - acts.length).map((w) => {
                    const meta = intensity(plannedIntensity(w));
                    return (
                      <span key={`${w.date}-${w.name}`} className="flex items-center gap-1 truncate">
                        <span style={{ width: 5, height: 5, borderRadius: "50%", border: `1.5px solid var(${meta.varName})`, flex: "none" }} />
                        <span className="lx-sans truncate text-[10px]" style={{ color: "var(--ink-3)" }}>{shortType(w.type)}</span>
                      </span>
                    );
                  })}
                  {totalEntries > 2 && (
                    <span className="lx-mono text-[9px]" style={{ color: "var(--ink-4)" }}>+{totalEntries - 2}</span>
                  )}
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {selectedDetail && <DetailPanel detail={selectedDetail} onClose={() => setSelected(null)} />}
    </>
  );
}
