"use client";

import { useState } from "react";

export interface ChartPoint {
  date: string;
  value: number | null;
}

interface LineChartProps {
  data: ChartPoint[];
  color?: string;
  height?: number;
  format?: (v: number) => string;
  unit?: string;
}

export function LineChart({
  data,
  color = "var(--ink-2)",
  height = 80,
  format,
  unit = "",
}: LineChartProps) {
  const [hovered, setHovered] = useState<number | null>(null);

  const validData = data.filter((d): d is { date: string; value: number } => d.value !== null);

  if (data.length === 0 || validData.length < 2) {
    return (
      <div className="flex items-center justify-center" style={{ height }} role="img" aria-label="No data available">
        <p className="lx-mono text-xs" style={{ color: "var(--ink-4)" }}>No data</p>
      </div>
    );
  }

  const W = 400;
  const H = height;
  const px = 2;
  const py = 6;
  const cw = W - px * 2;
  const ch = H - py * 2;

  const vals = validData.map((d) => d.value);
  const min = Math.min(...vals);
  const max = Math.max(...vals);
  const range = max - min || 1;

  const fmt = format ?? ((v: number) => String(Math.round(v)));

  const positions = data.map((d, i) => {
    const x = px + (i / Math.max(data.length - 1, 1)) * cw;
    if (d.value === null) return { x, y: null, date: d.date, value: null };
    const y = py + ch - ((d.value - min) / range) * ch;
    return { x, y, date: d.date, value: d.value };
  });

  let pathD = "";
  let inLine = false;
  for (const p of positions) {
    if (p.y === null) {
      inLine = false;
    } else if (!inLine) {
      pathD += `M${p.x.toFixed(1)},${p.y.toFixed(1)}`;
      inLine = true;
    } else {
      pathD += `L${p.x.toFixed(1)},${p.y.toFixed(1)}`;
    }
  }

  const latestValid = [...positions].reverse().find((p) => p.y !== null);
  const hoveredPt = hovered !== null ? positions[hovered] : null;

  function mmdd(iso: string) {
    return iso.slice(5).replace("-", "/");
  }

  return (
    <div className="select-none" onMouseLeave={() => setHovered(null)}>
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full" style={{ height }} role="img" aria-label="Metric trend chart">
        {[0, 0.5, 1].map((t) => (
          <line key={t} x1={px} x2={px + cw} y1={py + ch * (1 - t)} y2={py + ch * (1 - t)} stroke="var(--line)" strokeWidth="1" />
        ))}

        {pathD && <path d={pathD} fill="none" stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />}

        {hoveredPt && hoveredPt.y !== null && (
          <>
            <line x1={hoveredPt.x.toFixed(1)} x2={hoveredPt.x.toFixed(1)} y1={py} y2={py + ch} stroke="var(--line-2)" strokeWidth="1" />
            <circle cx={hoveredPt.x.toFixed(1)} cy={hoveredPt.y.toFixed(1)} r="3" fill={color} />
          </>
        )}

        {hovered === null && latestValid && latestValid.y !== null && (
          <circle cx={latestValid.x.toFixed(1)} cy={(latestValid.y as number).toFixed(1)} r="2.5" fill={color} />
        )}

        {positions.map((p, i) => {
          const leftX = i > 0 ? (positions[i - 1]!.x + p.x) / 2 : px;
          const rightX = i < positions.length - 1 ? (p.x + positions[i + 1]!.x) / 2 : px + cw;
          return <rect key={i} x={leftX} y={py} width={Math.max(rightX - leftX, 1)} height={ch} fill="transparent" onMouseEnter={() => setHovered(i)} />;
        })}
      </svg>

      <div className="lx-mono mt-1.5 flex justify-between text-[10px]" style={{ color: "var(--ink-3)" }}>
        <span>{mmdd(data[0]!.date)}</span>
        {hoveredPt ? (
          <span style={{ color: "var(--ink)", fontWeight: 600 }}>
            {mmdd(hoveredPt.date)}
            {hoveredPt.value !== null ? ` · ${fmt(hoveredPt.value)}${unit}` : " · —"}
          </span>
        ) : (
          <span>{validData.length > 0 ? `${fmt(min)} – ${fmt(max)}${unit}` : ""}</span>
        )}
        <span>{mmdd(data[data.length - 1]!.date)}</span>
      </div>
    </div>
  );
}
