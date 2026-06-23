"use client";

import { useInView } from "./hooks";
import type { FitnessPoint } from "./fitness";

const W = 960;
const PAD_X = 8;
const MAIN_TOP = 8;
const MAIN_H = 196;
const GAP = 26;
const TSB_H = 72;
const H = MAIN_TOP + MAIN_H + GAP + TSB_H;

function path(pts: Array<[number, number]>): string {
  return pts.map(([x, y], i) => `${i === 0 ? "M" : "L"} ${x.toFixed(1)} ${y.toFixed(1)}`).join(" ");
}

export function FitnessProjection({ points }: { points: FitnessPoint[] }) {
  const [ref, inView] = useInView();
  if (points.length < 2) return null;

  const n = points.length;
  const innerW = W - PAD_X * 2;
  const todayIdx = Math.max(0, points.map((p) => p.projected).lastIndexOf(false));

  const maxLoad = Math.max(...points.map((p) => Math.max(p.ctl, p.atl)), 10) * 1.08;
  const maxTsb = Math.max(...points.map((p) => Math.abs(p.tsb)), 10) * 1.1;

  const x = (i: number) => PAD_X + (i / (n - 1)) * innerW;
  const yLoad = (v: number) => MAIN_TOP + MAIN_H - (v / maxLoad) * MAIN_H;
  const tsbMid = MAIN_TOP + MAIN_H + GAP + TSB_H / 2;
  const yTsb = (v: number) => tsbMid - (v / maxTsb) * (TSB_H / 2);

  const ctlPts = points.map((p, i) => [x(i), yLoad(p.ctl)] as [number, number]);
  const atlPts = points.map((p, i) => [x(i), yLoad(p.atl)] as [number, number]);

  const histEnd = todayIdx;
  const ctlHist = path(ctlPts.slice(0, histEnd + 1));
  const ctlProj = path(ctlPts.slice(histEnd));
  const atlHist = path(atlPts.slice(0, histEnd + 1));
  const atlProj = path(atlPts.slice(histEnd));

  const ctlArea = `${path(ctlPts.slice(0, histEnd + 1))} L ${x(histEnd).toFixed(1)} ${(MAIN_TOP + MAIN_H).toFixed(1)} L ${PAD_X} ${(MAIN_TOP + MAIN_H).toFixed(1)} Z`;

  const projX = x(todayIdx);
  const today = points[todayIdx]!;

  // TSB area split into positive (moss) and negative (rust) about the midline.
  const tsbTop = points.map((p, i) => [x(i), yTsb(Math.max(0, p.tsb))] as [number, number]);
  const tsbBot = points.map((p, i) => [x(i), yTsb(Math.min(0, p.tsb))] as [number, number]);
  const tsbPosArea = `M ${PAD_X} ${tsbMid} ${path(tsbTop).slice(1)} L ${x(n - 1).toFixed(1)} ${tsbMid} Z`;
  const tsbNegArea = `M ${PAD_X} ${tsbMid} ${path(tsbBot).slice(1)} L ${x(n - 1).toFixed(1)} ${tsbMid} Z`;

  const drawCls = inView ? "animate-draw" : "";
  const drawStyle = { ["--draw-len" as string]: "3200" } as React.CSSProperties;

  return (
    <div ref={ref}>
      {/* Current readouts */}
      <div className="mb-5 flex flex-wrap gap-x-10 gap-y-3">
        <Readout label="Fitness" sub="CTL" value={Math.round(today.ctl)} swatch="var(--ctl)" />
        <Readout label="Fatigue" sub="ATL" value={Math.round(today.atl)} swatch="var(--atl)" />
        <Readout
          label="Form"
          sub="TSB"
          value={`${today.tsb >= 0 ? "+" : ""}${Math.round(today.tsb)}`}
          swatch={today.tsb >= 0 ? "var(--tsb-pos)" : "var(--tsb-neg)"}
        />
      </div>

      <svg viewBox={`0 0 ${W} ${H}`} className="w-full" style={{ display: "block", overflow: "visible" }} role="img" aria-label="Fitness, fatigue, and form over time">
        {/* Projection zone */}
        <rect x={projX} y={MAIN_TOP} width={W - PAD_X - projX} height={MAIN_H} fill="var(--paper-3)" />
        <rect x={projX} y={MAIN_TOP + MAIN_H + GAP} width={W - PAD_X - projX} height={TSB_H} fill="var(--paper-3)" />

        {/* baselines */}
        <line x1={PAD_X} x2={W - PAD_X} y1={MAIN_TOP + MAIN_H} y2={MAIN_TOP + MAIN_H} stroke="var(--line-2)" strokeWidth="1" />
        <line x1={PAD_X} x2={W - PAD_X} y1={tsbMid} y2={tsbMid} stroke="var(--line-2)" strokeWidth="1" />

        {/* today divider */}
        <line x1={projX} x2={projX} y1={MAIN_TOP - 4} y2={MAIN_TOP + MAIN_H + GAP + TSB_H} stroke="var(--ink-3)" strokeWidth="1" strokeDasharray="2 3" />
        <text x={projX + 5} y={MAIN_TOP + 4} className="lx-mono" style={{ fontSize: 10, fill: "var(--ink-3)", letterSpacing: "0.08em" }}>TODAY</text>

        {/* CTL area + lines */}
        <path d={ctlArea} fill="var(--ctl)" fillOpacity="0.08" />
        <path className={drawCls} style={drawStyle} d={ctlHist} fill="none" stroke="var(--ctl)" strokeWidth="2.5" strokeLinejoin="round" strokeLinecap="round" />
        <path d={ctlProj} fill="none" stroke="var(--ctl)" strokeWidth="2.5" strokeOpacity="0.4" strokeDasharray="4 4" strokeLinejoin="round" />

        {/* ATL lines */}
        <path className={drawCls} style={drawStyle} d={atlHist} fill="none" stroke="var(--atl)" strokeWidth="1.75" strokeLinejoin="round" strokeLinecap="round" />
        <path d={atlProj} fill="none" stroke="var(--atl)" strokeWidth="1.75" strokeOpacity="0.45" strokeDasharray="4 4" strokeLinejoin="round" />

        {/* TSB strip */}
        <path d={tsbPosArea} fill="var(--tsb-pos)" fillOpacity="0.22" />
        <path d={tsbNegArea} fill="var(--tsb-neg)" fillOpacity="0.22" />
        <path d={path(points.map((p, i) => [x(i), yTsb(p.tsb)]))} fill="none" stroke="var(--ink-2)" strokeWidth="1.25" strokeLinejoin="round" />

        {/* today dots */}
        <circle cx={projX} cy={yLoad(today.ctl)} r="3.5" fill="var(--ctl)" />
        <circle cx={projX} cy={yLoad(today.atl)} r="3.5" fill="var(--atl)" />
      </svg>

      <div className="mt-3 flex items-center justify-between">
        <span className="lx-mono text-[10px]" style={{ color: "var(--ink-3)" }}>90 days observed</span>
        <span className="lx-mono text-[10px]" style={{ color: "var(--ink-3)" }}>projection from planned load →</span>
      </div>
    </div>
  );
}

function Readout({ label, sub, value, swatch }: { label: string; sub: string; value: string | number; swatch: string }) {
  return (
    <div className="flex items-center gap-2.5">
      <span style={{ width: 14, height: 3, background: swatch, display: "inline-block", borderRadius: 2 }} />
      <div>
        <p className="lx-eyebrow">{label} <span style={{ color: "var(--ink-4)" }}>· {sub}</span></p>
        <p className="lx-num" style={{ fontSize: 26, fontWeight: 600, color: "var(--ink)", lineHeight: 1 }}>{value}</p>
      </div>
    </div>
  );
}
