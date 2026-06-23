import type { AiWeekPlan, AnalyticsDay, PlannedWorkout } from "@health/shared";
import { fetchAnalytics, fetchUpcoming } from "../../lib/api";
import type { AcrPoint } from "./AcrChartClient";
import { AcrChartClient } from "./AcrChartClient";

function isoToday(): string {
  return new Date().toISOString().slice(0, 10);
}

function addDays(iso: string, n: number): string {
  const d = new Date(`${iso}T00:00:00`);
  d.setDate(d.getDate() + n);
  return d.toISOString().slice(0, 10);
}

function zoneLabel(acr: number): string {
  if (acr > 1.5) return "Very high";
  if (acr > 1.3) return "Elevated";
  if (acr >= 0.8) return "Optimal";
  return "Detraining";
}

function zoneColor(acr: number): string {
  if (acr > 1.5) return "#F87171";
  if (acr > 1.3) return "#FCD34D";
  if (acr >= 0.8) return "#5DCAA5";
  return "rgba(255,255,255,0.4)";
}

export async function AcrProjectionChart() {
  const today = isoToday();
  const histFrom = addDays(today, -42);

  const [history, upcoming]: [AnalyticsDay[], { workouts: PlannedWorkout[]; suggestions: AiWeekPlan | null }] =
    await Promise.all([
      fetchAnalytics(histFrom, today).catch(() => [] as AnalyticsDay[]),
      fetchUpcoming(),
    ]);

  if (!history.length) return null;

  // daily load map for rolling buffer
  const loadMap = new Map<string, number>(
    history.map(d => [d.date, d.trainingLoadDaily ?? 0])
  );

  // 28-day rolling buffer (oldest → newest, ending at today)
  const buffer: number[] = [];
  for (let i = 27; i >= 0; i--) {
    buffer.push(loadMap.get(addDays(today, -i)) ?? 0);
  }

  // Planned loads: real workouts first, AI suggestions fill gaps
  const plannedMap = new Map<string, number>();
  for (const w of upcoming.workouts) {
    if (w.plannedLoad != null && w.plannedLoad > 0) {
      plannedMap.set(w.date, (plannedMap.get(w.date) ?? 0) + w.plannedLoad);
    }
  }
  if (upcoming.suggestions) {
    for (const d of upcoming.suggestions.days) {
      if (!plannedMap.has(d.date) && d.plannedLoad > 0) {
        plannedMap.set(d.date, d.plannedLoad);
      }
    }
  }

  // Historical points: last 28 days with pre-computed ACR
  const cutoff = addDays(today, -27);
  const histPoints: AcrPoint[] = history
    .filter((d): d is AnalyticsDay & { acuteChronicRatio: number } =>
      d.acuteChronicRatio !== null && d.date >= cutoff
    )
    .map(d => ({ date: d.date, acr: d.acuteChronicRatio, isProjected: false }));

  // Project 14 days forward using the same rolling-average formula as the API
  const projPoints: AcrPoint[] = [];
  const buf = [...buffer];
  for (let i = 1; i <= 14; i++) {
    const date = addDays(today, i);
    const load = plannedMap.get(date) ?? 0;
    buf.push(load);
    buf.shift();
    const load7d = buf.slice(-7).reduce((a, b) => a + b, 0);
    const load28d = buf.reduce((a, b) => a + b, 0);
    const chronic = load28d / 4;
    projPoints.push({
      date,
      acr: chronic > 0 ? load7d / chronic : 0,
      isProjected: true,
      plannedLoad: load > 0 ? load : undefined,
    });
  }

  const points = [...histPoints, ...projPoints];
  if (!points.length) return null;

  const currentAcr = [...histPoints].reverse().find(p => p.date <= today)?.acr ?? null;

  return (
    <div className="glass-card rounded-2xl px-5 py-4">
      <div className="mb-3 flex items-baseline justify-between">
        <p className="text-[11px] font-semibold uppercase tracking-widest" style={{ color: "rgba(255,255,255,0.4)" }}>
          Acute:Chronic Ratio
        </p>
        {currentAcr !== null && (
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-semibold" style={{ color: zoneColor(currentAcr) }}>
              {zoneLabel(currentAcr)}
            </span>
            <span className="text-sm font-bold tabular-nums" style={{ color: zoneColor(currentAcr) }}>
              {currentAcr.toFixed(2)}
            </span>
          </div>
        )}
      </div>

      <AcrChartClient points={points} todayDate={today} />

      <p className="mt-2 text-[10px]" style={{ color: "rgba(255,255,255,0.25)" }}>
        Optimal zone 0.8–1.3 · dashed = projection based on planned workouts
      </p>
    </div>
  );
}
