type Zone = 1 | 2 | 3 | 4 | 5;

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

