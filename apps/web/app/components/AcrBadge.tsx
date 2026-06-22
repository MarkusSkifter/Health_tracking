function zone(ratio: number): { label: string; bg: string; text: string } {
  if (ratio <= 0) return { label: "No baseline", bg: "rgba(255,255,255,0.08)", text: "rgba(255,255,255,0.4)" };
  if (ratio < 0.8) return { label: "Detraining", bg: "rgba(55,138,221,0.15)", text: "#6BAEE8" };
  if (ratio <= 1.3) return { label: "Optimal", bg: "rgba(29,158,117,0.15)", text: "#5DCAA5" };
  if (ratio <= 1.5) return { label: "Elevated", bg: "rgba(251,191,36,0.15)", text: "#FCD34D" };
  return { label: "Very high", bg: "rgba(248,113,113,0.15)", text: "#F87171" };
}

export function AcrBadge({ ratio }: { ratio: number }) {
  const z = zone(ratio);
  return (
    <span
      className="inline-flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-xs font-semibold"
      style={{ background: z.bg, color: z.text }}
    >
      {z.label}
      <span style={{ opacity: 0.4 }}>·</span>
      <span className="tabular-nums">{ratio > 0 ? ratio.toFixed(2) : "—"}</span>
    </span>
  );
}
