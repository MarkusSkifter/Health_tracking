import type { Activity, AiDaySuggestion, AiWeekPlan, PlannedWorkout, TodayResponse } from "@health/shared";
import { fetchActivities, fetchEvents, fetchToday, fetchUpcoming } from "../lib/api";
import { AcceptButton } from "./components/AcceptButton";
import { AcrBadge } from "./components/AcrBadge";
import { ExpandableCalendar } from "./components/ExpandableCalendar";
import { Sparkline } from "./components/Sparkline";
import { SyncButton } from "./components/SyncButton";
import { WorkoutBars } from "./components/WorkoutBars";

export const revalidate = 60;

function longDate(iso: string): string {
  return new Intl.DateTimeFormat("en-GB", {
    weekday: "long",
    day: "numeric",
    month: "long",
  }).format(new Date(`${iso}T00:00:00`));
}

function formatSleep(sec: number): string {
  const h = Math.floor(sec / 3600);
  const m = Math.floor((sec % 3600) / 60);
  return m > 0 ? `${h}h ${m}m` : `${h}h`;
}

function fmtDuration(sec: number | null): string | null {
  if (sec == null) return null;
  const h = Math.floor(sec / 3600);
  const m = Math.round((sec % 3600) / 60);
  return h > 0 ? `${h}h ${m}m` : `${m}m`;
}

export default async function TodayPage() {
  const now = new Date();
  const y = now.getFullYear();
  const mo = String(now.getMonth() + 1).padStart(2, "0");
  const monthFrom = `${y}-${mo}-01`;
  const monthTo = `${y}-${mo}-${new Date(y, now.getMonth() + 1, 0).getDate()}`;

  let today: TodayResponse | null;
  let workouts: PlannedWorkout[] = [];
  let suggestions: AiWeekPlan | null = null;
  let monthActivities: Activity[] = [];
  let monthPlanned: PlannedWorkout[] = [];

  try {
    const [todayResult, upcomingResult, acts, evts] = await Promise.all([
      fetchToday(),
      fetchUpcoming(),
      fetchActivities(monthFrom, monthTo).catch(() => []),
      fetchEvents(monthFrom, monthTo).catch(() => []),
    ]);
    today = todayResult;
    workouts = upcomingResult.workouts;
    suggestions = upcomingResult.suggestions;
    monthActivities = acts as typeof monthActivities;
    monthPlanned = evts;
  } catch {
    return (
      <EmptyState
        title="Cannot reach the server"
        message="The API is not responding."
      />
    );
  }

  if (!today) {
    return (
      <EmptyState
        title="No summary yet"
        message="Run the daily job to generate your first summary."
      />
    );
  }

  const { summary, wellness, trend } = today;

  return (
    <main className="flex flex-col gap-8">
      {/* Page header */}
      <header className="flex items-start justify-between gap-4">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-widest text-slate-400">Today</p>
          <h1 className="mt-1 text-2xl font-bold tracking-tight text-slate-900">
            {longDate(summary.date)}
          </h1>
        </div>
        <div className="mt-0.5">
          <SyncButton />
        </div>
      </header>

      {/* 7-day strip + expandable calendar */}
      <ExpandableCalendar
        initialActivities={monthActivities}
        initialPlanned={monthPlanned}
        year={y}
        month={now.getMonth() + 1}
      />

      {/* Load + sparkline + wellness */}
      <div className="grid gap-5 lg:grid-cols-[1fr_200px]">
        <div className="flex flex-col gap-5">
          {/* Load hero */}
          <div className="rounded-2xl border border-slate-100 bg-white p-6">
            <div className="flex items-end gap-5">
              <div>
                <p className="text-6xl font-bold tabular-nums tracking-tight leading-none text-slate-900">
                  {Math.round(summary.trainingLoadDaily)}
                </p>
                <p className="mt-2 text-sm text-slate-400">Training load today</p>
              </div>
              <div className="mb-1">
                <AcrBadge ratio={summary.acuteChronicRatio} />
              </div>
            </div>

            <div className="mt-5">
              <Sparkline values={trend.map((t) => t.trainingLoadDaily)} />
              <div className="mt-1.5 flex justify-between text-xs text-slate-400">
                <span>7d avg {Math.round(summary.load7d)}</span>
                <span>28d avg {Math.round(summary.load28d)}</span>
              </div>
            </div>
          </div>

          {/* AI summary */}
          {summary.aiSummaryText && (
            <div className="rounded-2xl border border-slate-100 bg-white px-6 py-5">
              <p className="mb-2 text-[11px] font-semibold uppercase tracking-widest text-slate-400">Coach</p>
              <p className="text-[15px] leading-relaxed text-slate-700">
                {summary.aiSummaryText}
              </p>
            </div>
          )}
        </div>

        {/* Wellness sidebar */}
        {wellness && (
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-1 lg:content-start">
            <WellnessCard
              label="HRV"
              value={wellness.hrv !== null ? `${Math.round(wellness.hrv)} ms` : null}
              color="text-emerald-600"
            />
            <WellnessCard
              label="Resting HR"
              value={wellness.restingHr !== null ? `${wellness.restingHr} bpm` : null}
              color="text-rose-500"
            />
            <WellnessCard
              label="Sleep"
              value={wellness.sleepSec !== null ? formatSleep(wellness.sleepSec) : null}
              color="text-violet-600"
            />
            <WellnessCard
              label="Steps"
              value={wellness.steps !== null ? wellness.steps.toLocaleString("en-GB") : null}
              color="text-amber-600"
            />
            <WellnessCard
              label="Weight"
              value={wellness.weightKg !== null ? `${wellness.weightKg.toFixed(1)} kg` : null}
              color="text-slate-500"
            />
          </div>
        )}
      </div>

      {/* Real planned workouts from intervals.icu */}
      {workouts.length > 0 && (
        <section>
          <div className="mb-3 flex items-center gap-2.5">
            <h2 className="text-[11px] font-semibold uppercase tracking-widest text-slate-400">
              This week
            </h2>
          </div>
          <div className="flex flex-col gap-2">
            {workouts.map((w) => (
              <PlannedWorkoutCard key={`${w.date}-${w.name}`} workout={w} />
            ))}
          </div>
        </section>
      )}

      {/* AI week suggestions */}
      {suggestions && (
        <section>
          <div className="mb-3 flex items-center gap-2.5">
            <h2 className="text-[11px] font-semibold uppercase tracking-widest text-slate-400">
              {workouts.length > 0 ? "AI coach" : "AI suggested week"}
            </h2>
            <span className="rounded-full bg-violet-50 px-2 py-0.5 text-[10px] font-semibold text-violet-600">
              AI
            </span>
          </div>
          <p className="mb-3 text-sm text-slate-500">{suggestions.overview}</p>
          <div className="flex flex-col gap-2">
            {suggestions.days.map((d) => (
              <SuggestionCard key={d.date} day={d} />
            ))}
          </div>
        </section>
      )}
    </main>
  );
}

