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
  {
    key: "trainingLoadDaily",
    title: "Training Load",
    color: "#2563EB",
    unit: "",
    format: (v) => Math.round(v).toString(),
  },
  {
    key: "hrv",
    title: "HRV",
    color: "#059669",
    unit: " ms",
    format: (v) => Math.round(v).toString(),
  },
  {
    key: "restingHr",
    title: "Resting HR",
    color: "#E11D48",
    unit: " bpm",
    format: (v) => Math.round(v).toString(),
  },
  {
    key: "sleepSec",
    title: "Sleep",
    color: "#7C3AED",
    unit: "",
    format: formatSleep,
  },
  {
    key: "steps",
    title: "Steps",
    color: "#D97706",
    unit: "",
    format: (v) => Math.round(v).toLocaleString("en-GB"),
  },
  {
    key: "weightKg",
    title: "Weight",
    color: "#64748B",
    unit: " kg",
    format: (v) => v.toFixed(1),
  },
];

export function AnalyticsCharts({ days }: { days: AnalyticsDay[] }) {
  return (
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
      {CHARTS.map((c) => {
        const data = days.map((d) => ({
          date: d.date,
          value: d[c.key] as number | null,
        }));
        const validValues = data
          .map((d) => d.value)
          .filter((v): v is number => v !== null);
        const latest = validValues.at(-1);
        const latestFormatted =
          latest !== undefined
            ? `${c.format ? c.format(latest) : Math.round(latest)}${c.unit}`
            : "—";

        return (
          <div
            key={String(c.key)}
            className="rounded-2xl border border-slate-100 bg-white p-5"
          >
            <div className="mb-4 flex items-baseline justify-between">
              <p className="text-[11px] font-semibold uppercase tracking-widest text-slate-400">
                {c.title}
              </p>
              <p
                className="text-base font-bold tabular-nums"
                style={{ color: latest !== undefined ? c.color : "#CBD5E1" }}
              >
                {latestFormatted}
              </p>
            </div>
            <LineChart
              data={data}
              color={c.color}
              height={80}
              format={c.format}
              unit={c.unit}
            />
          </div>
        );
      })}
    </div>
  );
}
