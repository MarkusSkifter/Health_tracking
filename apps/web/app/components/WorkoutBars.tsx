type Zone = 1 | 2 | 3 | 4 | 5;

const ZONE_BG: Record<Zone, string> = {
  1: "#DBEAFE",
  2: "#D1FAE5",
  3: "#FEF3C7",
  4: "#FFEDD5",
  5: "#FEE2E2",
};

const ZONE_TEXT: Record<Zone, string> = {
  1: "text-blue-500",
  2: "text-emerald-600",
  3: "text-amber-500",
  4: "text-orange-500",
  5: "text-rose-500",
};

const ZONE_LABEL: Record<Zone, string> = {
  1: "Z1",
  2: "Z2",
  3: "Z3",
  4: "Z4",
  5: "Z5",
};

interface Block {
  minutes: number;
  zone: Zone;
}

function extractMinutes(text: string): number | null {
  const minMatch = text.match(/(\d+)\s*min/i);
  if (minMatch) return parseInt(minMatch[1]);
  const secMatch = text.match(/(\d{1,3}):(\d{2})/);
  if (secMatch) return parseInt(secMatch[1]);
  return null;
}

function extractZone(text: string): Zone {
  const t = text.toLowerCase();
  if (/\bz5\b|vo2|sprint|all[- ]?out|max effort/.test(t)) return 5;
  if (/\bz4\b|threshold|ftp|ltp|\bhard\b/.test(t)) return 4;
  if (/\bz3\b|tempo|sweet[- ]?spot|moderate/.test(t)) return 3;
  if (/\bz2\b|endurance|aerobic/.test(t)) return 2;
  return 1;
}

function parseSingleLine(line: string): Block | null {
  const mins = extractMinutes(line);
  if (!mins) return null;
  return { minutes: mins, zone: extractZone(line) };
}

function parseWorkout(description: string): Block[] {
  const blocks: Block[] = [];
  const lines = description.split(/[\n;]+/).map((s) => s.trim()).filter(Boolean);

  for (const line of lines) {
    // "3x(8min Z5, 3min Z1)" or "5x(3:00 @ threshold, 2:00 easy)"
    const repeatMatch = line.match(/^(\d+)\s*[xX]\s*\((.+)\)$/);
    if (repeatMatch) {
      const reps = parseInt(repeatMatch[1]);
      const parts = repeatMatch[2].split(",").map((s) => s.trim());
      for (let r = 0; r < reps; r++) {
        for (const part of parts) {
          const b = parseSingleLine(part);
          if (b) blocks.push(b);
        }
      }
      continue;
    }
    const b = parseSingleLine(line);
    if (b) blocks.push(b);
  }

  return blocks;
}

export function WorkoutBars({ description }: { description: string }) {
  const blocks = parseWorkout(description);
  if (blocks.length < 2) return null;

  const total = blocks.reduce((s, b) => s + b.minutes, 0);

  // Zone summary: total minutes per zone
  const zoneSummary = blocks.reduce<Partial<Record<Zone, number>>>((acc, b) => {
    acc[b.zone] = (acc[b.zone] ?? 0) + b.minutes;
    return acc;
  }, {});

  return (
    <div className="mt-2 select-none">
      {/* Bar chart */}
      <div className="flex h-4 w-full overflow-hidden rounded-md gap-px">
        {blocks.map((b, i) => (
          <div
            key={i}
            style={{
              width: `${(b.minutes / total) * 100}%`,
              backgroundColor: ZONE_BG[b.zone],
              minWidth: 1,
            }}
            title={`${b.minutes}min ${ZONE_LABEL[b.zone]}`}
          />
        ))}
      </div>
      {/* Zone legend */}
      <div className="mt-1 flex flex-wrap gap-x-3 gap-y-0">
        {(Object.entries(zoneSummary) as [string, number][])
          .sort(([a], [b]) => Number(a) - Number(b))
          .map(([z, mins]) => (
            <span key={z} className={`text-[10px] font-semibold tabular-nums ${ZONE_TEXT[Number(z) as Zone]}`}>
              {ZONE_LABEL[Number(z) as Zone]} {mins}min
            </span>
          ))}
        <span className="ml-auto text-[10px] text-slate-300">{total}min total</span>
      </div>
    </div>
  );
}
