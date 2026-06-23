import { intensity, type IntensityKey } from "./shared";

export interface MacroWeek {
  label: string;
  totalLoad: number;
  intensityKey: IntensityKey;
  isFuture: boolean;
  isCurrent: boolean;
}

const BAR_MAX = 132;

export function Macrocycle({ weeks }: { weeks: MacroWeek[] }) {
  const peak = Math.max(...weeks.map((w) => w.totalLoad), 1);

  return (
    <div className="overflow-x-auto">
      <div className="flex min-w-[640px] items-end gap-2" style={{ height: BAR_MAX + 4 }}>
        {weeks.map((w) => {
          const meta = intensity(w.intensityKey);
          const hgt = Math.max(3, (w.totalLoad / peak) * BAR_MAX);
          const color = w.isCurrent ? "var(--signal)" : `var(${meta.varName})`;
          return (
            <div key={w.label} className="flex flex-1 flex-col items-center justify-end" style={{ height: BAR_MAX }}>
              <span className="lx-num mb-1 text-[10px]" style={{ color: w.isCurrent ? "var(--signal-ink)" : "var(--ink-3)" }}>
                {Math.round(w.totalLoad)}
              </span>
              <div
                style={{
                  width: "100%",
                  maxWidth: 34,
                  height: hgt,
                  background: w.isFuture ? "transparent" : color,
                  border: w.isFuture ? `1.5px dashed ${color}` : "none",
                  opacity: w.isFuture ? 0.6 : 1,
                  borderRadius: "2px 2px 0 0",
                }}
              />
            </div>
          );
        })}
      </div>

      {/* week labels */}
      <div className="mt-2 flex min-w-[640px] gap-2" style={{ borderTop: "1px solid var(--line-2)", paddingTop: 6 }}>
        {weeks.map((w) => (
          <div key={w.label} className="flex flex-1 justify-center">
            <span className="lx-mono text-[9.5px]" style={{ color: w.isCurrent ? "var(--signal-ink)" : "var(--ink-3)", fontWeight: w.isCurrent ? 700 : 400 }}>
              {w.label}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
