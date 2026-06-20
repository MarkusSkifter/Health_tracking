"use client";

import type { Activity, AnalyticsDay } from "@health/shared";
import { Fragment, useRef, useState } from "react";
import { createPortal } from "react-dom";

function shortDate(iso: string): string {
  return new Intl.DateTimeFormat("en-GB", {
    weekday: "short",
    day: "numeric",
    month: "short",
  }).format(new Date(`${iso}T00:00:00`));
}

function formatSleep(sec: number): string {
  const h = Math.floor(sec / 3600);
  const m = Math.floor((sec % 3600) / 60);
  return m > 0 ? `${h}h ${m}m` : `${h}h`;
}

function formatDuration(sec: number | null): string {
  if (sec === null) return "—";
  const h = Math.floor(sec / 3600);
  const m = Math.floor((sec % 3600) / 60);
  if (h > 0) return m > 0 ? `${h}h ${m}m` : `${h}h`;
  return `${m}m`;
}

function formatDistance(meters: number | null): string {
  if (meters === null) return "";
  return `${(meters / 1000).toFixed(1)} km`;
}

function formatActivityType(type: string): string {
  return type.replace(/([A-Z])/g, " $1").trim();
}

function Th({
  label,
  tip,
  color = "text-neutral-400",
}: {
  label: string;
  tip?: string;
  color?: string;
}) {
  const [visible, setVisible] = useState(false);
  const [coords, setCoords] = useState({ x: 0, y: 0 });
  const ref = useRef<HTMLSpanElement>(null);

  function show() {
    if (ref.current) {
      const r = ref.current.getBoundingClientRect();
      setCoords({ x: r.left + r.width / 2, y: r.top });
    }
    setVisible(true);
  }

  return (
    <th className={`px-4 py-3 text-xs font-medium uppercase tracking-wider ${color}`}>
      {tip ? (
        <>
          <span
            ref={ref}
            className="inline-flex cursor-default items-center"
            onMouseEnter={show}
            onMouseLeave={() => setVisible(false)}
          >
            <span className="border-b border-dotted border-current pb-px">{label}</span>
          </span>
          {visible && typeof document !== "undefined" &&
            createPortal(
              <div
                className="pointer-events-none fixed z-50 w-52 rounded-lg bg-neutral-900 px-3 py-2 text-left text-[11px] font-normal normal-case tracking-normal text-white shadow-lg"
                style={{ left: coords.x, top: coords.y - 8, transform: "translate(-50%, -100%)" }}
              >
                {tip}
                <span className="absolute left-1/2 top-full -translate-x-1/2 border-4 border-transparent border-t-neutral-900" />
              </div>,
              document.body,
            )}
        </>
      ) : (
        label
      )}
    </th>
  );
}

function ActivityRow({ activity: a }: { activity: Activity }) {
  const metrics: Array<{ label: string; value: string; color?: string }> = [];
  if (a.avgPower !== null) metrics.push({ label: "Avg power", value: `${a.avgPower} W`, color: "text-amber-600" });
  if (a.avgHr !== null) metrics.push({ label: "Avg HR", value: `${a.avgHr} bpm`, color: "text-rose-600" });
  if (a.trainingLoad !== null) metrics.push({ label: "Load", value: Math.round(a.trainingLoad).toString() });
  if (a.distanceM !== null) metrics.push({ label: "Distance", value: formatDistance(a.distanceM) });

  return (
    <div className="flex flex-wrap items-baseline gap-x-6 gap-y-1 py-1">
      <span className="font-medium text-neutral-800">
        {formatActivityType(a.type)}
      </span>
      <span className="text-xs text-neutral-400">{formatDuration(a.durationSec)}</span>
      {metrics.map((m) => (
        <span key={m.label} className="text-xs">
          <span className="text-neutral-400">{m.label} </span>
          <span className={`font-medium tabular-nums ${m.color ?? "text-neutral-700"}`}>
            {m.value}
          </span>
        </span>
      ))}
    </div>
  );
}

