"use client";

import { useRef, useState } from "react";

export interface AcrPoint {
  date: string;
  acr: number;
  isProjected: boolean;
  plannedLoad?: number;
}

const VB_W = 580;
const VB_H = 160;
const PAD_L = 8;
const PAD_R = 82; // room for zone labels
const PAD_T = 18; // room for "today" label
const PAD_B = 22; // room for x-axis labels

const PLOT_W = VB_W - PAD_L - PAD_R;
const PLOT_H = VB_H - PAD_T - PAD_B;
const Y_MAX = 2.0;

function yPx(acr: number): number {
  return PAD_T + (1 - Math.min(Math.max(acr, 0), Y_MAX) / Y_MAX) * PLOT_H;
}

const BANDS = [
  { lo: 1.5, hi: Y_MAX, fill: "rgba(248,113,113,0.09)",  label: "Very high", color: "#F87171" },
  { lo: 1.3, hi: 1.5,   fill: "rgba(251,191,36,0.10)",   label: "Elevated",  color: "#FCD34D" },
  { lo: 0.8, hi: 1.3,   fill: "rgba(29,158,117,0.12)",   label: "Optimal",   color: "#5DCAA5" },
  { lo: 0.0, hi: 0.8,   fill: "rgba(255,255,255,0.025)", label: "Detraining", color: "rgba(255,255,255,0.25)" },
];

function zoneOf(acr: number): { label: string; color: string } {
  if (acr > 1.5) return { label: "Very high",  color: "#F87171" };
  if (acr > 1.3) return { label: "Elevated",   color: "#FCD34D" };
  if (acr >= 0.8) return { label: "Optimal",   color: "#5DCAA5" };
  return              { label: "Detraining",    color: "rgba(255,255,255,0.3)" };
}

const MONTHS = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
function shortDate(iso: string): string {
  const parts = iso.split("-");
  return `${parseInt(parts[2]!)} ${MONTHS[parseInt(parts[1]!) - 1]}`;
}

