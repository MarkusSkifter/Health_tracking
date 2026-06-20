import type { AiDaySuggestion, AiWeekPlan, PlannedWorkout, TodayResponse } from "@health/shared";
import { fetchToday, fetchUpcoming } from "../lib/api";
import { AcrBadge } from "./components/AcrBadge";
import { Sparkline } from "./components/Sparkline";
import { SyncButton } from "./components/SyncButton";

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
  let today: TodayResponse | null;
  let workouts: PlannedWorkout[];
  let suggestions: AiWeekPlan | null;
  try {
    const [todayResult, upcomingResult] = await Promise.all([
      fetchToday(),
      fetchUpcoming(),
    ]);
    today = todayResult;
    workouts = upcomingResult.workouts;
    suggestions = upcomingResult.suggestions;
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
    <main className="flex flex-col gap-10">
      <header className="flex items-start justify-between gap-4">
        <div>
          <p className="text-xs font-medium uppercase tracking-[0.18em] text-neutral-400">
            Today
          </p>
          <h1 className="mt-1 text-2xl font-semibold tracking-tight">
            {longDate(summary.date)}
          </h1>
        </div>
        <SyncButton />
      </header>

      <div className="grid gap-8 lg:grid-cols-[1fr_220px]">
        <div className="flex flex-col gap-8">
          <section className="flex items-end gap-6">
            <div>
              <p className="text-7xl font-semibold tabular-nums tracking-tight leading-none">
                {Math.round(summary.trainingLoadDaily)}
              </p>
              <p className="mt-2 text-sm text-neutral-500">Training load today</p>
            </div>
            <AcrBadge ratio={summary.acuteChronicRatio} />
          </section>

          <section>
            <Sparkline values={trend.map((t) => t.trainingLoadDaily)} />
            <div className="mt-1.5 flex justify-between text-xs text-neutral-400">
              <span>7-day {Math.round(summary.load7d)}</span>
              <span>28-day {Math.round(summary.load28d)}</span>
            </div>
          </section>

          <section>
            <p className="text-[15px] leading-relaxed text-neutral-700">
              {summary.aiSummaryText}
            </p>
          </section>
        </div>

        {wellness && (
          <aside className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-1 lg:content-start">
            <WellnessCard
              label="HRV"
              value={wellness.hrv !== null ? `${Math.round(wellness.hrv)} ms` : null}
              color="text-emerald-600"
            />
            <WellnessCard
              label="Resting HR"
              value={wellness.restingHr !== null ? `${wellness.restingHr} bpm` : null}
              color="text-rose-600"
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
          </aside>
        )}
      </div>

      <section>
        <div className="mb-3 flex items-center gap-3">
          <h2 className="text-xs font-medium uppercase tracking-[0.18em] text-neutral-400">
            This Week
          </h2>
          {workouts.length === 0 && suggestions && (
            <span className="rounded-full bg-violet-50 px-2 py-0.5 text-[10px] font-medium text-violet-600">
              AI suggested
            </span>
          )}
        </div>

        {workouts.length > 0 ? (
          <div className="flex flex-col gap-2">
            {workouts.map((w) => (
              <WorkoutCard key={`${w.date}-${w.name}`} workout={w} />
            ))}
          </div>
        ) : suggestions ? (
          <div className="flex flex-col gap-3">
            <p className="text-sm text-neutral-500">{suggestions.overview}</p>
            <div className="flex flex-col gap-2">
              {suggestions.days.map((d) => (
                <SuggestionCard key={d.date} day={d} />
              ))}
            </div>
          </div>
        ) : (
          <p className="text-sm text-neutral-400">No workouts scheduled this week.</p>
        )}
      </section>
    </main>
  );
}

const DAY_NAMES = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

function WorkoutCard({ workout: w }: { workout: PlannedWorkout }) {
  const day = DAY_NAMES[new Date(`${w.date}T00:00:00`).getDay()];
  const duration = fmtDuration(w.plannedDurationSec);
  return (
    <div className="flex items-center gap-4 rounded-xl border border-neutral-100 bg-neutral-50 px-4 py-3">
      <div className="w-8 shrink-0 text-center">
        <p className="text-xs font-medium text-neutral-400">{day}</p>
        <p className="text-sm font-semibold text-neutral-900">{w.date.slice(8)}</p>
      </div>
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium text-neutral-900">{w.name}</p>
        {w.type && w.type !== w.name && (
          <p className="text-xs text-neutral-400">{w.type}</p>
        )}
      </div>
      <div className="flex shrink-0 gap-3 text-right text-xs text-neutral-500">
        {duration && <span>{duration}</span>}
        {w.plannedLoad != null && (
          <span className="font-medium text-neutral-700">
            load {Math.round(w.plannedLoad)}
          </span>
        )}
      </div>
    </div>
  );
}

function SuggestionCard({ day: d }: { day: AiDaySuggestion }) {
  const dayName = DAY_NAMES[new Date(`${d.date}T00:00:00`).getDay()];
  const duration = fmtDuration(d.plannedDurationSec);
  const isRest = d.type === "Rest" || d.plannedLoad === 0;
  return (
    <div className="flex items-start gap-4 rounded-xl border border-dashed border-neutral-200 bg-white px-4 py-3">
      <div className="w-8 shrink-0 text-center">
        <p className="text-xs font-medium text-neutral-400">{dayName}</p>
        <p className="text-sm font-semibold text-neutral-900">{d.date.slice(8)}</p>
      </div>
      <div className="min-w-0 flex-1">
        <p className={`text-sm font-medium ${isRest ? "text-neutral-400" : "text-neutral-900"}`}>
          {d.name}
        </p>
        <p className="mt-0.5 text-xs text-neutral-400">{d.rationale}</p>
      </div>
      {!isRest && (
        <div className="flex shrink-0 gap-3 text-right text-xs text-neutral-500">
          {duration && <span>{duration}</span>}
          {d.plannedLoad > 0 && (
            <span className="font-medium text-neutral-700">
              load {Math.round(d.plannedLoad)}
            </span>
          )}
        </div>
      )}
    </div>
  );
}

function WellnessCard({ label, value, color }: { label: string; value: string | null; color: string }) {
  return (
    <div className="rounded-xl border border-neutral-100 bg-neutral-50 px-4 py-3">
      <p className="text-xs text-neutral-400">{label}</p>
      <p className={`mt-0.5 text-lg font-semibold tabular-nums ${value ? color : "text-neutral-300"}`}>
        {value ?? "—"}
      </p>
    </div>
  );
}

function EmptyState({ title, message }: { title: string; message: string }) {
  return (
    <main className="flex min-h-[60dvh] flex-col items-center justify-center gap-2 text-center">
      <h1 className="text-lg font-semibold">{title}</h1>
      <p className="max-w-xs text-sm text-neutral-500">{message}</p>
    </main>
  );
}
