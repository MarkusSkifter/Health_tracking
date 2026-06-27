"use client";

import type { Activity, AnalyticsDay } from "@health/shared";
import { useState } from "react";
import { LineChart } from "./LineChart";

function formatSleep(sec: number): string {
  const h = Math.floor(sec / 3600);
  const m = Math.floor((sec % 3600) / 60);
  return m > 0 ? `${h}h ${m}m` : `${h}h`;
}

function fmtPace(secPerKm: number): string {
  const m = Math.floor(secPerKm / 60);
  const s = Math.round(secPerKm % 60);
  return `${m}:${String(s).padStart(2, "0")}`;
}

function mmdd(iso: string): string {
  return iso.slice(5).replace("-", "/");
}

function avg(arr: number[]): number | null {
  return arr.length > 0 ? arr.reduce((a, b) => a + b, 0) / arr.length : null;
}

const CHARTS: Array<{
  key: keyof AnalyticsDay;
  title: string;
  color: string;
  unit: string;
  format?: (v: number) => string;
}> = [
  { key: "trainingLoadDaily", title: "Training load", color: "var(--signal)", unit: "", format: (v) => Math.round(v).toString() },
  { key: "hrv", title: "HRV", color: "var(--ctl)", unit: " ms", format: (v) => Math.round(v).toString() },
  { key: "restingHr", title: "Resting HR", color: "var(--ink-2)", unit: " bpm", format: (v) => Math.round(v).toString() },
  { key: "sleepSec", title: "Sleep", color: "var(--ink-2)", unit: "", format: formatSleep },
  { key: "steps", title: "Steps", color: "var(--ink-2)", unit: "", format: (v) => Math.round(v).toLocaleString("en-GB") },
  { key: "weightKg", title: "Weight", color: "var(--ink-2)", unit: " kg", format: (v) => v.toFixed(1) },
];

const RUN_TYPES = new Set(["Run", "VirtualRun", "TrailRun", "Treadmill"]);
const RIDE_TYPES = new Set(["Ride", "VirtualRide", "GravelRide", "MountainBikeRide", "EBikeRide", "Cycling"]);

function computeStats(days: AnalyticsDay[], activityList: Activity[], sel: { start: number; end: number }) {
  const lo = Math.min(sel.start, sel.end);
  const hi = Math.max(sel.start, sel.end);
  const fromDate = days[lo]?.date ?? "";
  const toDate = days[hi]?.date ?? "";
  const acts = activityList.filter((a) => a.date >= fromDate && a.date <= toDate);

  const avgHr = avg(acts.map((a) => a.avgHr).filter((v): v is number => v !== null));
  const avgWatts = avg(acts.map((a) => a.avgPower).filter((v): v is number => v !== null));

  const runPaces = acts
    .filter((a) => RUN_TYPES.has(a.type) && a.distanceM != null && a.distanceM > 0 && a.durationSec != null)
    .map((a) => (a.durationSec! / a.distanceM!) * 1000);
  const rideSpeedsMps = acts
    .filter((a) => RIDE_TYPES.has(a.type) && a.distanceM != null && a.durationSec != null && a.durationSec > 0)
    .map((a) => (a.distanceM! / a.durationSec!) * 3.6);

  return {
    fromDate,
    toDate,
    days: hi - lo + 1,
    activityCount: acts.length,
    avgHr,
    avgWatts,
    avgRunPace: avg(runPaces),
    avgRideSpeed: avg(rideSpeedsMps),
  };
}

function StatCell({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="lx-eyebrow" style={{ fontSize: 9, marginBottom: 2, color: "var(--ink-3)" }}>{label}</p>
      <p className="lx-num text-sm" style={{ fontWeight: 600, color: "var(--ink)" }}>{value}</p>
    </div>
  );
}

export function AnalyticsCharts({ days, activityList }: { days: AnalyticsDay[]; activityList: Activity[] }) {
  const [isDragging, setIsDragging] = useState(false);
  const [selection, setSelection] = useState<{ start: number; end: number } | null>(null);

  const handleRangeStart = (idx: number) => {
    setIsDragging(true);
    setSelection({ start: idx, end: idx });
  };
  const handleRangeUpdate = (idx: number) => {
    if (!isDragging) return;
    setSelection((s) => (s ? { ...s, end: idx } : { start: idx, end: idx }));
  };
  const handleRangeEnd = () => setIsDragging(false);

  const stats = selection ? computeStats(days, activityList, selection) : null;
  const noStats = stats && stats.avgHr === null && stats.avgWatts === null && stats.avgRunPace === null && stats.avgRideSpeed === null;

  return (
    <div>
      <div
        className="grid gap-px sm:grid-cols-2 xl:grid-cols-3"
        style={{ background: "var(--line)", border: "1px solid var(--line)", borderRadius: "var(--radius)" }}
      >
        {CHARTS.map((c) => {
          const data = days.map((d) => ({ date: d.date, value: d[c.key] as number | null }));
          const validValues = data.map((d) => d.value).filter((v): v is number => v !== null);
          const latest = validValues.at(-1);
          const latestFormatted = latest !== undefined ? `${c.format ? c.format(latest) : Math.round(latest)}${c.unit}` : "—";

          return (
            <div key={String(c.key)} className="p-5" style={{ background: "var(--paper-2)" }}>
              <div className="mb-4 flex items-baseline justify-between">
                <p className="lx-eyebrow">{c.title}</p>
                <p className="lx-num text-base" style={{ fontWeight: 600, color: latest !== undefined ? c.color : "var(--ink-4)" }}>
                  {latestFormatted}
                </p>
              </div>
              <LineChart
                data={data}
                color={c.color}
                height={80}
                format={c.format}
                unit={c.unit}
                selectionStart={selection?.start ?? null}
                selectionEnd={selection?.end ?? null}
                onRangeStart={handleRangeStart}
                onRangeUpdate={handleRangeUpdate}
                onRangeEnd={handleRangeEnd}
              />
            </div>
          );
        })}
      </div>

      {stats && (
        <div
          className="mt-2 flex flex-wrap items-center gap-x-8 gap-y-3 px-5 py-4"
          style={{ background: "var(--paper-2)", border: "1px solid var(--line)", borderRadius: "var(--radius)" }}
        >
          <div className="flex items-baseline gap-3">
            <p className="lx-eyebrow shrink-0">{mmdd(stats.fromDate)} – {mmdd(stats.toDate)}</p>
            <span className="lx-mono text-xs" style={{ color: "var(--ink-4)" }}>
              {stats.days}d · {stats.activityCount} session{stats.activityCount !== 1 ? "s" : ""}
            </span>
          </div>

          <div className="flex flex-1 flex-wrap gap-x-8 gap-y-1">
            {stats.avgHr !== null && <StatCell label="Avg HR" value={`${Math.round(stats.avgHr)} bpm`} />}
            {stats.avgWatts !== null && <StatCell label="Avg power" value={`${Math.round(stats.avgWatts)} w`} />}
            {stats.avgRunPace !== null && <StatCell label="Avg run pace" value={`${fmtPace(stats.avgRunPace)} /km`} />}
            {stats.avgRideSpeed !== null && <StatCell label="Avg ride speed" value={`${stats.avgRideSpeed.toFixed(1)} km/h`} />}
            {noStats && (
              <span className="lx-mono text-xs" style={{ color: "var(--ink-4)" }}>No activity data in this range</span>
            )}
          </div>

          <button
            className="lx-mono text-xs shrink-0"
            style={{ color: "var(--ink-4)" }}
            onClick={() => setSelection(null)}
          >
            ✕ clear
          </button>
        </div>
      )}
    </div>
  );
}
