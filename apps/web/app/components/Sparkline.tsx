/** Dependency-free SVG sparkline of recent daily training load. */
export function Sparkline({
  values,
  width = 320,
  height = 56,
}: {
  values: number[];
  width?: number;
  height?: number;
}) {
  if (values.length < 2) return null;

  const max = Math.max(...values, 1);
  const pad = 4;
  const w = width - pad * 2;
  const h = height - pad * 2;

  const points = values.map((v, i) => {
    const x = pad + (i / (values.length - 1)) * w;
    const y = pad + h - (v / max) * h;
    return `${x.toFixed(1)},${y.toFixed(1)}`;
  });

  const lastVal = values[values.length - 1] ?? 0;
  const lastX = pad + w;
  const lastY = pad + h - (lastVal / max) * h;

  return (
    <svg
      viewBox={`0 0 ${width} ${height}`}
      className="w-full text-neutral-900"
      role="img"
      aria-label="Recent training load trend"
    >
      <polyline
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        points={points.join(" ")}
      />
      <circle cx={lastX.toFixed(1)} cy={lastY.toFixed(1)} r="3" fill="currentColor" />
    </svg>
  );
}
