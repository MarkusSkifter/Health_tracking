"use client";

import type { Activity, PlannedWorkout } from "@health/shared";
import { useState } from "react";
import { CalendarGrid } from "./CalendarGrid";
import { DeleteWorkoutButton } from "./DeleteWorkoutButton";
import { WorkoutBars } from "./WorkoutBars";

const TYPE_CHIP: Record<string, { bg: string; text: string }> = {
  Run:        { bg: "rgba(29,158,117,0.18)",  text: "#5DCAA5" },
  VirtualRun: { bg: "rgba(29,158,117,0.18)",  text: "#5DCAA5" },
  Ride:       { bg: "rgba(251,191,36,0.18)",  text: "#FCD34D" },
  VirtualRide:{ bg: "rgba(251,191,36,0.18)",  text: "#FCD34D" },
  Swim:       { bg: "rgba(55,138,221,0.18)",  text: "#6BAEE8" },
  Walk:       { bg: "rgba(93,202,165,0.18)",  text: "#5DCAA5" },
};

function chipStyle(type: string | null) {
  return TYPE_CHIP[type ?? ""] ?? { bg: "rgba(255,255,255,0.08)", text: "rgba(255,255,255,0.5)" };
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
  Ride:        "#FCD34D",
  VirtualRide: "#FCD34D",
  Run:         "#5DCAA5",
  VirtualRun:  "#5DCAA5",
  Swim:        "#6BAEE8",
  Walk:        "#5DCAA5",
};

