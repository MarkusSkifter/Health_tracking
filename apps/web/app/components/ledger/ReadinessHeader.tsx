"use client";

import { useScrollY } from "./hooks";

export interface ReadinessHeaderProps {
  dateLong: string;
  weekday: string;
  readiness: number;
  verdict: string;
  strain: number;
  acr: number;
  tsb: number;
  coachLine: string | null;
}

export function ReadinessHeader({
  dateLong,
  weekday,
  verdict,
  strain,
  acr,
  tsb,
  coachLine,
}: ReadinessHeaderProps) {
  const scrollY = useScrollY();
  const p = Math.min(scrollY / 460, 1);
  const numeralShift = scrollY * 0.32;
  const numeralOpacity = Math.max(0, 0.06 - p * 0.05);
  const tsbLabel = `${tsb >= 0 ? "+" : ""}${Math.round(tsb)}`;

  return (
    <header className="relative pt-10 md:pt-16">
      {/* Parallax watermark numeral — today's strain, printed faint on the stock */}
      <div
        aria-hidden
        className="lx-mono pointer-events-none absolute -right-2 -top-2 select-none leading-none"
        style={{
          fontSize: "clamp(160px, 26vw, 380px)",
          fontWeight: 700,
          color: "var(--ink)",
          opacity: numeralOpacity,
          transform: `translateY(${numeralShift}px)`,
        }}
      >
        {Math.round(strain)}
      </div>

      <div className="relative">
        <p className="lx-eyebrow">Daily ledger · {dateLong}</p>
        <h1
          className="lx-serif mt-3"
          style={{
            fontSize: "clamp(64px, 9vw, 128px)",
            fontWeight: 600,
            lineHeight: 0.92,
            letterSpacing: "-0.02em",
            color: "var(--signal)",
          }}
        >
          {verdict}.
        </h1>
        <p className="lx-serif mt-1" style={{ fontSize: "clamp(22px, 3vw, 32px)", fontWeight: 500, fontStyle: "italic", color: "var(--ink-2)" }}>
          {weekday} readiness
        </p>

        {coachLine && (
          <p className="lx-sans mt-5 max-w-md text-[15px] leading-relaxed" style={{ color: "var(--ink-2)" }}>
            {coachLine}
          </p>
        )}

        <div className="mt-7 flex flex-wrap gap-x-10 gap-y-4">
          <Stat label="Today's strain" value={Math.round(strain).toString()} unit="load" />
          <Stat label="Acute : chronic" value={acr > 0 ? acr.toFixed(2) : "—"} unit="ratio" />
          <Stat label="Form" value={tsbLabel} unit="tsb" accent={tsb < -10 ? "signal" : undefined} />
        </div>
      </div>
    </header>
  );
}

function Stat({ label, value, unit, accent }: { label: string; value: string; unit: string; accent?: "signal" }) {
  return (
    <div>
      <p className="lx-eyebrow">{label}</p>
      <p className="mt-1.5 flex items-baseline gap-1.5">
        <span className="lx-num" style={{ fontSize: 30, fontWeight: 600, color: accent === "signal" ? "var(--signal)" : "var(--ink)" }}>
          {value}
        </span>
        <span className="lx-mono text-[11px]" style={{ color: "var(--ink-3)" }}>{unit}</span>
      </p>
    </div>
  );
}
