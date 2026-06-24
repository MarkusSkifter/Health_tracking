"use client";

import type { Activity, AnalyticsDay } from "@health/shared";
import { Fragment, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { classifySession, intensity } from "./ledger/shared";

function shortDate(iso: string): string {
  return new Intl.DateTimeFormat("en-GB", { weekday: "short", day: "numeric", month: "short" }).format(new Date(`${iso}T00:00:00`));
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

function acrColor(acr: number | null): string {
  if (acr == null || acr <= 0) return "var(--ink-3)";
  if (acr > 1.5 || acr < 0.8) return "var(--signal)";
  return "var(--ink)";
}

function Th({ label, tip }: { label: string; tip?: string }) {
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
    <th className="lx-eyebrow px-4 py-3 text-left" style={{ fontSize: 9.5, color: "var(--ink-3)" }}>
      {tip ? (
        <>
          <span ref={ref} className="inline-flex cursor-default items-center" onMouseEnter={show} onMouseLeave={() => setVisible(false)}>
            <span className="border-b border-dotted border-current pb-px">{label}</span>
          </span>
          {visible && typeof document !== "undefined" &&
            createPortal(
              <div
                className="lx-sans pointer-events-none fixed z-50 w-56 px-3.5 py-2.5 text-left text-[11px] font-normal normal-case leading-relaxed"
                style={{
                  left: coords.x,
                  top: coords.y - 8,
                  transform: "translate(-50%, -100%)",
                  letterSpacing: "normal",
                  background: "var(--ink)",
                  border: "1px solid var(--ink)",
                  borderRadius: "var(--radius)",
                  color: "var(--paper)",
                  boxShadow: "0 12px 40px rgba(26,24,22,0.25)",
                }}
              >
                {tip}
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
  const meta = intensity(classifySession({ name: a.type, type: a.type, load: a.trainingLoad, durationSec: a.durationSec }));
  const metrics: Array<{ label: string; value: string }> = [];
  if (a.avgPower !== null) metrics.push({ label: "Avg power", value: `${a.avgPower} W` });
  if (a.avgHr !== null) metrics.push({ label: "Avg HR", value: `${a.avgHr} bpm` });
  if (a.trainingLoad !== null) metrics.push({ label: "Load", value: Math.round(a.trainingLoad).toString() });
  if (a.distanceM !== null) metrics.push({ label: "Distance", value: formatDistance(a.distanceM) });

  return (
    <div className="flex flex-wrap items-baseline gap-x-5 gap-y-1 py-0.5">
      <span className="flex items-center gap-1.5">
        <span style={{ width: 7, height: 7, borderRadius: "50%", background: `var(${meta.varName})` }} />
        <span className="lx-sans text-xs font-medium" style={{ color: "var(--ink)" }}>{formatActivityType(a.type)}</span>
      </span>
      <span className="lx-num text-xs" style={{ color: "var(--ink-3)" }}>{formatDuration(a.durationSec)}</span>
      {metrics.map((m) => (
        <span key={m.label} className="text-xs">
          <span className="lx-eyebrow" style={{ color: "var(--ink-4)" }}>{m.label} </span>
          <span className="lx-num" style={{ color: "var(--ink-2)" }}>{m.value}</span>
        </span>
      ))}
    </div>
  );
}

export function AnalyticsDailyTable({ days, activityList }: { days: AnalyticsDay[]; activityList: Activity[] }) {
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
  const numCell = "lx-num px-4 py-2.5";

  return (
    <div className="overflow-x-auto lx-leaf">
      <table className="w-full text-sm">
        <thead>
          <tr style={{ borderBottom: "1px solid var(--line-2)" }}>
            <Th label="Date" />
            <Th label="Load" tip="Training load for the day, from the intensity and duration of your activities." />
            <Th label="7d" tip="Rolling 7-day average training load (acute load) — how much you've trained this past week." />
            <Th label="28d" tip="Rolling 28-day average training load (chronic load) — your fitness base over the past month." />
            <Th label="ACR" tip="Acute:Chronic Ratio. 0.8–1.3 is the sweet spot; above 1.5 signals elevated injury risk." />
            <Th label="HRV" tip="Heart rate variability (ms). Higher generally indicates better recovery." />
            <Th label="HR" tip="Resting heart rate (bpm). Lower typically indicates better fitness." />
            <Th label="Sleep" tip="Total sleep duration." />
            <Th label="Steps" tip="Total daily step count." />
            <Th label="Weight" />
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
                    borderBottom: "1px solid var(--line)",
                    cursor: hasActivities ? "pointer" : "default",
                    background: isExpanded ? "var(--paper-3)" : "transparent",
                  }}
                >
                  <td className="lx-sans whitespace-nowrap px-4 py-2.5 font-medium" style={{ color: "var(--ink-2)" }}>
                    <span className="inline-flex items-center gap-2">
                      {hasActivities && <span className="text-[9px]" style={{ color: "var(--ink-4)" }}>{isExpanded ? "▾" : "▸"}</span>}
                      {shortDate(d.date)}
                    </span>
                  </td>
                  <td className={numCell} style={{ color: "var(--ink)", fontWeight: 600 }}>{effectiveLoad !== null ? Math.round(effectiveLoad) : "—"}</td>
                  <td className={numCell} style={{ color: "var(--ink-3)" }}>{d.load7d !== null ? Math.round(d.load7d) : "—"}</td>
                  <td className={numCell} style={{ color: "var(--ink-3)" }}>{d.load28d !== null ? Math.round(d.load28d) : "—"}</td>
                  <td className={numCell} style={{ color: acrColor(d.acuteChronicRatio), fontWeight: 600 }}>
                    {d.acuteChronicRatio !== null && d.acuteChronicRatio > 0 ? d.acuteChronicRatio.toFixed(2) : "—"}
                  </td>
                  <td className={numCell} style={{ color: "var(--ink-2)" }}>{d.hrv !== null ? Math.round(d.hrv) : "—"}</td>
                  <td className={numCell} style={{ color: "var(--ink-2)" }}>{d.restingHr !== null ? `${d.restingHr}` : "—"}</td>
                  <td className={numCell} style={{ color: "var(--ink-2)" }}>{d.sleepSec !== null ? formatSleep(d.sleepSec) : "—"}</td>
                  <td className={numCell} style={{ color: "var(--ink-2)" }}>{d.steps !== null ? d.steps.toLocaleString("en-GB") : "—"}</td>
                  <td className={numCell} style={{ color: "var(--ink-3)" }}>{d.weightKg !== null ? `${d.weightKg.toFixed(1)}` : "—"}</td>
                </tr>

                {isExpanded && (
                  <tr style={{ borderBottom: "1px solid var(--line)", background: "var(--paper-3)" }}>
                    <td colSpan={10} className="px-6 py-3">
                      <div className="flex flex-col gap-1.5">
                        {dayActivities.map((a) => <ActivityRow key={a.intervalsActivityId} activity={a} />)}
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
