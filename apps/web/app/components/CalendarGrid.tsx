"use client";

import type { Activity, PlannedWorkout } from "@health/shared";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { DeleteWorkoutButton } from "./DeleteWorkoutButton";
import { WorkoutBars } from "./WorkoutBars";

const TYPE_COLORS: Record<string, { bg: string; text: string }> = {
  Ride:          { bg: "rgba(251,191,36,0.18)",  text: "#FCD34D" },
  VirtualRide:   { bg: "rgba(251,191,36,0.18)",  text: "#FCD34D" },
  Run:           { bg: "rgba(29,158,117,0.18)",   text: "#5DCAA5" },
  VirtualRun:    { bg: "rgba(29,158,117,0.18)",   text: "#5DCAA5" },
  Swim:          { bg: "rgba(55,138,221,0.18)",   text: "#6BAEE8" },
  Walk:          { bg: "rgba(93,202,165,0.18)",   text: "#5DCAA5" },
  WeightTraining:{ bg: "rgba(192,132,252,0.18)",  text: "#C084FC" },
  Workout:       { bg: "rgba(255,255,255,0.08)",  text: "rgba(255,255,255,0.5)" },
};

function typeColor(type: string | null) {
  return TYPE_COLORS[type ?? ""] ?? { bg: "rgba(255,255,255,0.08)", text: "rgba(255,255,255,0.5)" };
}

function fmtDuration(sec: number | null): string {
  if (!sec) return "";
  const h = Math.floor(sec / 3600);
  const m = Math.round((sec % 3600) / 60);
  return h > 0 ? `${h}h ${m}m` : `${m}m`;
}

function shortType(type: string | null): string {
  if (!type) return "Workout";
  if (type === "VirtualRide") return "Ride";
  if (type === "VirtualRun") return "Run";
  if (type === "WeightTraining") return "Weights";
  return type;
}

interface DayDetail {
  date: string;
  activities: Activity[];
  planned: PlannedWorkout[];
}

const WORKOUT_TYPES = ["Run", "Ride", "Swim", "Walk", "WeightTraining", "Workout"] as const;

