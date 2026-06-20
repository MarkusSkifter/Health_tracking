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
    color: "#0a0a0a",
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
    color: "#e11d48",
    unit: " bpm",
    format: (v) => Math.round(v).toString(),
  },
  {
    key: "sleepSec",
    title: "Sleep",
    color: "#7c3aed",
    unit: "",
    format: formatSleep,
  },
  {
    key: "steps",
    title: "Steps",
    color: "#d97706",
    unit: "",
    format: (v) => Math.round(v).toLocaleString("en-GB"),
  },
  {
    key: "weightKg",
    title: "Weight",
    color: "#64748b",
    unit: " kg",
    format: (v) => v.toFixed(1),
  },
];

export function AnalyticsCharts({ days }: { days: AnalyticsDay[] }) {
  return (
    <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
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
            className="rounded-2xl border border-neutral-100 bg-white p-5"
          >
            <div className="mb-3 flex items-baseline justify-between">
              <p className="text-xs font-medium uppercase tracking-wider text-neutral-400">
                {c.title}
              </p>
              <p
                className="text-base font-semibold tabular-nums"
                style={{ color: latest !== undefined ? c.color : "#d4d4d4" }}
              >
                {latestFormatted}
              </p>
            </div>
            <LineChart
              data={data}
              color={c.color}
              height={90}
              format={c.format}
              unit={c.unit}
            />
          </div>
        );
      })}
    </div>
  );
}
