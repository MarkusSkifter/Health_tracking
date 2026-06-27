import type { AiWeekPlan, AnalyticsDay, PlannedWorkout, TodayResponse, TrainingGoal } from "@health/shared";
import { fetchAnalytics, fetchGoals, fetchToday, fetchUpcoming } from "../lib/api";
import { LedgerDashboard, type LedgerData } from "./components/ledger/LedgerDashboard";
import { buildFitnessSeries, computeReadiness, densifyLoads, readinessVerdict, type FitnessPoint } from "./components/ledger/fitness";
import { classifySession, shortDay, type IntensityKey } from "./components/ledger/shared";
import type { VitalTile } from "./components/ledger/VitalsMatrix";
import type { RibbonDay } from "./components/ledger/WeekRibbon";
import type { MacroWeek } from "./components/ledger/Macrocycle";

export const revalidate = 60;

function iso(d: Date): string {
  return d.toISOString().slice(0, 10);
}
function addDays(isoDate: string, n: number): string {
  const d = new Date(`${isoDate}T00:00:00`);
  d.setDate(d.getDate() + n);
  return iso(d);
}
function mondayOf(isoDate: string): string {
  const d = new Date(`${isoDate}T00:00:00`);
  const dow = (d.getDay() + 6) % 7;
  d.setDate(d.getDate() - dow);
  return iso(d);
}
function firstSentence(text: string): string {
  const m = text.match(/^.*?[.!?](\s|$)/);
  const s = (m ? m[0] : text).trim();
  return s.length > 180 ? `${s.slice(0, 177)}…` : s;
}