function AddWorkoutForm({ date, onCancel, onSaved }: { date: string; onCancel: () => void; onSaved: () => void }) {
  const [name, setName] = useState("");
  const [type, setType] = useState("Run");
  const [durationMin, setDurationMin] = useState("");
  const [load, setLoad] = useState("");
  const [description, setDescription] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

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
          durationMin: durationMin ? Number(durationMin) : undefined,
          load: load ? Number(load) : undefined,
          description: description.trim() || undefined,
        }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({})) as { error?: string };
        throw new Error(body.error ?? `Error ${res.status}`);
      }
      onSaved();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save. Please try again.");
      setSaving(false);
    }
  }

  const inputStyle: React.CSSProperties = {
    background: "rgba(255,255,255,0.06)",
    border: "0.5px solid rgba(255,255,255,0.12)",
    borderRadius: 12,
    padding: "8px 12px",
    fontSize: 14,
    color: "#fff",
    width: "100%",
    outline: "none",
    transition: "border-color 0.15s",
  };

  return (
    <form onSubmit={submit} className="flex flex-col gap-3">
      <input
        style={inputStyle}
        placeholder="Workout name"
        value={name}
        onChange={(e) => setName(e.target.value)}
        required
        autoFocus
      />

      <div className="flex gap-2">
        <select
          style={{ ...inputStyle, flex: 1 }}
          value={type}
          onChange={(e) => setType(e.target.value)}
        >
          {WORKOUT_TYPES.map((t) => (
            <option key={t} value={t} style={{ background: "#0f0f12" }}>{t === "WeightTraining" ? "Weights" : t}</option>
          ))}
        </select>
        <input
          style={{ ...inputStyle, width: 80 }}
          type="number"
          placeholder="min"
          min="1"
          value={durationMin}
          onChange={(e) => setDurationMin(e.target.value)}
        />
        <input
          style={{ ...inputStyle, width: 72 }}
          type="number"
          placeholder="load"
          min="0"
          value={load}
          onChange={(e) => setLoad(e.target.value)}
        />
      </div>

      <textarea
        style={{ ...inputStyle, minHeight: 80, resize: "vertical", fontFamily: "monospace", fontSize: 12, lineHeight: 1.6 }}
        placeholder={"e.g. 15min Z1\n3x(8min @ threshold, 3min easy)\n10min cooldown"}
        value={description}
        onChange={(e) => setDescription(e.target.value)}
      />

      {error && <p className="text-xs" style={{ color: "#F87171" }}>{error}</p>}

      <div className="flex gap-2">
        <button
          type="submit"
          disabled={saving || !name.trim()}
          className="flex-1 rounded-xl py-2 text-sm font-semibold text-white transition-colors disabled:opacity-40"
          style={{ background: "linear-gradient(135deg, #1D9E75, #2A7FC0)" }}
        >
          {saving ? "Saving..." : "Add to calendar"}
        </button>
        <button
          type="button"
          onClick={onCancel}
          className="rounded-xl px-4 py-2 text-sm font-medium transition-colors"
          style={{ border: "0.5px solid rgba(255,255,255,0.12)", color: "rgba(255,255,255,0.5)" }}
          onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.background = "rgba(255,255,255,0.05)"; }}
          onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = "transparent"; }}
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

  const label = new Intl.DateTimeFormat("en-GB", {
    weekday: "long", day: "numeric", month: "long",
  }).format(new Date(`${detail.date}T00:00:00`));

  function handleSaved() {
    setSaved(true);
    setTimeout(() => window.location.reload(), 1000);
  }

  return (
    <div className="fixed inset-0 z-40 flex items-end justify-center md:items-center" onClick={onClose}>
      <div className="absolute inset-0" style={{ background: "rgba(6,6,8,0.7)", backdropFilter: "blur(4px)", WebkitBackdropFilter: "blur(4px)" }} />
      <div
        className="relative z-50 w-full max-w-sm rounded-t-2xl md:rounded-2xl p-6"
        style={{ background: "rgba(18,18,22,0.96)", border: "0.5px solid rgba(255,255,255,0.1)", boxShadow: "0 24px 80px rgba(0,0,0,0.6)" }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-5 flex items-center justify-between">
          <p className="font-semibold text-white">{label}</p>
          <button
            onClick={onClose}
            className="flex h-7 w-7 items-center justify-center rounded-lg transition-colors"
            style={{ color: "rgba(255,255,255,0.4)" }}
            onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.background = "rgba(255,255,255,0.06)"; (e.currentTarget as HTMLElement).style.color = "#fff"; }}
            onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = "transparent"; (e.currentTarget as HTMLElement).style.color = "rgba(255,255,255,0.4)"; }}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {saved ? (
          <p className="text-sm font-medium" style={{ color: "#5DCAA5" }}>Workout added to intervals.icu!</p>
        ) : adding ? (
          <AddWorkoutForm date={detail.date} onCancel={() => setAdding(false)} onSaved={handleSaved} />
        ) : (
          <>
            {detail.activities.length === 0 && detail.planned.length === 0 && (
              <p className="mb-5 text-sm" style={{ color: "rgba(255,255,255,0.35)" }}>No activities or planned workouts.</p>
            )}

            {detail.activities.length > 0 && (
              <div className="mb-5">
                <p className="mb-2 text-[11px] font-semibold uppercase tracking-widest" style={{ color: "rgba(255,255,255,0.35)" }}>Completed</p>
                <div className="flex flex-col gap-2">
                  {detail.activities.map((a) => {
                    const c = typeColor(a.type);
                    return (
                      <div key={a.intervalsActivityId} className="flex items-center gap-3">
                        <span className="rounded-md px-2 py-0.5 text-xs font-medium" style={{ background: c.bg, color: c.text }}>
                          {shortType(a.type)}
                        </span>
                        <span className="text-sm" style={{ color: "rgba(255,255,255,0.65)" }}>{fmtDuration(a.durationSec)}</span>
                        {a.distanceM != null && (
                          <span className="text-sm" style={{ color: "rgba(255,255,255,0.45)" }}>{(a.distanceM / 1000).toFixed(1)} km</span>
                        )}
                        {a.avgPower != null && (
                          <span className="text-sm" style={{ color: "rgba(255,255,255,0.35)" }}>{a.avgPower} W</span>
                        )}
                        {a.trainingLoad != null && (
                          <span className="ml-auto text-xs" style={{ color: "rgba(255,255,255,0.35)" }}>load {Math.round(a.trainingLoad)}</span>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {detail.planned.length > 0 && (
              <div className="mb-5">
                <p className="mb-2 text-[11px] font-semibold uppercase tracking-widest" style={{ color: "rgba(255,255,255,0.35)" }}>Planned</p>
                <div className="flex flex-col gap-2">
                  {detail.planned.map((w) => (
                    <div key={`${w.date}-${w.name}`}>
                      <div className="flex items-center gap-3">
                        <span
                          className="rounded-md px-2 py-0.5 text-xs font-medium"
                          style={{ border: "0.5px dashed rgba(93,202,165,0.5)", background: "rgba(93,202,165,0.08)", color: "#5DCAA5" }}
                        >
                          {shortType(w.type)}
                        </span>
                        <span className="text-sm font-medium text-white">{w.name}</span>
                        {w.plannedDurationSec != null && (
                          <span className="text-sm" style={{ color: "rgba(255,255,255,0.35)" }}>{fmtDuration(w.plannedDurationSec)}</span>
                        )}
                        {w.id != null && (
                          <span className="ml-auto">
                            <DeleteWorkoutButton
                              eventId={w.id}
                              onSuccess={() => { onClose(); router.refresh(); }}
                            />
                          </span>
                        )}
                      </div>
                      {w.description && (
                        <>
                          <p className="mt-1 pl-1 text-xs leading-relaxed" style={{ color: "rgba(255,255,255,0.35)" }}>{w.description}</p>
                          <WorkoutBars description={w.description} />
                        </>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            <button
              onClick={() => setAdding(true)}
              className="flex w-full items-center justify-center gap-2 rounded-xl py-2.5 text-sm font-medium transition-colors"
              style={{ border: "0.5px dashed rgba(255,255,255,0.15)", color: "rgba(255,255,255,0.4)" }}
              onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.borderColor = "rgba(93,202,165,0.5)"; (e.currentTarget as HTMLElement).style.color = "#5DCAA5"; }}
              onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.borderColor = "rgba(255,255,255,0.15)"; (e.currentTarget as HTMLElement).style.color = "rgba(255,255,255,0.4)"; }}
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M12 5v14M5 12h14" />
              </svg>
              Add workout
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
  compact = false,
}: {
  year: number;
  month: number;
  activities: Activity[];
  planned: PlannedWorkout[];
  compact?: boolean;
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
    e.planned.push(w);
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

  const cellH = compact ? "h-16" : "h-20";
  const selectedDetail = selected
    ? { date: selected, ...(byDate.get(selected) ?? { activities: [], planned: [] }) }
    : null;

  return (
    <>
      <div className="overflow-hidden rounded-xl" style={{ border: "0.5px solid rgba(255,255,255,0.08)" }}>
        {/* Weekday headers */}
        <div className="grid grid-cols-7" style={{ borderBottom: "0.5px solid rgba(255,255,255,0.08)" }}>
          {WEEKDAYS.map((d, i) => (
            <div
              key={d}
              className="py-2 text-center text-[11px] font-semibold uppercase tracking-wider"
              style={{ color: i >= 5 ? "rgba(255,255,255,0.2)" : "rgba(255,255,255,0.35)" }}
            >
              {d}
            </div>
          ))}
        </div>

        {/* Day cells */}
        <div
          className="grid grid-cols-7"
          style={{ borderTop: "0.5px solid rgba(255,255,255,0.04)" }}
        >
          {cells.map((day, idx) => {
            if (!day) {
              return (
                <div
                  key={`pad-${idx}`}
                  className={cellH}
                  style={{ background: "rgba(255,255,255,0.01)", borderRight: "0.5px solid rgba(255,255,255,0.04)", borderBottom: "0.5px solid rgba(255,255,255,0.04)" }}
                />
              );
            }
            const d = new Date(year, month - 1, day);
            const iso = `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
            const entry = byDate.get(iso);
            const isToday = iso === today;
            const isPast = iso < today;
            const isWeekend = d.getDay() === 0 || d.getDay() === 6;
            const isSelected = selected === iso;

            return (
              <button
                key={iso}
                onClick={() => setSelected(iso === selected ? null : iso)}
                className={`${cellH} p-1.5 text-left flex flex-col gap-0.5 transition-colors`}
                style={{
                  background: isSelected
                    ? "rgba(93,202,165,0.08)"
                    : isWeekend && !isToday
                      ? "rgba(255,255,255,0.015)"
                      : "transparent",
                  borderRight: "0.5px solid rgba(255,255,255,0.04)",
                  borderBottom: "0.5px solid rgba(255,255,255,0.04)",
                  boxShadow: isSelected ? "inset 0 0 0 1px rgba(93,202,165,0.25)" : "none",
                }}
                onMouseEnter={(e) => {
                  if (!isSelected) (e.currentTarget as HTMLElement).style.background = "rgba(255,255,255,0.03)";
                }}
                onMouseLeave={(e) => {
                  if (!isSelected) (e.currentTarget as HTMLElement).style.background = isWeekend && !isToday ? "rgba(255,255,255,0.015)" : "transparent";
                }}
              >
                <span
                  className="flex h-5 w-5 items-center justify-center rounded-full text-xs font-medium"
                  style={{
                    background: isToday ? "linear-gradient(135deg, #1D9E75, #378ADD)" : "transparent",
                    color: isToday
                      ? "#fff"
                      : isPast
                        ? isWeekend ? "rgba(255,255,255,0.2)" : "rgba(255,255,255,0.3)"
                        : isWeekend ? "rgba(255,255,255,0.35)" : "rgba(255,255,255,0.65)",
                  }}
                >
                  {day}
                </span>

                <div className="flex flex-col gap-0.5 overflow-hidden">
                  {entry?.activities.slice(0, 2).map((a) => {
                    const c = typeColor(a.type);
                    return (
                      <span
                        key={a.intervalsActivityId}
                        className="truncate rounded px-1 py-px text-[9px] font-semibold leading-tight"
                        style={{ background: c.bg, color: c.text }}
                      >
                        {shortType(a.type)}
                        {a.durationSec && !compact ? ` ${fmtDuration(a.durationSec)}` : ""}
                      </span>
                    );
                  })}
                  {entry?.planned.slice(0, compact ? 1 : 2).map((w) => (
                    <span
                      key={`${w.date}-${w.name}`}
                      className="truncate rounded px-1 py-px text-[9px] font-semibold leading-tight"
                      style={{ border: "0.5px dashed rgba(93,202,165,0.45)", color: "#5DCAA5" }}
                    >
                      {compact ? shortType(w.type) : w.name}
                    </span>
                  ))}
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {selectedDetail && (
        <DetailPanel detail={selectedDetail} onClose={() => setSelected(null)} />
      )}
    </>
  );
}
