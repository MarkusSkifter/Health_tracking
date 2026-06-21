function zone(ratio: number): { label: string; bg: string; text: string } {
  if (ratio <= 0) return { label: "No baseline", bg: "bg-slate-100", text: "text-slate-500" };
  if (ratio < 0.8) return { label: "Detraining", bg: "bg-sky-50", text: "text-sky-700" };
  if (ratio <= 1.3) return { label: "Optimal", bg: "bg-emerald-50", text: "text-emerald-700" };
  if (ratio <= 1.5) return { label: "Elevated", bg: "bg-amber-50", text: "text-amber-700" };
  return { label: "Very high", bg: "bg-red-50", text: "text-red-600" };
}

export function AcrBadge({ ratio }: { ratio: number }) {
  const z = zone(ratio);
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-xs font-semibold ${z.bg} ${z.text}`}>
      {z.label}
      <span className="opacity-40">·</span>
      <span className="tabular-nums">{ratio > 0 ? ratio.toFixed(2) : "—"}</span>
    </span>
  );
}