export function AnalyticsDailyTable({
  days,
  activityList,
}: {
  days: AnalyticsDay[];
  activityList: Activity[];
}) {
  const [expanded, setExpanded] = useState<Set<string>>(new Set());

  function toggle(date: string) {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(date)) next.delete(date);
      else next.add(date);
      return next;
    });
  }

  // Group activities by date
  const byDate = activityList.reduce<Record<string, Activity[]>>((acc, a) => {
    (acc[a.date] ??= []).push(a);
    return acc;
  }, {});

  const sorted = days.slice().reverse();

  return (
    <div className="overflow-x-auto rounded-xl border border-neutral-100">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-neutral-100 text-left">
            <Th label="Date" />
            <Th label="Load" tip="Training load for the day, calculated from the intensity and duration of your activities." />
            <Th label="7d" tip="Rolling 7-day average training load (acute load). Reflects how much you've trained in the past week — your current fatigue level." />
            <Th label="28d" tip="Rolling 28-day average training load (chronic load). Reflects your fitness base built up over the past month." />
            <Th label="ACR" tip="Acute:Chronic Ratio — your 7-day load divided by your 28-day load. 0.8–1.3 is the sweet spot for adaptation. Above 1.5 signals a high injury risk." />
            <Th label="HRV" tip="Heart Rate Variability in milliseconds. Higher values generally mean better recovery and readiness to train hard." color="text-emerald-500" />
            <Th label="HR" tip="Resting heart rate in beats per minute. A lower resting HR typically indicates better cardiovascular fitness." color="text-rose-500" />
            <Th label="Sleep" tip="Total sleep duration for the night." color="text-violet-500" />
            <Th label="Steps" tip="Total daily step count." color="text-amber-500" />
            <Th label="Weight" color="text-slate-400" />
          </tr>
        </thead>
        <tbody>
          {sorted.map((d) => {
            const dayActivities = byDate[d.date] ?? [];
            const hasActivities = dayActivities.length > 0;
            const isExpanded = expanded.has(d.date);
            const effectiveLoad =
              d.trainingLoadDaily ??
              (dayActivities.length > 0
                ? dayActivities.reduce((sum, a) => sum + (a.trainingLoad ?? 0), 0)
                : null);

            return (
              <Fragment key={d.date}>
                <tr
                  onClick={() => hasActivities && toggle(d.date)}
                  className={`select-none border-b border-neutral-50 last:border-0 transition-colors ${
                    hasActivities
                      ? "cursor-pointer hover:bg-neutral-50"
                      : "hover:bg-neutral-50/50"
                  } ${isExpanded ? "bg-neutral-50" : ""}`}
                >
                  <td className="whitespace-nowrap px-4 py-2.5 font-medium">
                    <span className="inline-flex items-center gap-2">
                      {hasActivities && (
                        <span className="text-[10px] text-neutral-400 select-none">
                          {isExpanded ? "▾" : "▸"}
                        </span>
                      )}
                      {shortDate(d.date)}
                    </span>
                  </td>
                  <td className="px-4 py-2.5 tabular-nums">
                    {effectiveLoad !== null ? Math.round(effectiveLoad) : "—"}
                  </td>
                  <td className="px-4 py-2.5 tabular-nums text-neutral-400">
                    {d.load7d !== null ? Math.round(d.load7d) : "—"}
                  </td>
                  <td className="px-4 py-2.5 tabular-nums text-neutral-400">
                    {d.load28d !== null ? Math.round(d.load28d) : "—"}
                  </td>
                  <td className="px-4 py-2.5 tabular-nums">
                    {d.acuteChronicRatio !== null && d.acuteChronicRatio > 0
                      ? d.acuteChronicRatio.toFixed(2)
                      : "—"}
                  </td>
                  <td className="px-4 py-2.5 tabular-nums text-emerald-600">
                    {d.hrv !== null ? Math.round(d.hrv) : "—"}
                  </td>
                  <td className="px-4 py-2.5 tabular-nums text-rose-600">
                    {d.restingHr !== null ? `${d.restingHr} bpm` : "—"}
                  </td>
                  <td className="px-4 py-2.5 tabular-nums text-violet-600">
                    {d.sleepSec !== null ? formatSleep(d.sleepSec) : "—"}
                  </td>
                  <td className="px-4 py-2.5 tabular-nums text-amber-600">
                    {d.steps !== null ? d.steps.toLocaleString("en-GB") : "—"}
                  </td>
                  <td className="px-4 py-2.5 tabular-nums text-slate-500">
                    {d.weightKg !== null ? `${d.weightKg.toFixed(1)} kg` : "—"}
                  </td>
                </tr>

                {isExpanded && (
                  <tr className="border-b border-neutral-100 bg-neutral-50">
                    <td colSpan={10} className="px-6 py-3">
                      <div className="flex flex-col gap-2">
                        {dayActivities.map((a) => (
                          <ActivityRow key={a.intervalsActivityId} activity={a} />
                        ))}
                      </div>
                    </td>
                  </tr>
                )}
              </Fragment>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
