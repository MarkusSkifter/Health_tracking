type Zone = 1 | 2 | 3 | 4 | 5;

const ZONE_BG: Record<Zone, string> = {
  1: "rgba(55,138,221,0.28)",
  2: "rgba(29,158,117,0.28)",
  3: "rgba(251,191,36,0.28)",
  4: "rgba(251,146,60,0.28)",
  5: "rgba(248,113,113,0.28)",
};
const ZONE_TEXT: Record<Zone, string> = {
  1: "#6BAEE8",
  2: "#5DCAA5",
  3: "#FCD34D",
  4: "#FB923C",
  5: "#F87171",
};
const ZONE_LABEL: Record<Zone, string> = { 1: "Z1", 2: "Z2", 3: "Z3", 4: "Z4", 5: "Z5" };

export interface Block { minutes: number; zone: Zone; }

// Approximate training-load contribution per minute in each zone (TSS-style scale)
export const LOAD_PER_MIN: Record<Zone, number> = { 1: 0.4, 2: 0.7, 3: 1.0, 4: 1.5, 5: 2.0 };

function pctToZone(avg: number): Zone {
  if (avg > 105) return 5;
  if (avg > 90)  return 4;
  if (avg > 75)  return 3;
  if (avg > 55)  return 2;
  return 1;
}

function extractMinutes(text: string): number | null {
  const hMatch = text.match(/(\d+)\s*h\s*(\d+)?/i);
  if (hMatch?.[1]) return parseInt(hMatch[1]) * 60 + (hMatch[2] ? parseInt(hMatch[2]) : 0);

  const minMatch = text.match(/(\d+)\s*min/i) ?? text.match(/(\d+)\s*m\b/);
  if (minMatch?.[1]) return parseInt(minMatch[1]);

  const secMatch = text.match(/(\d+)\s*s(?:ec)?\b/i);
  if (secMatch?.[1]) return Math.max(0.5, parseInt(secMatch[1]) / 60);

  const timeMatch = text.match(/(\d{1,3}):(\d{2})/);
  if (timeMatch?.[1]) return parseInt(timeMatch[1]);

  return null;
}

function extractZone(text: string): Zone {
  const pctMatch = text.match(/(\d+)(?:\s*[-]\s*(\d+))?\s*%/);
  if (pctMatch?.[1]) {
    const lo = parseInt(pctMatch[1]);
    const hi = pctMatch[2] ? parseInt(pctMatch[2]) : lo;
    return pctToZone((lo + hi) / 2);
  }
  const t = text.toLowerCase();
  if (/\bz5\b|vo2|sprint|all[- ]?out/.test(t)) return 5;
  if (/\bz4\b|threshold|ftp|ltp|\bhard\b/.test(t)) return 4;
  if (/\bz3\b|tempo|sweet[- ]?spot|moderate/.test(t)) return 3;
  if (/\bz2\b|endurance|aerobic/.test(t)) return 2;
  return 1;
}

function parseLine(raw: string): Block | null {
  const text = raw.replace(/^\s*-\s*/, "").trim();
  const mins = extractMinutes(text);
  if (!mins) return null;
  return { minutes: mins, zone: extractZone(text) };
}

export function parseWorkout(description: string): Block[] {
  const blocks: Block[] = [];
  const lines = description.split(/\n/).map((s) => s.trim()).filter(Boolean);

  let i = 0;
  while (i < lines.length) {
    const line = lines[i] ?? "";

    const repeatLineMatch = line.match(/^(\d+)\s*[xX]$/);
    if (repeatLineMatch?.[1]) {
      const reps = parseInt(repeatLineMatch[1]);
      i++;
      const sub: Block[] = [];
      while (i < lines.length && /^\s*-/.test(lines[i] ?? "")) {
        const b = parseLine(lines[i] ?? "");
        if (b) sub.push(b);
        i++;
      }
      for (let r = 0; r < reps; r++) blocks.push(...sub);
      continue;
    }

    const inlineRepeat = line.match(/^(\d+)\s*[xX]\s*\((.+)\)$/);
    if (inlineRepeat?.[1] && inlineRepeat[2]) {
      const reps = parseInt(inlineRepeat[1]);
      for (let r = 0; r < reps; r++) {
        for (const part of inlineRepeat[2].split(",").map((s) => s.trim())) {
          const b = parseLine(part);
          if (b) blocks.push(b);
        }
      }
      i++;
      continue;
    }

    const b = parseLine(line);
    if (b) blocks.push(b);
    i++;
  }

  return blocks;
}

export function WorkoutBars({ description }: { description: string }) {
  const blocks = parseWorkout(description);
  if (!blocks.length) return null;

  const total = blocks.reduce((s, b) => s + b.minutes, 0);

  const zoneSummary = blocks.reduce<Partial<Record<Zone, number>>>((acc, b) => {
    acc[b.zone] = (acc[b.zone] ?? 0) + b.minutes;
    return acc;
  }, {});

  return (
    <div className="mt-2 select-none">
      <div className="flex h-4 w-full overflow-hidden rounded-md gap-px">
        {blocks.map((b, idx) => (
          <div
            key={idx}
            style={{
              width: `${(b.minutes / total) * 100}%`,
              backgroundColor: ZONE_BG[b.zone],
              minWidth: 1,
            }}
            title={`${Math.round(b.minutes * 10) / 10}min ${ZONE_LABEL[b.zone]}`}
          />
        ))}
      </div>
      <div className="mt-1 flex flex-wrap gap-x-3 gap-y-0">
        {(Object.entries(zoneSummary) as [string, number][])
          .sort(([a], [b]) => Number(a) - Number(b))
          .map(([z, mins]) => (
            <span key={z} className="text-[10px] font-semibold tabular-nums" style={{ color: ZONE_TEXT[Number(z) as Zone] }}>
              {ZONE_LABEL[Number(z) as Zone]} {Math.round(mins)}min
            </span>
          ))}
        <span className="ml-auto text-[10px]" style={{ color: "rgba(255,255,255,0.2)" }}>{Math.round(total)}min</span>
      </div>
    </div>
  );
}
