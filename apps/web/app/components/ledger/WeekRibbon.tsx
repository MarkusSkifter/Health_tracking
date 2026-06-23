import { fmtDuration, intensity, type IntensityKey } from "./shared";

export interface RibbonDay {
  dateIso: string;
  dayName: string;
  dayNum: string;
  isToday: boolean;
  sessionName: string | null;
  intensityKey: IntensityKey;
  durationSec: number | null;
}

function Dot({ k }: { k: IntensityKey }) {
  const meta = intensity(k);
  if (k === "rest") {
    return <span style={{ width: 10, height: 10, borderRadius: "50%", border: "1.5px solid var(--ink-4)", display: "inline-block" }} />;
  }
  return <span style={{ width: 10, height: 10, borderRadius: "50%", background: `var(${meta.varName})`, display: "inline-block" }} />;
}

export function WeekRibbon({ days }: { days: RibbonDay[] }) {
  return (
    <div className="flex overflow-x-auto" style={{ border: "1px solid var(--line)", borderRadius: "var(--radius)" }}>
      {days.map((d, i) => {
        const meta = intensity(d.intensityKey);
        const duration = fmtDuration(d.durationSec);
        return (
          <div
            key={d.dateIso}
            className="flex min-w-[110px] flex-1 flex-col gap-3 px-4 py-4"
            style={{
              borderLeft: i === 0 ? "none" : "1px solid var(--line)",
              background: d.isToday ? "var(--signal-wash)" : "transparent",
            }}
          >
            <div className="flex items-baseline justify-between">
              <span className="lx-eyebrow" style={{ color: d.isToday ? "var(--signal-ink)" : "var(--ink-3)" }}>{d.dayName}</span>
              <span className="lx-num text-[13px]" style={{ color: "var(--ink-2)" }}>{d.dayNum}</span>
            </div>
            <Dot k={d.intensityKey} />
            <div>
              <p className="lx-sans text-[12px] font-medium leading-tight" style={{ color: d.sessionName ? "var(--ink)" : "var(--ink-4)" }}>
                {d.sessionName ?? meta.label}
              </p>
              {duration && <p className="lx-mono mt-1 text-[10.5px]" style={{ color: "var(--ink-3)" }}>{duration}</p>}
            </div>
          </div>
        );
      })}
    </div>
  );
}
