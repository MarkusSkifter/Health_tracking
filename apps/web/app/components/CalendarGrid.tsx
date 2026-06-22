"use client";

import type { Activity, PlannedWorkout } from "@health/shared";
import { useState } from "react";

const TYPE_COLORS: Record<string, { bg: string; text: string }> = {
  Ride: { bg: "bg-amber-50", text: "text-amber-700" },
  VirtualRide: { bg: "bg-amber-50", text: "text-amber-700" },
  Run: { bg: "bg-emerald-50", text: "text-emerald-700" },
  VirtualRun: { bg: "bg-emerald-50", text: "text-emerald-700" },
  Swim: { bg: "bg-blue-50", text: "text-blue-700" },
  Walk: { bg: "bg-teal-50", text: "text-teal-700" },
  WeightTraining: { bg: "bg-violet-50", text: "text-violet-700" },
  Workout: { bg: "bg-slate-100", text: "text-slate-600" },
};

function typeColor(type: string | null) {
  return TYPE_COLORS[type ?? ""] ?? { bg: "bg-slate-100", text: "text-slate-600" };
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

  const inputCls = "w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-800 placeholder:text-slate-300 focus:border-blue-400 focus:bg-white focus:outline-none transition-colors";

  return (
    <form onSubmit={submit} className="flex flex-col gap-3">
      <input
        className={inputCls}
        placeholder="Workout name"
        value={name}
        onChange={(e) => setName(e.target.value)}
        required
        autoFocus
      />

      <div className="flex gap-2">
        <select
          className={`${inputCls} flex-1`}
          value={type}
          onChange={(e) => setType(e.target.value)}
        >
          {WORKOUT_TYPES.map((t) => (
            <option key={t} value={t}>{t === "WeightTraining" ? "Weights" : t}</option>
          ))}
        </select>
        <input
          className={`${inputCls} w-24`}
          type="number"
          placeholder="min"
          min="1"
          value={durationMin}
          onChange={(e) => setDurationMin(e.target.value)}
        />
        <input
          className={`${inputCls} w-20`}
          type="number"
          placeholder="load"
          min="0"
          value={load}
          onChange={(e) => setLoad(e.target.value)}
        />
      </div>

      <textarea
        className={`${inputCls} min-h-[80px] resize-y font-mono text-xs leading-relaxed`}
        placeholder={"e.g. 15min Z1\n3x(8min @ threshold, 3min easy)\n10min cooldown"}
        value={description}
        onChange={(e) => setDescription(e.target.value)}
      />

      {error && <p className="text-xs text-rose-500">{error}</p>}

      <div className="flex gap-2">
        <button
          type="submit"
          disabled={saving || !name.trim()}
          className="flex-1 rounded-xl bg-blue-600 py-2 text-sm font-semibold text-white transition-colors hover:bg-blue-700 disabled:opacity-40"
        >
          {saving ? "Saving..." : "Add to calendar"}
        </button>
        <button
          type="button"
          onClick={onCancel}
          className="rounded-xl border border-slate-200 px-4 py-2 text-sm font-medium text-slate-500 transition-colors hover:bg-slate-50"
        >
          Cancel
        </button>
      </div>
    </form>
  );
}

