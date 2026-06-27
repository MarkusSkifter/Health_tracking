"use client";

import { useRef, useState } from "react";

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
  selectionStart?: number | null;
  selectionEnd?: number | null;
  onRangeStart?: (idx: number) => void;
  onRangeUpdate?: (idx: number) => void;
  onRangeEnd?: () => void;
}

export function LineChart({
  data,
  color = "var(--ink-2)",
  height = 80,
  format,
  unit = "",
  selectionStart = null,
  selectionEnd = null,
  onRangeStart,
  onRangeUpdate,
  onRangeEnd,
}: LineChartProps) {
  const [hovered, setHovered] = useState<number | null>(null);
  const svgRef = useRef<SVGSVGElement>(null);

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

  function getIdxFromClientX(clientX: number): number {
    if (!svgRef.current) return 0;
    const rect = svgRef.current.getBoundingClientRect();
    const relX = ((clientX - rect.left) / rect.width) * W;
    const idx = Math.round(((relX - px) / cw) * (data.length - 1));
    return Math.max(0, Math.min(data.length - 1, idx));
  }

  const hasSel = selectionStart !== null && selectionEnd !== null;
  const selLo = hasSel ? Math.min(selectionStart!, selectionEnd!) : 0;
  const selHi = hasSel ? Math.max(selectionStart!, selectionEnd!) : 0;
  const step = data.length > 1 ? cw / (data.length - 1) : cw;
  const selX1 = hasSel ? Math.max(px, (positions[selLo]?.x ?? px) - step / 2) : 0;
  const selX2 = hasSel ? Math.min(px + cw, (positions[selHi]?.x ?? px + cw) + step / 2) : 0;

  return (
    <div className="select-none" onMouseLeave={() => setHovered(null)}>
      <svg
        ref={svgRef}
        viewBox={`0 0 ${W} ${H}`}
        className="w-full"
        style={{ height, cursor: onRangeStart ? "crosshair" : "default" }}
        role="img"
        aria-label="Metric trend chart"
        onPointerDown={(e) => {
          if (!onRangeStart) return;
          const idx = getIdxFromClientX(e.clientX);
          onRangeStart(idx);
          (e.currentTarget as SVGSVGElement).setPointerCapture(e.pointerId);
        }}
        onPointerMove={(e) => {
          if (!onRangeUpdate || !(e.buttons & 1)) return;
          onRangeUpdate(getIdxFromClientX(e.clientX));
        }}
        onPointerUp={() => onRangeEnd?.()}
      >
        {[0, 0.5, 1].map((t) => (
          <line key={t} x1={px} x2={px + cw} y1={py + ch * (1 - t)} y2={py + ch * (1 - t)} stroke="var(--line)" strokeWidth="1" />
        ))}

        {hasSel && (
          <rect
            x={selX1.toFixed(1)}
            y={py}
            width={Math.max(0, selX2 - selX1).toFixed(1)}
            height={ch}
            fill="var(--signal)"
            opacity={0.12}
          />
        )}

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
          return (
            <rect
              key={i}
              x={leftX}
              y={py}
              width={Math.max(rightX - leftX, 1)}
              height={ch}
              fill="transparent"
              onMouseEnter={() => setHovered(i)}
            />
          );
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
