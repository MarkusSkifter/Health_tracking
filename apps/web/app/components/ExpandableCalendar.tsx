"use client";

import type { Activity, PlannedWorkout } from "@health/shared";
import { useState } from "react";
import { CalendarGrid } from "./CalendarGrid";
import { DeleteWorkoutButton } from "./DeleteWorkoutButton";
import { WorkoutBars } from "./WorkoutBars";

const TYPE_CHIP: Record<string, { bg: string; text: string }> = {
  Run: { bg: "bg-emerald-50", text: "text-emerald-700" },
  VirtualRun: { bg: "bg-emerald-50", text: "text-emerald-700" },
  Ride: { bg: "bg-amber-50", text: "text-amber-700" },
  VirtualRide: { bg: "bg-amber-50", text: "text-amber-700" },
  Swim: { bg: "bg-blue-50", text: "text-blue-700" },
  Walk: { bg: "bg-teal-50", text: "text-teal-700" },
};

function chipStyle(type: string | null) {
  return TYPE_CHIP[type ?? ""] ?? { bg: "bg-slate-100", text: "text-slate-600" };
}

function fmtMin(sec: number | null): string | null {
  if (!sec) return null;
  const h = Math.floor(sec / 3600);
  const m = Math.round((sec % 3600) / 60);
  return h > 0 ? `${h}h ${m}m` : `${m}m`;
}

const DAY_ABBR = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const MONTH_NAMES = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

function addMonths(y: number, m: number, delta: number): [number, number] {
  const d = new Date(y, m - 1 + delta, 1);
  return [d.getFullYear(), d.getMonth() + 1];
}

function monthRange(y: number, m: number): [string, string] {
  const from = `${y}-${String(m).padStart(2, "0")}-01`;
  const last = new Date(y, m, 0).getDate();
  const to = `${y}-${String(m).padStart(2, "0")}-${String(last).padStart(2, "0")}`;
  return [from, to];
}

async function fetchMonthData(y: number, m: number) {
  const [from, to] = monthRange(y, m);
  const [actsRes, evtsRes] = await Promise.all([
    fetch(`/api/activities?from=${from}&to=${to}`),
    fetch(`/api/events?from=${from}&to=${to}`),
  ]);
  const acts = actsRes.ok ? ((await actsRes.json()) as { activities: Activity[] }).activities : [];
  const evts = evtsRes.ok ? ((await evtsRes.json()) as { workouts: PlannedWorkout[] }).workouts : [];
  return { acts, evts };
}

const TYPE_DOT: Record<string, string> = {
  Ride: "bg-amber-400",
  VirtualRide: "bg-amber-400",
  Run: "bg-emerald-500",
  VirtualRun: "bg-emerald-500",
  Swim: "bg-blue-400",
  Walk: "bg-teal-400",
};

function activityDot(type: string | null) {
  return TYPE_DOT[type ?? ""] ?? "bg-slate-400";
}