export function AcrChartClient({
  points,
  todayDate,
}: {
  points: AcrPoint[];
  todayDate: string;
}) {
  const svgRef = useRef<SVGSVGElement>(null);
  const [hoverIdx, setHoverIdx] = useState<number | null>(null);

  if (!points.length) return null;

  const n = points.length;
  const xPx = (i: number) => PAD_L + (i / Math.max(n - 1, 1)) * PLOT_W;

  const histPts = points.filter(p => !p.isProjected);
  const projPts = points.filter(p => p.isProjected);

  const todayIdx = points.findIndex(p => p.date === todayDate);
  const todayX = todayIdx >= 0 ? xPx(todayIdx) : xPx(histPts.length - 1);

  // Historical path
  const histPath = histPts
    .map((p, i) => `${i === 0 ? "M" : "L"}${xPx(i).toFixed(1)},${yPx(p.acr).toFixed(1)}`)
    .join(" ");

  // Projection path — bridge from last hist point
  const lastHistGlobal = histPts.length - 1;
  const bridgePath = [
    histPts[lastHistGlobal] ? `M${xPx(lastHistGlobal).toFixed(1)},${yPx(histPts[lastHistGlobal]!.acr).toFixed(1)}` : null,
    ...projPts.map((p, i) => `L${xPx(histPts.length + i).toFixed(1)},${yPx(p.acr).toFixed(1)}`),
  ].filter(Boolean).join(" ");

  // X-axis labels every ~7 points
  const step = Math.max(1, Math.round(n / 6));
  const xLabels = points.flatMap((p, i) =>
    (i % step === 0 || i === n - 1) ? [{ i, date: p.date }] : []
  );

  function handleMouseMove(e: React.MouseEvent<SVGSVGElement>) {
    const rect = svgRef.current?.getBoundingClientRect();
    if (!rect) return;
    const mx = (e.clientX - rect.left) * (VB_W / rect.width);
    let best = 0, bestDist = Infinity;
    for (let i = 0; i < n; i++) {
      const d = Math.abs(xPx(i) - mx);
      if (d < bestDist) { bestDist = d; best = i; }
    }
    setHoverIdx(best);
  }

  const hovered = hoverIdx !== null ? points[hoverIdx] : null;
  const hoverX = hoverIdx !== null ? xPx(hoverIdx) : null;
  const hoverY = hovered ? yPx(hovered.acr) : null;

  // Tooltip x position as %, clamped so it doesn't overflow
  const tooltipLeft = hoverX !== null
    ? Math.max(5, Math.min(60, (hoverX / VB_W) * 100))
    : 0;

  return (
    <div style={{ position: "relative" }}>
      <svg
        ref={svgRef}
        viewBox={`0 0 ${VB_W} ${VB_H}`}
        style={{ width: "100%", height: "auto", display: "block" }}
        onMouseMove={handleMouseMove}
        onMouseLeave={() => setHoverIdx(null)}
        aria-hidden="true"
      >
        {/* Zone bands */}
        {BANDS.map(z => (
          <rect
            key={z.label}
            x={PAD_L}
            y={yPx(z.hi)}
            width={PLOT_W}
            height={Math.max(0, yPx(z.lo) - yPx(z.hi))}
            fill={z.fill}
          />
        ))}

        {/* Zone boundary lines */}
        {[0.8, 1.3, 1.5].map(v => (
          <line
            key={v}
            x1={PAD_L} y1={yPx(v)}
            x2={PAD_L + PLOT_W} y2={yPx(v)}
            stroke="rgba(255,255,255,0.07)"
            strokeWidth="0.5"
          />
        ))}

        {/* Zone value ticks on left */}
        {[0.8, 1.3, 1.5].map(v => (
          <text
            key={`tick-${v}`}
            x={PAD_L - 2}
            y={yPx(v) + 3}
            textAnchor="end"
            fontSize="7.5"
            fill="rgba(255,255,255,0.2)"
          >
            {v}
          </text>
        ))}

        {/* Zone labels on right */}
        {BANDS.map(z => {
          const midY = (yPx(z.lo) + yPx(z.hi)) / 2;
          if (yPx(z.lo) - yPx(z.hi) < 8) return null; // skip if too thin to label
          return (
            <text
              key={z.label}
              x={PAD_L + PLOT_W + 6}
              y={midY + 3}
              fontSize="8"
              fill={z.color}
              opacity="0.65"
            >
              {z.label}
            </text>
          );
        })}

        {/* Today line */}
        <line
          x1={todayX} y1={PAD_T}
          x2={todayX} y2={PAD_T + PLOT_H}
          stroke="rgba(255,255,255,0.18)"
          strokeWidth="0.75"
          strokeDasharray="2,3"
        />
        <text
          x={todayX} y={PAD_T - 3}
          textAnchor="middle"
          fontSize="7"
          fill="rgba(255,255,255,0.28)"
        >
          today
        </text>

        {/* Historical line */}
        {histPath && (
          <path
            d={histPath}
            fill="none"
            stroke="#5DCAA5"
            strokeWidth="1.75"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        )}

        {/* Projected line */}
        {bridgePath && (
          <path
            d={bridgePath}
            fill="none"
            stroke="#5DCAA5"
            strokeWidth="1.25"
            strokeDasharray="4,3"
            strokeLinecap="round"
            strokeLinejoin="round"
            opacity="0.55"
          />
        )}

        {/* X-axis labels */}
        {xLabels.map(({ i, date }) => (
          <text
            key={date}
            x={xPx(i)}
            y={VB_H - 4}
            textAnchor="middle"
            fontSize="7.5"
            fill="rgba(255,255,255,0.25)"
          >
            {shortDate(date)}
          </text>
        ))}

        {/* Hover crosshair + dot */}
        {hoverIdx !== null && hovered && hoverX !== null && hoverY !== null && (
          <>
            <line
              x1={hoverX} y1={PAD_T}
              x2={hoverX} y2={PAD_T + PLOT_H}
              stroke="rgba(255,255,255,0.12)"
              strokeWidth="0.75"
            />
            <circle
              cx={hoverX} cy={hoverY}
              r="4.5"
              fill={zoneOf(hovered.acr).color}
              stroke="rgba(6,6,8,0.8)"
              strokeWidth="1.5"
            />
          </>
        )}
      </svg>

      {/* Hover tooltip */}
      {hovered && hoverX !== null && (
        <div
          style={{
            position: "absolute",
            top: 0,
            left: `${tooltipLeft}%`,
            transform: "translateX(-50%)",
            background: "rgba(14,14,18,0.97)",
            border: "0.5px solid rgba(255,255,255,0.10)",
            borderRadius: 8,
            padding: "6px 10px",
            pointerEvents: "none",
            zIndex: 10,
            minWidth: 100,
          }}
        >
          <p style={{ fontSize: 10, color: "rgba(255,255,255,0.38)", marginBottom: 2 }}>
            {shortDate(hovered.date)}{hovered.isProjected ? " · projected" : ""}
          </p>
          <p style={{ fontSize: 15, fontWeight: 700, color: zoneOf(hovered.acr).color, lineHeight: 1 }}>
            {hovered.acr.toFixed(2)}
          </p>
          <p style={{ fontSize: 10, color: zoneOf(hovered.acr).color, opacity: 0.75, marginTop: 2 }}>
            {zoneOf(hovered.acr).label}
          </p>
          {hovered.isProjected && hovered.plannedLoad != null && hovered.plannedLoad > 0 && (
            <p style={{ fontSize: 9, color: "rgba(255,255,255,0.3)", marginTop: 2 }}>
              load {Math.round(hovered.plannedLoad)} planned
            </p>
          )}
        </div>
      )}
    </div>
  );
}
