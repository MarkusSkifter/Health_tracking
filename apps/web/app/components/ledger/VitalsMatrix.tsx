"use client";

import { Reveal } from "./Reveal";

export interface VitalTile {
  label: string;
  value: string;
  unit: string;
  series: number[];
  delta: { text: string; favorable: boolean | null } | null;
  sim?: boolean;
}

function MicroSparkline({ values, favorable }: { values: number[]; favorable: boolean | null }) {
  if (values.length < 2) {
    return <div style={{ height: 30 }} />;
  }
  const w = 120;
  const h = 30;
  const pad = 3;
  const min = Math.min(...values);
  const max = Math.max(...values, min + 1);
  const pts = values.map((v, i) => {
    const x = pad + (i / (values.length - 1)) * (w - pad * 2);
    const y = pad + (h - pad * 2) - ((v - min) / (max - min)) * (h - pad * 2);
    return [x, y] as const;
  });
  const d = pts.map(([x, y], i) => `${i === 0 ? "M" : "L"} ${x.toFixed(1)} ${y.toFixed(1)}`).join(" ");
  const last = pts[pts.length - 1]!;
  const stroke = favorable === false ? "var(--signal)" : "var(--ink-2)";

  return (
    <svg viewBox={`0 0 ${w} ${h}`} preserveAspectRatio="none" className="w-full" style={{ height: 30, display: "block" }} aria-hidden>
      <path d={d} fill="none" stroke={stroke} strokeWidth="1.25" strokeLinejoin="round" strokeLinecap="round" />
      <circle cx={last[0]} cy={last[1]} r="1.8" fill={stroke} />
    </svg>
  );
}

export function VitalsMatrix({ tiles }: { tiles: VitalTile[] }) {
  return (
    <div className="grid grid-cols-2 gap-px sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6" style={{ background: "var(--line)", border: "1px solid var(--line)", borderRadius: "var(--radius)" }}>
      {tiles.map((t, i) => (
        <Reveal key={t.label} delay={(i % 4) * 60 + Math.floor(i / 4) * 40} style={{ background: "var(--paper-2)" }} className="px-4 py-4">
          <div className="flex items-center justify-between">
            <p className="lx-eyebrow">{t.label}</p>
            {t.sim && (
              <span className="lx-mono" style={{ fontSize: 8.5, letterSpacing: "0.1em", color: "var(--ink-4)", border: "1px solid var(--line-2)", padding: "1px 4px", borderRadius: 2 }}>
                SIM
              </span>
            )}
          </div>
          <p className="lx-num mt-2 flex items-baseline gap-1" style={{ fontSize: 27, fontWeight: 600, color: t.value === "—" ? "var(--ink-4)" : "var(--ink)" }}>
            {t.value}
            {t.unit && <span className="text-[11px]" style={{ color: "var(--ink-3)" }}>{t.unit}</span>}
          </p>
          <div className="mt-3">
            <MicroSparkline values={t.series} favorable={t.delta?.favorable ?? null} />
          </div>
          {t.delta && (
            <p
              className="lx-mono mt-2 text-[11px]"
              style={{ color: t.delta.favorable == null ? "var(--ink-3)" : t.delta.favorable ? "var(--tsb-pos)" : "var(--signal)" }}
            >
              {t.delta.text}
            </p>
          )}
        </Reveal>
      ))}
    </div>
  );
}
