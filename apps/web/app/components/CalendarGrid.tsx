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

function DetailPanel({ detail, onClose }: { detail: DayDetail; onClose: () => void }) {
  const label = new Intl.DateTimeFormat("en-GB", {
    weekday: "long", day: "numeric", month: "long",
  }).format(new Date(`${detail.date}T00:00:00`));

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

        {detail.activities.length === 0 && detail.planned.length === 0 && (
          <p className="text-sm text-slate-400">No activities or planned workouts.</p>
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
          <div>
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