const DAY_NAMES = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

function PlannedWorkoutCard({ workout: w }: { workout: PlannedWorkout }) {
  const dayName = DAY_NAMES[new Date(`${w.date}T00:00:00`).getDay()];
  const duration = fmtDuration(w.plannedDurationSec);
  return (
    <div className="rounded-2xl border border-slate-100 bg-white px-4 py-3.5">
      <div className="flex items-start gap-4">
        <div className="w-9 shrink-0 text-center">
          <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">{dayName}</p>
          <p className="text-sm font-bold text-slate-900">{w.date.slice(8)}</p>
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-medium text-slate-900">{w.name}</p>
          <div className="mt-0.5 flex gap-3 text-xs text-slate-400">
            {w.type && <span>{w.type}</span>}
            {duration && <span>{duration}</span>}
            {w.plannedLoad != null && w.plannedLoad > 0 && (
              <span className="font-semibold text-slate-500">load {Math.round(w.plannedLoad)}</span>
            )}
          </div>
          {w.description && (
            <>
              <p className="mt-1 text-xs leading-relaxed text-slate-400">{w.description}</p>
              <WorkoutBars description={w.description} />
            </>
          )}
        </div>
      </div>
    </div>
  );
}

function SuggestionCard({ day: d }: { day: AiDaySuggestion }) {
  const dayName = DAY_NAMES[new Date(`${d.date}T00:00:00`).getDay()];
  const duration = fmtDuration(d.plannedDurationSec);
  const isRest = d.type === "Rest" || d.plannedLoad === 0;
  return (
    <div className="flex items-start gap-4 rounded-2xl border border-dashed border-slate-200 bg-white px-4 py-3.5">
      <div className="w-9 shrink-0 text-center">
        <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">{dayName}</p>
        <p className="text-sm font-bold text-slate-900">{d.date.slice(8)}</p>
      </div>
      <div className="min-w-0 flex-1">
        <p className={`text-sm font-medium ${isRest ? "text-slate-400" : "text-slate-900"}`}>
          {d.name}
        </p>
        <p className="mt-0.5 text-xs leading-relaxed text-slate-400">{d.rationale}</p>
      </div>
      {!isRest && (
        <div className="flex shrink-0 flex-col items-end gap-2">
          <div className="flex gap-3 text-xs text-slate-400">
            {duration && <span>{duration}</span>}
            {d.plannedLoad > 0 && (
              <span className="font-semibold text-slate-600">
                load {Math.round(d.plannedLoad)}
              </span>
            )}
          </div>
          <AcceptButton day={d} />
        </div>
      )}
    </div>
  );
}

function WellnessCard({ label, value, color }: { label: string; value: string | null; color: string }) {
  return (
    <div className="rounded-2xl border border-slate-100 bg-white px-4 py-4">
      <p className="text-[11px] font-semibold uppercase tracking-widest text-slate-400">{label}</p>
      <p className={`mt-1.5 text-lg font-bold tabular-nums ${value ? color : "text-slate-200"}`}>
        {value ?? "—"}
      </p>
    </div>
  );
}

function EmptyState({ title, message }: { title: string; message: string }) {
  return (
    <main className="flex min-h-[60dvh] flex-col items-center justify-center gap-3 text-center">
      <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-100">
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#94A3B8" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
          <polyline points="22 12 18 12 15 21 9 3 6 12 2 12" />
        </svg>
      </div>
      <h1 className="text-base font-semibold text-slate-900">{title}</h1>
      <p className="max-w-xs text-sm text-slate-400">{message}</p>
    </main>
  );
}
