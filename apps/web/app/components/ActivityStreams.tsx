"use client";

import type { ActivityStreams as Streams } from "@health/shared";
import { useEffect, useState } from "react";
import { fetchActivityStreams } from "../../lib/api";

function hms(sec: number): string {
  const h = Math.floor(sec / 3600);
  const m = Math.floor((sec % 3600) / 60);
  const s = Math.floor(sec % 60);
  if (h > 0) return `${h}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
  return `${m}:${String(s).padStart(2, "0")}`;
}

interface StreamChartProps {
  label: string;
  values: number[];
  t: number[];
  color: string;
  unit: string;
  /** Fill under the line — used for the elevation profile. */
  fill?: boolean;
  format?: (v: number) => string;
}

function StreamChart({ label, values, t, color, unit, fill, format }: StreamChartProps) {
  const [hovered, setHovered] = useState<number | null>(null);

  const W = 600;
  const H = 90;
  const px = 2;
  const py = 8;
  const cw = W - px * 2;
  const ch = H - py * 2;

  const finite = values.filter((v) => Number.isFinite(v));
  const min = finite.length ? Math.min(...finite) : 0;
  const max = finite.length ? Math.max(...finite) : 1;
  const range = max - min || 1;
  const fmt = format ?? ((v: number) => String(Math.round(v)));

  const xs = values.map((_, i) => px + (i / Math.max(values.length - 1, 1)) * cw);
  const ys = values.map((v) => py + ch - ((v - min) / range) * ch);

  let pathD = "";
  for (let i = 0; i < values.length; i++) {
    pathD += `${i === 0 ? "M" : "L"}${xs[i]!.toFixed(1)},${ys[i]!.toFixed(1)}`;
  }
  const areaD = fill && pathD ? `${pathD}L${xs[xs.length - 1]!.toFixed(1)},${(py + ch).toFixed(1)}L${px.toFixed(1)},${(py + ch).toFixed(1)}Z` : "";

  const avg = finite.length ? finite.reduce((a, b) => a + b, 0) / finite.length : null;
  const hv = hovered !== null ? (values[hovered] ?? null) : null;

  return (
    <div className="select-none" onMouseLeave={() => setHovered(null)}>
      <div className="mb-1 flex items-baseline justify-between">
        <span className="lx-eyebrow" style={{ fontSize: 9.5, color: "var(--ink-3)" }}>{label}</span>
        <span className="lx-num text-[11px]" style={{ color: hv !== null ? "var(--ink)" : "var(--ink-3)", fontWeight: hv !== null ? 600 : 400 }}>
          {hv !== null
            ? `${hms(t[hovered!] ?? 0)} · ${fmt(hv)}${unit}`
            : avg !== null
              ? `avg ${fmt(avg)} · max ${fmt(max)}${unit}`
              : "—"}
        </span>
      </div>
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full" style={{ height: H }} role="img" aria-label={`${label} over time`}>
        {[0, 0.5, 1].map((g) => (
          <line key={g} x1={px} x2={px + cw} y1={py + ch * g} y2={py + ch * g} stroke="var(--line)" strokeWidth="1" />
        ))}
        {areaD && <path d={areaD} fill={color} opacity={0.12} />}
        {pathD && <path d={pathD} fill="none" stroke={color} strokeWidth="1.5" strokeLinejoin="round" />}
        {hovered !== null && (
          <>
            <line x1={xs[hovered]!.toFixed(1)} x2={xs[hovered]!.toFixed(1)} y1={py} y2={py + ch} stroke="var(--line-2)" strokeWidth="1" />
            <circle cx={xs[hovered]!.toFixed(1)} cy={ys[hovered]!.toFixed(1)} r="3" fill={color} />
          </>
        )}
        {/* Invisible hover targets */}
        {values.map((_, i) => {
          const leftX = i > 0 ? (xs[i - 1]! + xs[i]!) / 2 : px;
          const rightX = i < values.length - 1 ? (xs[i]! + xs[i + 1]!) / 2 : px + cw;
          return <rect key={i} x={leftX} y={py} width={Math.max(rightX - leftX, 1)} height={ch} fill="transparent" onMouseEnter={() => setHovered(i)} />;
        })}
      </svg>
    </div>
  );
}

const CHANNELS: Array<{
  key: "watts" | "heartrate" | "cadence" | "velocity" | "altitude";
  label: string;
  color: string;
  unit: string;
  fill?: boolean;
  format?: (v: number) => string;
}> = [
  { key: "watts", label: "Power", color: "var(--signal)", unit: " W" },
  { key: "heartrate", label: "Heart rate", color: "var(--ink)", unit: " bpm" },
  { key: "cadence", label: "Cadence", color: "var(--ink-2)", unit: " rpm" },
  { key: "velocity", label: "Speed", color: "var(--ink-2)", unit: " km/h", format: (v) => (v * 3.6).toFixed(1) },
  { key: "altitude", label: "Elevation", color: "var(--ink-3)", unit: " m", fill: true, format: (v) => String(Math.round(v)) },
];

export function ActivityStreams({ activityId }: { activityId: string }) {
  const [streams, setStreams] = useState<Streams | null>(null);
  const [error, setError] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    setLoading(true);
    setError(false);
    fetchActivityStreams(activityId)
      .then((s) => active && setStreams(s))
      .catch(() => active && setError(true))
      .finally(() => active && setLoading(false));
    return () => {
      active = false;
    };
  }, [activityId]);

  if (loading) {
    return <p className="lx-mono py-3 text-[11px]" style={{ color: "var(--ink-4)" }}>Loading streams…</p>;
  }
  if (error) {
    return <p className="lx-mono py-3 text-[11px]" style={{ color: "var(--ink-4)" }}>Streams unavailable</p>;
  }

  const present = streams && streams.samples > 0
    ? CHANNELS.filter((c) => Array.isArray(streams[c.key]) && (streams[c.key] as number[]).length > 0)
    : [];

  if (!streams || present.length === 0) {
    return <p className="lx-mono py-3 text-[11px]" style={{ color: "var(--ink-4)" }}>No stream data recorded</p>;
  }

  return (
    <div className="mt-2 flex flex-col gap-4 pb-1">
      {present.map((c) => (
        <StreamChart
          key={c.key}
          label={c.label}
          values={streams[c.key] as number[]}
          t={streams.t}
          color={c.color}
          unit={c.unit}
          fill={c.fill}
          format={c.format}
        />
      ))}
    </div>
  );
}
