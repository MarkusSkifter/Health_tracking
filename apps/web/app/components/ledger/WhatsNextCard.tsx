import { parseWorkout } from "../WorkoutBars";
import { fmtDuration } from "./shared";

export interface NextSession {
  name: string;
  type: string | null;
  dateLong: string;
  tss: number | null;
  durationSec: number | null;
  description: string | null;
  rationale: string | null;
  isSuggestion: boolean;
}

// Z1→Z5 ramp: ink shades climbing into the signal accent.
const ZONE_COLOR = ["#b9b4a8", "#8c8578", "#a86a4a", "#d24f1a", "#e63900"];
const ZONE_LABEL = ["Z1", "Z2", "Z3", "Z4", "Z5"];

function deriveIF(tss: number | null, durationSec: number | null): number | null {
  if (!tss || !durationSec || durationSec <= 0) return null;
  const hours = durationSec / 3600;
  const intensity = Math.sqrt(tss / (hours * 100));
  if (!isFinite(intensity)) return null;
  return Math.max(0.3, Math.min(1.2, intensity));
}

export function WhatsNextCard({ session }: { session: NextSession }) {
  const blocks = session.description ? parseWorkout(session.description) : [];
  const totalMin = blocks.reduce((s, b) => s + b.minutes, 0);
  const byZone = blocks.reduce<Record<number, number>>((acc, b) => {
    acc[b.zone] = (acc[b.zone] ?? 0) + b.minutes;
    return acc;
  }, {});
  const ifValue = deriveIF(session.tss, session.durationSec);
  const duration = fmtDuration(session.durationSec);

  return (
    <article
      className="overflow-hidden"
      style={{ background: "var(--ink)", borderRadius: "var(--radius-lg)", color: "var(--paper)" }}
    >
      <div className="px-7 py-6 md:px-9 md:py-8">
        {/* Header */}
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="lx-eyebrow" style={{ color: "rgba(249,247,242,0.55)" }}>
              {session.isSuggestion ? "Coach suggests · next" : "On the card · next"}
            </p>
            <h3 className="lx-serif mt-2" style={{ fontSize: "clamp(30px, 5vw, 44px)", fontWeight: 600, lineHeight: 1.02 }}>
              {session.name}
            </h3>
            <p className="lx-mono mt-2 text-[12px]" style={{ color: "rgba(249,247,242,0.6)" }}>
              {session.dateLong}
              {session.type ? ` · ${session.type}` : ""}
              {duration ? ` · ${duration}` : ""}
            </p>
          </div>
        </div>

        {/* TSS / IF readouts */}
        <div className="mt-7 flex gap-12">
          <div>
            <p className="lx-eyebrow" style={{ color: "rgba(249,247,242,0.5)" }}>Training stress</p>
            <p className="lx-num mt-1.5" style={{ fontSize: 40, fontWeight: 700, color: "var(--paper)" }}>
              {session.tss != null ? Math.round(session.tss) : "—"}
              <span className="ml-1.5 text-[13px]" style={{ color: "rgba(249,247,242,0.5)" }}>TSS</span>
            </p>
          </div>
          <div>
            <p className="lx-eyebrow" style={{ color: "rgba(249,247,242,0.5)" }}>Intensity</p>
            <p className="lx-num mt-1.5" style={{ fontSize: 40, fontWeight: 700, color: "var(--signal)" }}>
              {ifValue != null ? ifValue.toFixed(2) : "—"}
              <span className="ml-1.5 text-[13px]" style={{ color: "rgba(249,247,242,0.5)" }}>IF</span>
            </p>
          </div>
        </div>

        {/* Zone distribution */}
        {blocks.length > 0 && totalMin > 0 && (
          <div className="mt-7">
            <p className="lx-eyebrow mb-2.5" style={{ color: "rgba(249,247,242,0.5)" }}>Zone distribution</p>
            <div className="flex h-2.5 w-full overflow-hidden" style={{ borderRadius: 2, gap: 1 }}>
              {blocks.map((b, i) => (
                <div
                  key={i}
                  title={`${Math.round(b.minutes)}min ${ZONE_LABEL[b.zone - 1]}`}
                  style={{ width: `${(b.minutes / totalMin) * 100}%`, background: ZONE_COLOR[b.zone - 1], minWidth: 1 }}
                />
              ))}
            </div>
            <div className="mt-2.5 flex flex-wrap gap-x-5 gap-y-1">
              {Object.entries(byZone)
                .sort(([a], [b]) => Number(a) - Number(b))
                .map(([z, mins]) => (
                  <span key={z} className="lx-mono text-[11px]" style={{ color: "rgba(249,247,242,0.7)" }}>
                    <span style={{ color: ZONE_COLOR[Number(z) - 1] }}>●</span> {ZONE_LABEL[Number(z) - 1]} {Math.round(mins)}m
                  </span>
                ))}
            </div>
          </div>
        )}

        {/* Coach notes */}
        {(session.rationale || session.description) && (
          <blockquote
            className="lx-serif mt-7 pl-5 text-[19px] italic leading-snug"
            style={{ borderLeft: "2px solid var(--signal)", color: "rgba(249,247,242,0.88)", fontWeight: 500 }}
          >
            {session.rationale ?? session.description}
          </blockquote>
        )}
      </div>
    </article>
  );
}