function activityDotColor(type: string | null) {
  return TYPE_DOT[type ?? ""] ?? "rgba(255,255,255,0.35)";
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

  const dayOfWeek = (todayDate.getDay() + 6) % 7;
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
      <div className="panel p-4">
        <div className="mb-3 flex items-center justify-between">
          <span className="chan">This week</span>
          <button
            onClick={toggle}
            className="flex items-center gap-1 transition-colors"
            style={{ color: "#5DCAA5", fontFamily: "var(--type-mono)", fontSize: 11, fontWeight: 500, letterSpacing: "0.08em", textTransform: "uppercase" }}
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

            let bgStyle: React.CSSProperties = {};
            if (isToday) bgStyle = { background: "linear-gradient(135deg, #1D9E75, #2A7FC0)" };
            else if (isSelected) bgStyle = { background: "rgba(93,202,165,0.12)" };
            else if (isPast && hasDone) bgStyle = { background: "rgba(255,255,255,0.05)" };

            return (
              <button
                key={iso}
                onClick={() => setStripSelected(isSelected ? null : iso)}
                className="flex flex-col items-center gap-1.5 rounded-xl py-3 px-1 transition-colors"
                style={bgStyle}
                onMouseEnter={(e) => {
                  if (!isToday && !isSelected) (e.currentTarget as HTMLElement).style.background = "rgba(255,255,255,0.05)";
                }}
                onMouseLeave={(e) => {
                  if (!isToday && !isSelected) (e.currentTarget as HTMLElement).style.background = isPast && hasDone ? "rgba(255,255,255,0.05)" : "transparent";
                }}
              >
                <span
                  className="text-[10px] font-medium uppercase tracking-wide"
                  style={{ color: isToday ? "rgba(255,255,255,0.7)" : "rgba(255,255,255,0.35)" }}
                >
                  {DAY_ABBR[d.getDay()]}
                </span>
                <span
                  className="text-sm font-semibold tabular-nums"
                  style={{ color: isToday ? "#fff" : isPast ? "rgba(255,255,255,0.45)" : "rgba(255,255,255,0.75)" }}
                >
                  {d.getDate()}
                </span>
                <div className="flex h-3 items-center justify-center gap-0.5">
                  {hasDone && acts.slice(0, 2).map((a, idx2) => (
                    <span
                      key={idx2}
                      className="h-1.5 w-1.5 rounded-full"
                      style={{ backgroundColor: isToday ? "rgba(255,255,255,0.7)" : activityDotColor(a.type) }}
                    />
                  ))}
                  {!hasDone && hasPlanned && (
                    <span className="h-1.5 w-1.5 rounded-full" style={{ border: "1px dashed #5DCAA5" }} />
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
            <div className="mt-3 pt-3" style={{ borderTop: "0.5px solid rgba(255,255,255,0.08)" }}>
              <p className="mb-2.5 text-xs font-semibold text-white">{label}</p>
              {dayActs.length === 0 && dayPlan.length === 0 && (
                <p className="text-xs" style={{ color: "rgba(255,255,255,0.35)" }}>No activity recorded.</p>
              )}
              <div className="flex flex-col gap-2">
                {dayActs.map((a) => {
                  const c = chipStyle(a.type);
                  return (
                    <div key={a.intervalsActivityId} className="flex items-center gap-2">
                      <span
                        className="rounded px-1.5 py-0.5 text-[10px] font-semibold"
                        style={{ background: c.bg, color: c.text }}
                      >
                        {a.type}
                      </span>
                      {a.durationSec && (
                        <span className="text-xs" style={{ color: "rgba(255,255,255,0.45)" }}>{fmtMin(a.durationSec)}</span>
                      )}
                      {a.trainingLoad != null && (
                        <span className="ml-auto text-xs" style={{ color: "rgba(255,255,255,0.35)" }}>load {Math.round(a.trainingLoad)}</span>
                      )}
                    </div>
                  );
                })}
                {dayPlan.map((w) => (
                  <div key={`${w.date}-${w.name}`}>
                    <div className="flex items-center gap-2">
                      <span
                        className="rounded px-1.5 py-0.5 text-[10px] font-semibold"
                        style={{ border: "0.5px dashed rgba(93,202,165,0.5)", background: "rgba(93,202,165,0.08)", color: "#5DCAA5" }}
                      >
                        {w.type ?? "Workout"}
                      </span>
                      <span className="text-xs font-medium text-white">{w.name}</span>
                      {fmtMin(w.plannedDurationSec) && (
                        <span className="text-xs" style={{ color: "rgba(255,255,255,0.35)" }}>{fmtMin(w.plannedDurationSec)}</span>
                      )}
                      {w.id != null && w.planId == null && (
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
          <div className="panel p-4 pt-5">
            {/* Month navigation */}
            <div className="mb-4 flex items-center justify-between">
              <h2 className="stat text-lg text-white">
                {MONTH_NAMES[(calMonth - 1)]} {calYear}
              </h2>
              <div className="flex items-center gap-1">
                <button
                  onClick={() => navigateMonth(-1)}
                  disabled={loading}
                  className="flex h-8 w-8 items-center justify-center rounded-lg transition-colors disabled:opacity-40"
                  style={{ color: "rgba(255,255,255,0.4)" }}
                  aria-label={`Go to ${MONTH_NAMES[(prevM - 1)]} ${prevY}`}
                  onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.color = "rgba(255,255,255,0.8)"; (e.currentTarget as HTMLElement).style.background = "rgba(255,255,255,0.06)"; }}
                  onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.color = "rgba(255,255,255,0.4)"; (e.currentTarget as HTMLElement).style.background = "transparent"; }}
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M15.75 19.5L8.25 12l7.5-7.5" />
                  </svg>
                </button>
                <button
                  onClick={() => navigateMonth(1)}
                  disabled={loading || isCurrentOrFuture}
                  className="flex h-8 w-8 items-center justify-center rounded-lg transition-colors disabled:opacity-40"
                  style={{ color: "rgba(255,255,255,0.4)" }}
                  aria-label={`Go to ${MONTH_NAMES[(nextM - 1)]} ${nextY}`}
                  onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.color = "rgba(255,255,255,0.8)"; (e.currentTarget as HTMLElement).style.background = "rgba(255,255,255,0.06)"; }}
                  onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.color = "rgba(255,255,255,0.4)"; (e.currentTarget as HTMLElement).style.background = "transparent"; }}
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M8.25 4.5l7.5 7.5-7.5 7.5" />
                  </svg>
                </button>
              </div>
            </div>

            {loading ? (
              <div className="flex h-64 items-center justify-center text-sm" style={{ color: "rgba(255,255,255,0.35)" }}>
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
