/** Acute:chronic ratio badge (display only; thresholds mirror SPEC §6). */
function zone(ratio: number): { label: string; cls: string } {
  if (ratio <= 0) return { label: "No baseline", cls: "bg-neutral-100 text-neutral-500" };
  if (ratio < 0.8) return { label: "Detraining", cls: "bg-sky-100 text-sky-700" };
  if (ratio <= 1.3) return { label: "Optimal", cls: "bg-emerald-100 text-emerald-700" };
  if (ratio <= 1.5) return { label: "Elevated", cls: "bg-amber-100 text-amber-700" };
  return { label: "Very high", cls: "bg-red-100 text-red-700" };
}

export function AcrBadge({ ratio }: { ratio: number }) {
  const z = zone(ratio);
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium ${z.cls}`}
    >
      <span>{z.label}</span>
      <span className="opacity-50">·</span>
      <span className="tabular-nums">{ratio > 0 ? ratio.toFixed(2) : "—"}</span>
    </span>
  );
}