export default async function TodayPage() {
  const todayIso = iso(new Date());

  let today: TodayResponse | null;
  let workouts: PlannedWorkout[] = [];
  let suggestions: AiWeekPlan | null = null;
  let analytics: AnalyticsDay[] = [];
  let goals: (TrainingGoal & { isPast: boolean })[] = [];

  try {
    const [todayRes, upcoming, analyticsRes, goalsRes] = await Promise.all([
      fetchToday(),
      fetchUpcoming(),
      fetchAnalytics(addDays(todayIso, -130), todayIso).catch(() => [] as AnalyticsDay[]),
      fetchGoals().catch(() => []),
    ]);
    today = todayRes;
    workouts = upcoming.workouts;
    suggestions = upcoming.suggestions;
    analytics = analyticsRes;
    goals = goalsRes;
  } catch {
    return <LedgerEmpty title="No signal from the server" message="The training API isn't responding. Check the connection and try again." />;
  }

  if (!today) {
    return <LedgerEmpty title="Awaiting the first entry" message="Run a sync to record your first day in the ledger." />;
  }

  const { summary, wellness } = today;

  // ---- Planned load (real workouts first, AI suggestions fill gaps) ----
  const plannedByDate = new Map<string, number>();
  for (const w of workouts) {
    if (w.plannedLoad && w.plannedLoad > 0) plannedByDate.set(w.date, (plannedByDate.get(w.date) ?? 0) + w.plannedLoad);
  }
  if (suggestions) {
    for (const d of suggestions.days) {
      if (!plannedByDate.has(d.date) && d.plannedLoad > 0) plannedByDate.set(d.date, d.plannedLoad);
    }
  }

  // ---- Fitness series (CTL/ATL/TSB), real load + projection ----
  const loadByDate = new Map<string, number>();
  for (const d of analytics) loadByDate.set(d.date, d.trainingLoadDaily ?? 0);
  const history = densifyLoads(loadByDate, addDays(todayIso, -120), todayIso);
  const fullFitness = buildFitnessSeries(history, plannedByDate, 28);
  const fitness: FitnessPoint[] = fullFitness.slice(Math.max(0, fullFitness.length - (90 + 28)));
  const todayPoint = [...fitness].reverse().find((p) => !p.projected) ?? fitness[fitness.length - 1];
  const tsb = todayPoint?.tsb ?? 0;

  const acr = summary.acuteChronicRatio;
  const readiness = computeReadiness(tsb, acr);

  // ---- Header ----
  const sumDate = new Date(`${summary.date}T00:00:00`);
  const weekday = new Intl.DateTimeFormat("en-GB", { weekday: "long" }).format(sumDate);
  const dateLong = new Intl.DateTimeFormat("en-GB", { day: "numeric", month: "long", year: "numeric" }).format(sumDate);

  const header = {
    dateLong,
    weekday,
    readiness,
    verdict: readinessVerdict(readiness),
    strain: summary.trainingLoadDaily,
    acr,
    tsb,
    coachLine: summary.aiSummaryText ? firstSentence(summary.aiSummaryText) : null,
  };

  // ---- Next session ----
  const upcomingWorkout = workouts
    .filter((w) => w.date >= todayIso)
    .sort((a, b) => a.date.localeCompare(b.date))[0];
  const upcomingSuggestion = suggestions?.days
    .filter((d) => d.date >= todayIso && d.plannedLoad > 0 && d.type !== "Rest")
    .sort((a, b) => a.date.localeCompare(b.date))[0];

  const nextSession = upcomingWorkout
    ? {
        name: upcomingWorkout.name,
        type: upcomingWorkout.type,
        dateLong: longSession(upcomingWorkout.date),
        tss: upcomingWorkout.plannedLoad,
        durationSec: upcomingWorkout.plannedDurationSec,
        description: upcomingWorkout.description,
        rationale: null,
        isSuggestion: false,
      }
    : upcomingSuggestion
      ? {
          name: upcomingSuggestion.name,
          type: upcomingSuggestion.type,
          dateLong: longSession(upcomingSuggestion.date),
          tss: upcomingSuggestion.plannedLoad,
          durationSec: upcomingSuggestion.plannedDurationSec,
          description: upcomingSuggestion.description ?? null,
          rationale: upcomingSuggestion.rationale,
          isSuggestion: true,
        }
      : null;

  // ---- Vitals matrix (12 tiles) ----
  const recent = analytics.slice(-28);
  const fitTail = fitness.filter((p) => !p.projected).slice(-28);
  const vitals: VitalTile[] = [
    vitalTile("HRV", "ms", recent, (d) => d.hrv, true),
    vitalTile("Resting HR", "bpm", recent, (d) => d.restingHr, false),
    sleepTile(recent),
    vitalTile("Steps", "", recent, (d) => d.steps, true, (v) => Math.round(v).toLocaleString("en-GB")),
    vitalTile("Weight", "kg", recent, (d) => d.weightKg, null, (v) => v.toFixed(1)),
    vitalTile("Training load", "", recent, (d) => d.trainingLoadDaily, null, (v) => Math.round(v).toString()),
    seriesTile("Fitness", "ctl", fitTail.map((p) => p.ctl), true),
    seriesTile("Fatigue", "atl", fitTail.map((p) => p.atl), null),
    seriesTile("Form", "tsb", fitTail.map((p) => p.tsb), null, true),
    seriesTile("Acute:chronic", "", fitTail.map((_, i) => recent[recent.length - fitTail.length + i]?.acuteChronicRatio ?? acr), null, false, (v) => v.toFixed(2)),
    simTile("SpO₂", "%", 96, 98, 0),
    simTile("Respiration", "brpm", 12, 15, 1),
  ];

  // ---- Week ahead ribbon ----
  const ribbon: RibbonDay[] = Array.from({ length: 7 }, (_, i) => {
    const date = addDays(todayIso, i);
    const w = workouts.find((x) => x.date === date);
    const sug = suggestions?.days.find((x) => x.date === date);
    const name = w?.name ?? sug?.name ?? null;
    const type = w?.type ?? sug?.type ?? null;
    const load = w?.plannedLoad ?? sug?.plannedLoad ?? null;
    const durationSec = w?.plannedDurationSec ?? sug?.plannedDurationSec ?? null;
    const key: IntensityKey = name || load ? classifySession({ name, type, load, durationSec }) : "rest";
    return {
      dateIso: date,
      dayName: shortDay(date),
      dayNum: date.slice(8),
      isToday: i === 0,
      sessionName: key === "rest" ? null : name,
      intensityKey: key,
      durationSec,
    };
  });

  // ---- Macrocycle (weekly ramp: 8 past + current + 3 future) ----
  const goal = goals.find((g) => !g.isPast) ?? null;
  const macro: MacroWeek[] = buildMacro(loadByDate, plannedByDate, todayIso);
  const goalInfo = goal ? goalContext(goal, todayIso) : null;

  // ---- Device ticker ----
  const ticker = [
    "intervals.icu · connected",
    `last entry · ${summary.date}`,
    "coros · linked",
    `ctl ${Math.round(todayPoint?.ctl ?? 0)} · atl ${Math.round(todayPoint?.atl ?? 0)} · tsb ${tsb >= 0 ? "+" : ""}${Math.round(tsb)}`,
    `readiness ${readiness}/100`,
    "hrv sensor · ok",
    "gps · 3m accuracy",
  ];

  const data: LedgerData = {
    header,
    nextSession,
    fitness,
    vitals,
    ribbon,
    macro,
    goal: goalInfo,
    ticker,
  };

  return <LedgerDashboard data={data} />;
}

// ---------- helpers ----------

function longSession(isoDate: string): string {
  return new Intl.DateTimeFormat("en-GB", { weekday: "short", day: "numeric", month: "long" }).format(new Date(`${isoDate}T00:00:00`));
}

function vitalTile(
  label: string,
  unit: string,
  days: AnalyticsDay[],
  pick: (d: AnalyticsDay) => number | null,
  favorableUp: boolean | null,
  fmt: (v: number) => string = (v) => Math.round(v).toString(),
): VitalTile {
  const series = days.map(pick).filter((v): v is number => v != null);
  const latest = series.at(-1);
  const prior = series.length > 7 ? series[series.length - 8] : series[0];
  let delta: VitalTile["delta"] = null;
  if (latest != null && prior != null && prior !== latest) {
    const diff = latest - prior;
    const up = diff > 0;
    const favorable = favorableUp == null ? null : up === favorableUp;
    delta = { text: `${up ? "▲" : "▼"} ${fmt(Math.abs(diff))} vs 7d`, favorable };
  }
  return { label, unit, value: latest != null ? fmt(latest) : "—", series, delta, sim: false };
}

