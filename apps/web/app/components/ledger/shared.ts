/* Shared session/intensity language for the ledger. One vocabulary of
   intensity drives the weekly ribbon and the macrocycle grid so the dots
   read consistently across the page. */

export type IntensityKey = "rest" | "easy" | "aerobic" | "threshold" | "vo2";

export interface Intensity {
  key: IntensityKey;
  label: string;
  varName: string; // CSS var holding the color
}

const SCALE: Record<IntensityKey, Intensity> = {
  rest: { key: "rest", label: "Rest", varName: "--z-rest" },
  easy: { key: "easy", label: "Recovery", varName: "--z-easy" },
  aerobic: { key: "aerobic", label: "Endurance", varName: "--z-aerobic" },
  threshold: { key: "threshold", label: "Threshold", varName: "--z-thresh" },
  vo2: { key: "vo2", label: "VO₂max", varName: "--z-vo2" },
};

export function intensity(key: IntensityKey): Intensity {
  return SCALE[key];
}

/** Classify a session into the intensity vocabulary from its name/type and
 *  load relative to a typical day. */
export function classifySession(opts: {
  name?: string | null;
  type?: string | null;
  load?: number | null;
  durationSec?: number | null;
}): IntensityKey {
  const text = `${opts.name ?? ""} ${opts.type ?? ""}`.toLowerCase();
  const load = opts.load ?? 0;

  if (opts.type === "Rest" || /rest day|day off/.test(text) || (load === 0 && !opts.durationSec)) {
    return "rest";
  }
  if (/vo2|v02|interval|sprint|max|anaerobic/.test(text)) return "vo2";
  if (/threshold|ftp|sweet ?spot|tempo|over[- ]?under|race/.test(text)) return "threshold";
  if (/recovery|easy|shakeout|spin/.test(text)) return "easy";
  if (/endurance|aerobic|long|base|z2|zone ?2/.test(text)) return "aerobic";

  // Fall back to load magnitude.
  if (load === 0) return "rest";
  if (load < 35) return "easy";
  if (load < 75) return "aerobic";
  if (load < 120) return "threshold";
  return "vo2";
}

export function fmtDuration(sec: number | null | undefined): string | null {
  if (sec == null || sec <= 0) return null;
  // Round to whole minutes first so e.g. 7170s renders "2h 00m", never "1h 60m".
  const totalMin = Math.round(sec / 60);
  const h = Math.floor(totalMin / 60);
  const m = totalMin % 60;
  return h > 0 ? `${h}h ${m.toString().padStart(2, "0")}m` : `${m}m`;
}

export function shortDay(iso: string): string {
  return ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"][new Date(`${iso}T00:00:00`).getDay()]!;
}