export function ExpandableCalendar({
  initialActivities,
  initialPlanned,
  year,
  month,
}: {
  initialActivities: Activity[];
  initialPlanned: PlannedWorkout[];
  year: number;
  month: number;
}) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [stripSelected, setStripSelected] = useState<string | null>(null);
  const [calYear, setCalYear] = useState(year);
  const [calMonth, setCalMonth] = useState(month);
  const [calActivities, setCalActivities] = useState(initialActivities);
  const [calPlanned, setCalPlanned] = useState(initialPlanned);
  const [loading, setLoading] = useState(false);

  const today = new Date().toISOString().slice(0, 10);
  const todayDate = new Date();

  // Build strip: Monday of current week → Sunday
  const dayOfWeek = (todayDate.getDay() + 6) % 7; // Mon=0
  const monday = new Date(todayDate);
  monday.setDate(todayDate.getDate() - dayOfWeek);

  const stripDays = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(monday);
    d.setDate(monday.getDate() + i);
    return d.toISOString().slice(0, 10);
  });

  const actsByDate = new Map<string, Activity[]>();
  for (const a of initialActivities) {
    const list = actsByDate.get(a.date) ?? [];
    list.push(a);
    actsByDate.set(a.date, list);
  }
  const plannedByDate = new Map<string, PlannedWorkout[]>();
  for (const w of initialPlanned) {
    const list = plannedByDate.get(w.date) ?? [];
    list.push(w);
    plannedByDate.set(w.date, list);
  }

  async function navigateMonth(delta: number) {
    const [ny, nm] = addMonths(calYear, calMonth, delta);
    setLoading(true);
    const { acts, evts } = await fetchMonthData(ny, nm);
    setCalActivities(acts);
    setCalPlanned(evts);
    setCalYear(ny);
    setCalMonth(nm);
    setLoading(false);
  }

  function toggle() {
    setIsExpanded((v) => !v);
  }

  const [prevY, prevM] = addMonths(calYear, calMonth, -1);
  const [nextY, nextM] = addMonths(calYear, calMonth, 1);
  const thisMonth = `${new Date().getFullYear()}-${String(new Date().getMonth() + 1).padStart(2, "0")}`;
  const isCurrentOrFuture = `${nextY}-${String(nextM).padStart(2, "0")}` > thisMonth;

  return (
    <div>
      {/* 7-day strip */}
      <div className="rounded-2xl border border-slate-100 bg-white p-4">
        <div className="mb-3 flex items-center justify-between">
          <p className="text-xs font-semibold uppercase tracking-widest text-slate-400">
            This week
          </p>
          <button
            onClick={toggle}
            className="flex items-center gap-1 text-xs font-medium text-blue-600 transition-colors hover:text-blue-700"
          >
            {isExpanded ? (
              <>
                Close
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M4.5 15.75l7.5-7.5 7.5 7.5" />
                </svg>
              </>
            ) : (
              <>
                View calendar
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M19.5 8.25l-7.5 7.5-7.5-7.5" />
                </svg>
              </>
            )}
          </button>
        </div>

        {/* 7 day cells */}
        <div className="grid grid-cols-7 gap-1">
          {stripDays.map((iso) => {
            const d = new Date(`${iso}T00:00:00`);
            const isToday = iso === today;
            const isPast = iso < today;
            const acts = actsByDate.get(iso) ?? [];
            const planned = plannedByDate.get(iso) ?? [];
            const hasDone = acts.length > 0;
            const hasPlanned = planned.length > 0;

            const isSelected = iso === stripSelected;
            return (
              <button
                key={iso}
                onClick={() => setStripSelected(isSelected ? null : iso)}
                className={`flex flex-col items-center gap-1.5 rounded-xl py-3 px-1 transition-colors ${
                  isToday
                    ? "bg-blue-600"
                    : isSelected
                      ? "bg-slate-100"
                      : isPast && hasDone
                        ? "bg-slate-50 hover:bg-slate-100"
                        : "hover:bg-slate-50"
                }`}
              >
                <span className={`text-[10px] font-medium uppercase tracking-wide ${isToday ? "text-blue-200" : "text-slate-400"}`}>
                  {DAY_ABBR[d.getDay()]}
                </span>
                <span className={`text-sm font-semibold tabular-nums ${isToday ? "text-white" : isPast ? "text-slate-500" : "text-slate-800"}`}>
                  {d.getDate()}
                </span>
                <div className="flex h-3 items-center justify-center gap-0.5">
                  {hasDone && acts.slice(0, 2).map((a, idx2) => (
                    <span key={idx2} className={`h-1.5 w-1.5 rounded-full ${isToday ? "bg-blue-300" : activityDot(a.type)}`} />
                  ))}
                  {!hasDone && hasPlanned && (
                    <span className="h-1.5 w-1.5 rounded-full border border-dashed border-violet-400" />
                  )}
                </div>
              </button>
            );
          })}
        </div>

        {/* Strip day detail */}
        {stripSelected && (() => {
          const dayActs = actsByDate.get(stripSelected) ?? [];
          const dayPlan = plannedByDate.get(stripSelected) ?? [];
          const label = new Intl.DateTimeFormat("en-GB", {
            weekday: "long", day: "numeric", month: "long",
          }).format(new Date(`${stripSelected}T00:00:00`));
          return (
            <div className="mt-3 border-t border-slate-100 pt-3">
              <p className="mb-2.5 text-xs font-semibold text-slate-700">{label}</p>
              {dayActs.length === 0 && dayPlan.length === 0 && (
                <p className="text-xs text-slate-400">No activity recorded.</p>
              )}
              <div className="flex flex-col gap-2">
                {dayActs.map((a) => {
                  const c = chipStyle(a.type);
                  return (
                    <div key={a.intervalsActivityId} className="flex items-center gap-2">
                      <span className={`rounded px-1.5 py-0.5 text-[10px] font-semibold ${c.bg} ${c.text}`}>{a.type}</span>
                      {a.durationSec && <span className="text-xs text-slate-500">{fmtMin(a.durationSec)}</span>}
                      {a.trainingLoad != null && (
                        <span className="ml-auto text-xs text-slate-400">load {Math.round(a.trainingLoad)}</span>
                      )}
                    </div>
                  );
                })}
                {dayPlan.map((w) => (
                  <div key={`${w.date}-${w.name}`}>
                    <div className="flex items-center gap-2">
                      <span className="rounded border border-dashed border-violet-300 bg-violet-50 px-1.5 py-0.5 text-[10px] font-semibold text-violet-600">
                        {w.type ?? "Workout"}
                      </span>
                      <span className="text-xs font-medium text-slate-800">{w.name}</span>
                      {fmtMin(w.plannedDurationSec) && (
                        <span className="text-xs text-slate-400">{fmtMin(w.plannedDurationSec)}</span>
                      )}
                      {w.id != null && (
                        <span className="ml-auto">
                          <DeleteWorkoutButton
                            eventId={w.id}
                            onSuccess={() => setStripSelected(null)}
                          />
                        </span>
                      )}
                    </div>
                    {w.description && <WorkoutBars description={w.description} />}
                  </div>
                ))}
              </div>
            </div>
          );
        })()}
      </div>

      {/* Expandable full calendar */}
      <div className={`cal-expand${isExpanded ? " open" : ""} mt-2`}>
        <div className="cal-inner">
          <div className="rounded-2xl border border-slate-100 bg-white p-4 pt-5">
            {/* Month navigation */}
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-base font-semibold text-slate-900">
                {MONTH_NAMES[(calMonth - 1)]} {calYear}
              </h2>
              <div className="flex items-center gap-1">
                <button
                  onClick={() => navigateMonth(-1)}
                  disabled={loading}
                  className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 transition-colors hover:bg-slate-50 hover:text-slate-700 disabled:opacity-40"
                  aria-label={`Go to ${MONTH_NAMES[(prevM - 1)]} ${prevY}`}
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M15.75 19.5L8.25 12l7.5-7.5" />
                  </svg>
                </button>
                <button
                  onClick={() => navigateMonth(1)}
                  disabled={loading || isCurrentOrFuture}
                  className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 transition-colors hover:bg-slate-50 hover:text-slate-700 disabled:opacity-40"
                  aria-label={`Go to ${MONTH_NAMES[(nextM - 1)]} ${nextY}`}
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M8.25 4.5l7.5 7.5-7.5 7.5" />
                  </svg>
                </button>
              </div>
            </div>

            {loading ? (
              <div className="flex h-64 items-center justify-center text-sm text-slate-400">
                Loading…
              </div>
            ) : (
              <CalendarGrid
                year={calYear}
                month={calMonth}
                activities={calActivities}
                planned={calPlanned}
                compact
              />
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