function sleepTile(days: AnalyticsDay[]): VitalTile {
  const series = days.map((d) => d.sleepSec).filter((v): v is number => v != null).map((s) => s / 3600);
  const latest = series.at(-1);
  const fmtH = (h: number) => {
    const hh = Math.floor(h);
    const mm = Math.round((h - hh) * 60);
    return mm > 0 ? `${hh}h ${mm}m` : `${hh}h`;
  };
  const prior = series.length > 7 ? series[series.length - 8] : series[0];
  let delta: VitalTile["delta"] = null;
  if (latest != null && prior != null) {
    const diff = latest - prior;
    delta = { text: `${diff >= 0 ? "▲" : "▼"} ${Math.abs(diff).toFixed(1)}h vs 7d`, favorable: diff >= 0 };
  }
  return { label: "Sleep", unit: "", value: latest != null ? fmtH(latest) : "—", series, delta, sim: false };
}

function seriesTile(
  label: string,
  unit: string,
  series: number[],
  favorableUp: boolean | null,
  signed = false,
  fmt: (v: number) => string = (v) => Math.round(v).toString(),
): VitalTile {
  const latest = series.at(-1);
  const prior = series.length > 7 ? series[series.length - 8] : series[0];
  let delta: VitalTile["delta"] = null;
  if (latest != null && prior != null && prior !== latest) {
    const diff = latest - prior;
    const up = diff > 0;
    const favorable = favorableUp == null ? null : up === favorableUp;
    delta = { text: `${up ? "▲" : "▼"} ${fmt(Math.abs(diff))} vs 7d`, favorable };
  }
  const value = latest != null ? `${signed && latest >= 0 ? "+" : ""}${fmt(latest)}` : "—";
  return { label, unit, value, series, delta, sim: false };
}

function simTile(label: string, unit: string, lo: number, hi: number, decimals: number): VitalTile {
  // Deterministic gentle wander so the SIM tiles look alive without RNG.
  const series = Array.from({ length: 20 }, (_, i) => {
    const t = i / 19;
    const v = lo + (hi - lo) * (0.5 + 0.5 * Math.sin(t * Math.PI * 2 + label.length));
    return Number(v.toFixed(decimals));
  });
  const latest = series.at(-1)!;
  return {
    label,
    unit,
    value: latest.toFixed(decimals),
    series,
    delta: { text: "estimated", favorable: null },
    sim: true,
  };
}

function buildMacro(loadByDate: Map<string, number>, plannedByDate: Map<string, number>, todayIso: string): MacroWeek[] {
  const curMonday = mondayOf(todayIso);
  const weeks: MacroWeek[] = [];
  for (let offset = -8; offset <= 3; offset++) {
    const start = addDays(curMonday, offset * 7);
    let total = 0;
    let peakDay = 0;
    for (let d = 0; d < 7; d++) {
      const day = addDays(start, d);
      const v = day <= todayIso ? (loadByDate.get(day) ?? 0) : (plannedByDate.get(day) ?? 0);
      total += v;
      peakDay = Math.max(peakDay, v);
    }
    const isCurrent = offset === 0;
    const isFuture = start > todayIso;
    const key = total === 0 ? "rest" : classifySession({ load: peakDay });
    const sd = new Date(`${start}T00:00:00`);
    weeks.push({
      label: `${sd.getDate()}/${sd.getMonth() + 1}`,
      totalLoad: total,
      intensityKey: key,
      isFuture,
      isCurrent,
    });
  }
  return weeks;
}

function goalContext(goal: TrainingGoal & { isPast: boolean }, todayIso: string): { eventName: string; daysOut: number; phase: string } {
  const days = Math.round((new Date(`${goal.targetDate}T00:00:00`).getTime() - new Date(`${todayIso}T00:00:00`).getTime()) / 86400000);
  const weeks = days / 7;
  const phase = weeks > 16 ? "Base" : weeks > 8 ? "Build" : weeks > 4 ? "Peak" : weeks > 2 ? "Taper" : days >= 0 ? "Race week" : "Past";
  return { eventName: goal.eventName, daysOut: Math.max(0, days), phase };
}

function LedgerEmpty({ title, message }: { title: string; message: string }) {
  return (
    <div className="ledger flex min-h-dvh flex-col items-center justify-center px-6 text-center">
      <p className="lx-eyebrow" style={{ color: "var(--signal-ink)" }}>Gamman</p>
      <h1 className="lx-serif mt-3" style={{ fontSize: "clamp(34px, 7vw, 56px)", fontWeight: 600, color: "var(--ink)" }}>{title}</h1>
      <p className="lx-sans mt-3 max-w-sm text-[15px]" style={{ color: "var(--ink-2)" }}>{message}</p>
    </div>
  );
}
