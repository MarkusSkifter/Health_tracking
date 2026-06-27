import { describe, expect, it } from "vitest";
import { MAX_BUCKETS, normalizeStreams } from "./streams";

// intervals.icu returns an array of channels, each `{ type, data }`, index-aligned.
function channel(type: string, data: Array<number | null>) {
  return { type, data };
}

describe("normalizeStreams", () => {
  it("keeps short streams at full resolution and aligns channels", () => {
    const raw = [
      channel("time", [0, 1, 2, 3]),
      channel("watts", [100, 200, 300, 400]),
      channel("heartrate", [120, 121, 122, 123]),
    ];
    const s = normalizeStreams("i1", raw);
    expect(s.intervalsActivityId).toBe("i1");
    expect(s.samples).toBe(4);
    expect(s.watts).toEqual([100, 200, 300, 400]);
    expect(s.heartrate).toEqual([120, 121, 122, 123]);
    expect(s.durationSec).toBe(3);
    expect(s.t).toHaveLength(4);
  });

  it("omits channels that were not recorded", () => {
    const s = normalizeStreams("i2", [channel("heartrate", [100, 110, 120])]);
    expect(s.heartrate).toBeDefined();
    expect(s.watts).toBeUndefined();
    expect(s.cadence).toBeUndefined();
  });

  it("downsamples long streams to MAX_BUCKETS by averaging", () => {
    // 4000 samples ramping 0..3999 → each bucket averages its slice.
    const data = Array.from({ length: 4000 }, (_, i) => i);
    const s = normalizeStreams("i3", [channel("watts", data)]);
    expect(s.samples).toBe(MAX_BUCKETS);
    expect(s.watts).toHaveLength(MAX_BUCKETS);
    // First bucket covers indices 0..9 → mean 4.5 → rounds to 5 (watts: 0 decimals).
    expect(s.watts![0]).toBe(5);
    // Monotonic ramp stays monotonic after bucketing.
    expect(s.watts![MAX_BUCKETS - 1]!).toBeGreaterThan(s.watts![0]!);
  });

  it("averages around null gaps without dropping the bucket", () => {
    const s = normalizeStreams("i4", [channel("watts", [100, null, 200, null])]);
    expect(s.watts).toEqual([100, 0, 200, 0]);
  });

  it("rounds velocity to 2dp and altitude to 1dp", () => {
    const s = normalizeStreams("i5", [
      channel("velocity_smooth", [5.123456, 6.987654]),
      channel("altitude", [10.04, 12.66]),
    ]);
    expect(s.velocity).toEqual([5.12, 6.99]);
    expect(s.altitude).toEqual([10, 12.7]);
  });

  it("returns an empty result when there are no numeric channels", () => {
    const s = normalizeStreams("i6", [channel("latlng", [])]);
    expect(s.samples).toBe(0);
    expect(s.t).toEqual([]);
    expect(s.durationSec).toBeNull();
  });

  it("falls back to 1 Hz duration when no time stream is present", () => {
    const s = normalizeStreams("i7", [channel("watts", [1, 2, 3, 4, 5])]);
    expect(s.durationSec).toBe(5);
  });
});
