import type { ActivityStreams } from "@health/shared";
import { z } from "zod";

/**
 * Normalize + downsample raw intervals.icu activity streams (SPEC §4).
 *
 * The raw `/streams` payload is an array of channels, each `{ type, data }`
 * where `data` is index-aligned at ~1 Hz. A long ride is tens of thousands of
 * samples per channel — far more than a sparkline needs — so we bucket-average
 * down to at most `MAX_BUCKETS` points before sending anything to the browser.
 */

/** Numeric channels we surface; `latlng` and other shapes are ignored. */
const NUMERIC_CHANNELS = [
  "watts",
  "heartrate",
  "cadence",
  "altitude",
  "velocity_smooth",
] as const;

/** Cap on points per channel returned to the client. */
export const MAX_BUCKETS = 400;

const rawStreamSchema = z.object({
  type: z.string(),
  data: z.array(z.number().nullable()).nullish(),
});

/** Average the non-null numbers in `slice`, or null if there are none. */
function bucketMean(slice: Array<number | null>): number | null {
  let sum = 0;
  let n = 0;
  for (const v of slice) {
    if (v != null && Number.isFinite(v)) {
      sum += v;
      n += 1;
    }
  }
  return n === 0 ? null : sum / n;
}

/** Bucket-average `data` into `buckets` points, rounding to `decimals`. */
function downsampleChannel(
  data: Array<number | null>,
  buckets: number,
  decimals: number,
): number[] {
  const out: number[] = new Array(buckets);
  const step = data.length / buckets;
  const factor = 10 ** decimals;
  for (let i = 0; i < buckets; i++) {
    const start = Math.floor(i * step);
    const end = Math.max(start + 1, Math.floor((i + 1) * step));
    const mean = bucketMean(data.slice(start, end));
    out[i] = mean == null ? 0 : Math.round(mean * factor) / factor;
  }
  return out;
}

export function normalizeStreams(
  activityId: string,
  raw: unknown[],
): ActivityStreams {
  const byType = new Map<string, Array<number | null>>();
  for (const item of raw) {
    const parsed = rawStreamSchema.safeParse(item);
    if (!parsed.success || !parsed.data.data) continue;
    byType.set(parsed.data.type, parsed.data.data);
  }

  // Source length = the longest numeric channel we care about.
  const sourceLen = NUMERIC_CHANNELS.reduce(
    (max, key) => Math.max(max, byType.get(key)?.length ?? 0),
    0,
  );

  if (sourceLen === 0) {
    return { intervalsActivityId: activityId, durationSec: null, samples: 0, t: [] };
  }

  const buckets = Math.min(sourceLen, MAX_BUCKETS);

  // Time axis: prefer the recorded `time` stream (seconds from start);
  // otherwise assume 1 Hz sampling so index === seconds.
  const timeData = byType.get("time");
  const durationSec =
    timeData && timeData.length > 0
      ? Math.round(Number(timeData[timeData.length - 1] ?? sourceLen))
      : sourceLen;
  const t: number[] = new Array(buckets);
  for (let i = 0; i < buckets; i++) {
    t[i] = Math.round(((i + 0.5) / buckets) * durationSec);
  }

  const result: ActivityStreams = {
    intervalsActivityId: activityId,
    durationSec,
    samples: buckets,
    t,
  };

  const channel = (key: (typeof NUMERIC_CHANNELS)[number], decimals: number) => {
    const data = byType.get(key);
    return data && data.length > 0 ? downsampleChannel(data, buckets, decimals) : undefined;
  };

  result.watts = channel("watts", 0);
  result.heartrate = channel("heartrate", 0);
  result.cadence = channel("cadence", 0);
  result.altitude = channel("altitude", 1);
  result.velocity = channel("velocity_smooth", 2);

  // Drop channels that were absent so the client can branch on presence.
  for (const key of ["watts", "heartrate", "cadence", "altitude", "velocity"] as const) {
    if (result[key] === undefined) delete result[key];
  }

  return result;
}