function DetailPanel({ detail, onClose }: { detail: DayDetail; onClose: () => void }) {
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
      <div className="absolute inset-0 bg-slate-900/20 backdrop-blur-sm" />
      <div
        className="relative z-50 w-full max-w-sm rounded-t-2xl md:rounded-2xl bg-white p-6 shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-5 flex items-center justify-between">
          <p className="font-semibold text-slate-900">{label}</p>
          <button
            onClick={onClose}
            className="flex h-7 w-7 items-center justify-center rounded-lg text-slate-400 transition-colors hover:bg-slate-50 hover:text-slate-700"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {saved ? (
          <p className="text-sm font-medium text-emerald-600">Workout added to intervals.icu!</p>
        ) : adding ? (
          <AddWorkoutForm date={detail.date} onCancel={() => setAdding(false)} onSaved={handleSaved} />
        ) : (
          <>
            {detail.activities.length === 0 && detail.planned.length === 0 && (
              <p className="mb-5 text-sm text-slate-400">No activities or planned workouts.</p>
            )}

            {detail.activities.length > 0 && (
              <div className="mb-5">
                <p className="mb-2 text-[11px] font-semibold uppercase tracking-widest text-slate-400">Completed</p>
                <div className="flex flex-col gap-2">
                  {detail.activities.map((a) => {
                    const c = typeColor(a.type);
                    return (
                      <div key={a.intervalsActivityId} className="flex items-center gap-3">
                        <span className={`rounded-md px-2 py-0.5 text-xs font-medium ${c.bg} ${c.text}`}>
                          {shortType(a.type)}
                        </span>
                        <span className="text-sm text-slate-700">{fmtDuration(a.durationSec)}</span>
                        {a.distanceM != null && (
                          <span className="text-sm text-slate-500">{(a.distanceM / 1000).toFixed(1)} km</span>
                        )}
                        {a.avgPower != null && (
                          <span className="text-sm text-slate-400">{a.avgPower} W</span>
                        )}
                        {a.trainingLoad != null && (
                          <span className="ml-auto text-xs text-slate-400">load {Math.round(a.trainingLoad)}</span>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {detail.planned.length > 0 && (
              <div className="mb-5">
                <p className="mb-2 text-[11px] font-semibold uppercase tracking-widest text-slate-400">Planned</p>
                <div className="flex flex-col gap-2">
                  {detail.planned.map((w) => (
                    <div key={`${w.date}-${w.name}`}>
                      <div className="flex items-center gap-3">
                        <span className="rounded-md border border-dashed border-violet-300 bg-violet-50 px-2 py-0.5 text-xs font-medium text-violet-700">
                          {shortType(w.type)}
                        </span>
                        <span className="text-sm font-medium text-slate-800">{w.name}</span>
                        {w.plannedDurationSec != null && (
                          <span className="ml-auto text-sm text-slate-400">{fmtDuration(w.plannedDurationSec)}</span>
                        )}
                      </div>
                      {w.description && (
                        <p className="mt-1 pl-1 text-xs leading-relaxed text-slate-400">{w.description}</p>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            <button
              onClick={() => setAdding(true)}
              className="flex w-full items-center justify-center gap-2 rounded-xl border border-dashed border-slate-200 py-2.5 text-sm font-medium text-slate-400 transition-colors hover:border-blue-300 hover:text-blue-600"
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
      <div className="overflow-hidden rounded-xl border border-slate-100">
        {/* Weekday headers */}
        <div className="grid grid-cols-7 border-b border-slate-100">
          {WEEKDAYS.map((d, i) => (
            <div
              key={d}
              className={`py-2 text-center text-[11px] font-semibold uppercase tracking-wider ${
                i >= 5 ? "text-slate-300" : "text-slate-400"
              }`}
            >
              {d}
            </div>
          ))}
        </div>

        {/* Day cells */}
        <div className="grid grid-cols-7 divide-x divide-y divide-slate-50">
          {cells.map((day, idx) => {
            if (!day) {
              return <div key={`pad-${idx}`} className={`${cellH} bg-slate-50/40`} />;
            }
            const d = new Date(year, month - 1, day);
            const iso = `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
            const entry = byDate.get(iso);
            const isToday = iso === today;
            const isPast = iso < today;
            const isWeekend = d.getDay() === 0 || d.getDay() === 6;

            return (
              <button
                key={iso}
                onClick={() => setSelected(iso === selected ? null : iso)}
                className={`${cellH} p-1.5 text-left flex flex-col gap-0.5 transition-colors hover:bg-slate-50 ${
                  isWeekend && !isToday ? "bg-slate-50/30" : ""
                } ${selected === iso ? "ring-1 ring-inset ring-blue-200 bg-blue-50/30" : ""}`}
              >
                <span
                  className={`flex h-5 w-5 items-center justify-center rounded-full text-xs font-medium ${
                    isToday
                      ? "bg-blue-600 text-white"
                      : isPast
                        ? isWeekend ? "text-slate-300" : "text-slate-400"
                        : isWeekend ? "text-slate-400" : "text-slate-700"
                  }`}
                >
                  {day}
                </span>

                <div className="flex flex-col gap-0.5 overflow-hidden">
                  {entry?.activities.slice(0, 2).map((a) => {
                    const c = typeColor(a.type);
                    return (
                      <span
                        key={a.intervalsActivityId}
                        className={`truncate rounded px-1 py-px text-[9px] font-semibold leading-tight ${c.bg} ${c.text}`}
                      >
                        {shortType(a.type)}
                        {a.durationSec && !compact ? ` ${fmtDuration(a.durationSec)}` : ""}
                      </span>
                    );
                  })}
                  {entry?.planned.slice(0, compact ? 1 : 2).map((w) => (
                    <span
                      key={`${w.date}-${w.name}`}
                      className="truncate rounded border border-dashed border-violet-300 px-1 py-px text-[9px] font-semibold leading-tight text-violet-600"
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
