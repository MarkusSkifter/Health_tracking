"use client";

import type { AnalyticsDay } from "@health/shared";
import { LineChart } from "./LineChart";

function formatSleep(sec: number): string {
  const h = Math.floor(sec / 3600);
  const m = Math.floor((sec % 3600) / 60);
  return m > 0 ? `${h}h ${m}m` : `${h}h`;
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

export function AnalyticsCharts({ days }: { days: AnalyticsDay[] }) {
  return (
    <div className="grid gap-px sm:grid-cols-2 xl:grid-cols-3" style={{ background: "var(--line)", border: "1px solid var(--line)", borderRadius: "var(--radius)" }}>
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
            <LineChart data={data} color={c.color} height={80} format={c.format} unit={c.unit} />
          </div>
        );
      })}
    </div>
  );
}
