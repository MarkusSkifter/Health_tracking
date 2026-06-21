"use client";

import type { Activity, PlannedWorkout } from "@health/shared";
import { useState } from "react";

const TYPE_COLORS: Record<string, { bg: string; text: string }> = {
  Ride: { bg: "bg-amber-100", text: "text-amber-700" },
  VirtualRide: { bg: "bg-amber-100", text: "text-amber-700" },
  Run: { bg: "bg-emerald-100", text: "text-emerald-700" },
  VirtualRun: { bg: "bg-emerald-100", text: "text-emerald-700" },
  Swim: { bg: "bg-blue-100", text: "text-blue-700" },
  Walk: { bg: "bg-teal-100", text: "text-teal-700" },
  WeightTraining: { bg: "bg-violet-100", text: "text-violet-700" },
  Workout: { bg: "bg-neutral-100", text: "text-neutral-600" },
};

function typeColor(type: string | null) {
  return TYPE_COLORS[type ?? ""] ?? { bg: "bg-neutral-100", text: "text-neutral-600" };
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
      <div className="absolute inset-0 bg-black/20" />
      <div
        className="relative z-50 w-full max-w-sm rounded-t-2xl md:rounded-2xl bg-white p-5 shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-4 flex items-center justify-between">
          <p className="font-semibold text-neutral-900">{label}</p>
          <button onClick={onClose} className="text-neutral-400 hover:text-neutral-700 text-lg leading-none">
            &times;
          </button>
        </div>

        {detail.activities.length === 0 && detail.planned.length === 0 && (
          <p className="text-sm text-neutral-400">No activities or planned workouts.</p>
        )}

        {detail.activities.length > 0 && (
          <div className="flex flex-col gap-2 mb-4">
            <p className="text-xs font-medium uppercase tracking-wider text-neutral-400">Completed</p>
            {detail.activities.map((a) => {
              const c = typeColor(a.type);
              return (
                <div key={a.intervalsActivityId} className="flex items-center gap-3">
                  <span className={`rounded-md px-2 py-0.5 text-xs font-medium ${c.bg} ${c.text}`}>
                    {shortType(a.type)}
                  </span>
                  <span className="text-sm text-neutral-700">{fmtDuration(a.durationSec)}</span>
                  {a.distanceM != null && (
                    <span className="text-sm text-neutral-500">{(a.distanceM / 1000).toFixed(1)} km</span>
                  )}
                  {a.trainingLoad != null && (
                    <span className="text-sm text-neutral-400">load {Math.round(a.trainingLoad)}</span>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {detail.planned.length > 0 && (
          <div className="flex flex-col gap-2">
            <p className="text-xs font-medium uppercase tracking-wider text-neutral-400">Planned</p>
            {detail.planned.map((w) => (
              <div key={`${w.date}-${w.name}`} className="flex flex-col gap-0.5">
                <div className="flex items-center gap-3">
                  <span className="rounded-md border border-dashed border-violet-300 bg-violet-50 px-2 py-0.5 text-xs font-medium text-violet-700">
                    {shortType(w.type)}
                  </span>
                  <span className="text-sm font-medium text-neutral-800">{w.name}</span>
                  {w.plannedDurationSec != null && (
                    <span className="text-sm text-neutral-500">{fmtDuration(w.plannedDurationSec)}</span>
                  )}
                </div>
                {w.description && (
                  <p className="text-xs text-neutral-400 pl-1">{w.description}</p>
                )}
              </div>
            ))}
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
}: {
  year: number;
  month: number;
  activities: Activity[];
  planned: PlannedWorkout[];
}) {
  const [selected, setSelected] = useState<string | null>(null);
  const today = new Date().toISOString().slice(0, 10);

  // Build a map: date -> {activities, planned}
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

  // Calendar grid: first day of month (ISO week: Mon=0 ... Sun=6)
  const firstDay = new Date(year, month - 1, 1);
  const dayOfWeek = (firstDay.getDay() + 6) % 7; // Monday-based offset
  const daysInMonth = new Date(year, month, 0).getDate();

  // Build cells: nulls for leading padding, then day numbers
  const cells: (number | null)[] = [
    ...Array(dayOfWeek).fill(null),
    ...Array.from({ length: daysInMonth }, (_, i) => i + 1),
  ];
  // Pad to full weeks
  while (cells.length % 7 !== 0) cells.push(null);

  const selectedDetail = selected
    ? { date: selected, ...(byDate.get(selected) ?? { activities: [], planned: [] }) }
    : null;

  return (
    <>
      <div className="rounded-xl border border-neutral-100 overflow-hidden">
        {/* Weekday headers */}
        <div className="grid grid-cols-7 border-b border-neutral-100 bg-neutral-50">
          {WEEKDAYS.map((d) => (
            <div key={d} className="py-2 text-center text-xs font-medium text-neutral-400">
              {d}
            </div>
          ))}
        </div>

        {/* Day cells */}
        <div className="grid grid-cols-7 divide-x divide-y divide-neutral-50">
          {cells.map((day, idx) => {
            if (!day) {
              return <div key={`pad-${idx}`} className="h-20 bg-neutral-50/50" />;
            }
            const iso = `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
            const entry = byDate.get(iso);
            const isToday = iso === today;
            const isPast = iso < today;

            return (
              <button
                key={iso}
                onClick={() => setSelected(iso === selected ? null : iso)}
                className={`h-20 p-1.5 text-left flex flex-col gap-0.5 transition-colors hover:bg-neutral-50 ${
                  selected === iso ? "bg-neutral-50 ring-1 ring-inset ring-neutral-200" : ""
                }`}
              >
                <span
                  className={`text-xs font-medium w-5 h-5 flex items-center justify-center rounded-full ${
                    isToday
                      ? "bg-neutral-900 text-white"
                      : isPast
                        ? "text-neutral-400"
                        : "text-neutral-700"
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
                        className={`truncate rounded px-1 py-px text-[10px] font-medium leading-tight ${c.bg} ${c.text}`}
                      >
                        {shortType(a.type)}
                        {a.durationSec ? ` ${fmtDuration(a.durationSec)}` : ""}
                      </span>
                    );
                  })}
                  {entry?.planned.slice(0, 1).map((w) => (
                    <span
                      key={`${w.date}-${w.name}`}
                      className="truncate rounded border border-dashed border-violet-300 px-1 py-px text-[10px] font-medium leading-tight text-violet-600"
                    >
                      {w.name}
                    </span>
                  ))}
                  {(entry?.activities.length ?? 0) + (entry?.planned.length ?? 0) > 3 && (
                    <span className="text-[9px] text-neutral-400 px-1">+more</span>
                  )}
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
