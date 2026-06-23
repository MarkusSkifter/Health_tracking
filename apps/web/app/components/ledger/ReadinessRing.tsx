"use client";

import { useEffect, useState } from "react";
import { useScrollY } from "./hooks";

const R = 92;
const STROKE = 11;
const C = 2 * Math.PI * R;

/* The readiness dial. Draws to its value on mount and gently shrinks/dims as
   the page scrolls, so it recedes once you're reading the detail below. */
export function ReadinessRing({ readiness }: { readiness: number }) {
  const scrollY = useScrollY();
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  const p = Math.min(scrollY / 520, 1);
  const scale = 1 - p * 0.28;
  const opacity = 1 - p * 0.5;
  const offset = mounted ? C * (1 - readiness / 100) : C;

  return (
    <div
      className="relative mx-auto"
      style={{ width: (R + STROKE) * 2, maxWidth: "100%", transform: `scale(${scale})`, opacity, transformOrigin: "center top" }}
    >
      <svg
        viewBox={`0 0 ${(R + STROKE) * 2} ${(R + STROKE) * 2}`}
        className="w-full"
        role="img"
        aria-label={`Readiness ${readiness} of 100`}
      >
        <circle cx={R + STROKE} cy={R + STROKE} r={R} fill="none" stroke="var(--line-2)" strokeWidth={STROKE} />
        <circle
          cx={R + STROKE}
          cy={R + STROKE}
          r={R}
          fill="none"
          stroke="var(--signal)"
          strokeWidth={STROKE}
          strokeDasharray={C}
          strokeDashoffset={offset}
          transform={`rotate(-90 ${R + STROKE} ${R + STROKE})`}
          style={{ transition: "stroke-dashoffset 1.4s var(--ease)" }}
        />
        {Array.from({ length: 20 }, (_, i) => {
          const a = (i / 20) * Math.PI * 2 - Math.PI / 2;
          const inner = R - STROKE / 2 - 4;
          const outer = R - STROKE / 2 - (i % 2 === 0 ? 9 : 6);
          const cx = R + STROKE;
          return (
            <line
              key={i}
              x1={cx + Math.cos(a) * inner}
              y1={cx + Math.sin(a) * inner}
              x2={cx + Math.cos(a) * outer}
              y2={cx + Math.sin(a) * outer}
              stroke="var(--ink-4)"
              strokeWidth="1"
            />
          );
        })}
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="lx-num" style={{ fontSize: 60, fontWeight: 700, color: "var(--ink)", lineHeight: 1 }}>{readiness}</span>
        <span className="lx-eyebrow mt-1.5">Readiness</span>
      </div>
    </div>
  );
}
