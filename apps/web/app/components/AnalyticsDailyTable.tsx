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
  if (type === "Unknown") return "Workout";
  return type.replace(/([A-Z])/g, " $1").trim();
}

const TYPE_COLORS: Record<string, { bg: string; text: string }> = {
  Ride:        { bg: "rgba(251,191,36,0.18)",  text: "#FCD34D" },
  VirtualRide: { bg: "rgba(251,191,36,0.18)",  text: "#FCD34D" },
  Run:         { bg: "rgba(29,158,117,0.18)",   text: "#5DCAA5" },
  VirtualRun:  { bg: "rgba(29,158,117,0.18)",   text: "#5DCAA5" },
  Swim:        { bg: "rgba(55,138,221,0.18)",   text: "#6BAEE8" },
  Walk:        { bg: "rgba(93,202,165,0.18)",   text: "#5DCAA5" },
};

function actTypeColor(type: string) {
  return TYPE_COLORS[type] ?? { bg: "rgba(255,255,255,0.08)", text: "rgba(255,255,255,0.5)" };
}

function Th({ label, tip, color = "rgba(255,255,255,0.35)" }: { label: string; tip?: string; color?: string }) {
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
    <th className="px-4 py-3 text-[10px] font-semibold uppercase tracking-widest" style={{ color }}>
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
                className="pointer-events-none fixed z-50 w-56 rounded-xl px-3.5 py-2.5 text-left text-[11px] font-normal normal-case tracking-normal leading-relaxed shadow-xl"
                style={{
                  left: coords.x,
                  top: coords.y - 8,
                  transform: "translate(-50%, -100%)",
                  background: "rgba(18,18,22,0.97)",
                  border: "0.5px solid rgba(255,255,255,0.1)",
                  color: "rgba(255,255,255,0.7)",
                }}
              >
                {tip}
                <span className="absolute left-1/2 top-full -translate-x-1/2 border-4 border-transparent" style={{ borderTopColor: "rgba(18,18,22,0.97)" }} />
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
  const c = actTypeColor(a.type);
  const metrics: Array<{ label: string; value: string; color?: string }> = [];
  if (a.avgPower !== null) metrics.push({ label: "Avg power", value: `${a.avgPower} W`, color: "#FCD34D" });
  if (a.avgHr !== null) metrics.push({ label: "Avg HR", value: `${a.avgHr} bpm`, color: "#F87171" });
  if (a.trainingLoad !== null) metrics.push({ label: "Load", value: Math.round(a.trainingLoad).toString() });
  if (a.distanceM !== null) metrics.push({ label: "Distance", value: formatDistance(a.distanceM) });

  return (
    <div className="flex flex-wrap items-baseline gap-x-5 gap-y-1 py-0.5">
      <span className="rounded-md px-1.5 py-0.5 text-[11px] font-semibold" style={{ background: c.bg, color: c.text }}>
        {formatActivityType(a.type)}
      </span>
      <span className="text-xs" style={{ color: "rgba(255,255,255,0.35)" }}>{formatDuration(a.durationSec)}</span>
      {metrics.map((m) => (
        <span key={m.label} className="text-xs">
          <span style={{ color: "rgba(255,255,255,0.35)" }}>{m.label} </span>
          <span className="font-semibold tabular-nums" style={{ color: m.color ?? "rgba(255,255,255,0.65)" }}>
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

  const byDate = activityList.reduce<Record<string, Activity[]>>((acc, a) => {
    (acc[a.date] ??= []).push(a);
    return acc;
  }, {});

  const sorted = days.slice().reverse();

  return (
    <div
      className="overflow-x-auto rounded-2xl"
      style={{ border: "0.5px solid rgba(255,255,255,0.07)", background: "rgba(255,255,255,0.03)" }}
    >
      <table className="w-full text-sm">
        <thead>
          <tr style={{ borderBottom: "0.5px solid rgba(255,255,255,0.06)" }} className="text-left">
            <Th label="Date" />
            <Th label="Load" tip="Training load for the day, calculated from the intensity and duration of your activities." />
            <Th label="7d" tip="Rolling 7-day average training load (acute load). Reflects how much you have trained in the past week." />
            <Th label="28d" tip="Rolling 28-day average training load (chronic load). Reflects your fitness base built up over the past month." />
            <Th label="ACR" tip="Acute:Chronic Ratio. Your 7-day load divided by your 28-day load. 0.8-1.3 is the sweet spot for adaptation. Above 1.5 signals elevated injury risk." />
            <Th label="HRV" tip="Heart Rate Variability in milliseconds. Higher values generally indicate better recovery." color="#5DCAA5" />
            <Th label="HR" tip="Resting heart rate in beats per minute. Lower typically indicates better cardiovascular fitness." color="#F87171" />
            <Th label="Sleep" tip="Total sleep duration." color="#C084FC" />
            <Th label="Steps" tip="Total daily step count." color="#FCD34D" />
            <Th label="Weight" color="rgba(255,255,255,0.35)" />
          </tr>
        </thead>
        <tbody>
          {sorted.map((d) => {
            const dayActivities = byDate[d.date] ?? [];
            const hasActivities = dayActivities.length > 0;
            const isExpanded = expanded.has(d.date);
            const activityLoad = dayActivities.reduce((sum, a) => sum + (a.trainingLoad ?? 0), 0);
            const effectiveLoad =
              d.trainingLoadDaily != null && (d.trainingLoadDaily > 0 || dayActivities.length === 0)
                ? d.trainingLoadDaily
                : dayActivities.length > 0
                  ? activityLoad
                  : null;

            return (
              <Fragment key={d.date}>
                <tr
                  onClick={() => hasActivities && toggle(d.date)}
                  className="select-none transition-colors"
                  style={{
                    borderBottom: "0.5px solid rgba(255,255,255,0.04)",
                    cursor: hasActivities ? "pointer" : "default",
                    background: isExpanded ? "rgba(255,255,255,0.03)" : "transparent",
                  }}
                  onMouseEnter={(e) => {
                    if (hasActivities) (e.currentTarget as HTMLElement).style.background = "rgba(255,255,255,0.04)";
                  }}
                  onMouseLeave={(e) => {
                    (e.currentTarget as HTMLElement).style.background = isExpanded ? "rgba(255,255,255,0.03)" : "transparent";
                  }}
                >
                  <td className="whitespace-nowrap px-4 py-2.5 font-medium" style={{ color: "rgba(255,255,255,0.65)" }}>
                    <span className="inline-flex items-center gap-2">
                      {hasActivities && (
                        <span className="text-[9px] select-none" style={{ color: "rgba(255,255,255,0.2)" }}>
                          {isExpanded ? "▾" : "▸"}
                        </span>
                      )}
                      {shortDate(d.date)}
                    </span>
                  </td>
                  <td className="px-4 py-2.5 tabular-nums font-semibold text-white">
                    {effectiveLoad !== null ? Math.round(effectiveLoad) : "—"}
                  </td>
                  <td className="px-4 py-2.5 tabular-nums" style={{ color: "rgba(255,255,255,0.35)" }}>
                    {d.load7d !== null ? Math.round(d.load7d) : "—"}
                  </td>
                  <td className="px-4 py-2.5 tabular-nums" style={{ color: "rgba(255,255,255,0.35)" }}>
                    {d.load28d !== null ? Math.round(d.load28d) : "—"}
                  </td>
                  <td className="px-4 py-2.5 tabular-nums" style={{ color: "rgba(255,255,255,0.45)" }}>
                    {d.acuteChronicRatio !== null && d.acuteChronicRatio > 0
                      ? d.acuteChronicRatio.toFixed(2)
                      : "—"}
                  </td>
                  <td className="px-4 py-2.5 tabular-nums font-medium" style={{ color: "#5DCAA5" }}>
                    {d.hrv !== null ? Math.round(d.hrv) : "—"}
                  </td>
                  <td className="px-4 py-2.5 tabular-nums font-medium" style={{ color: "#F87171" }}>
                    {d.restingHr !== null ? `${d.restingHr}` : "—"}
                  </td>
                  <td className="px-4 py-2.5 tabular-nums font-medium" style={{ color: "#C084FC" }}>
                    {d.sleepSec !== null ? formatSleep(d.sleepSec) : "—"}
                  </td>
                  <td className="px-4 py-2.5 tabular-nums font-medium" style={{ color: "#FCD34D" }}>
                    {d.steps !== null ? d.steps.toLocaleString("en-GB") : "—"}
                  </td>
                  <td className="px-4 py-2.5 tabular-nums" style={{ color: "rgba(255,255,255,0.35)" }}>
                    {d.weightKg !== null ? `${d.weightKg.toFixed(1)}` : "—"}
                  </td>
                </tr>

                {isExpanded && (
                  <tr style={{ borderBottom: "0.5px solid rgba(255,255,255,0.04)", background: "rgba(255,255,255,0.02)" }}>
                    <td colSpan={10} className="px-6 py-3">
                      <div className="flex flex-col gap-1.5">
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
