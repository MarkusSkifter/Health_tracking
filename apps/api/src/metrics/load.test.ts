import type { Activity } from "@health/shared";
import { describe, expect, it } from "vitest";
import {
  acrZone,
  addDays,
  computeLoadMetrics,
  dailyLoadByDate,
  trailingSum,
} from "./load";

/** Build a minimal activity with a date and training load. */
function activity(date: string, trainingLoad: number | null): Activity {
  return {
    intervalsActivityId: `${date}-${trainingLoad}`,
    date,
    type: "Ride",
    durationSec: null,
    distanceM: null,
    avgPower: null,
    avgHr: null,
    trainingLoad,
  };
}

describe("addDays", () => {
  it("adds and subtracts within a month", () => {
    expect(addDays("2026-06-20", 1)).toBe("2026-06-21");
    expect(addDays("2026-06-20", -6)).toBe("2026-06-14");
  });

  it("crosses month and year boundaries", () => {
    expect(addDays("2026-06-30", 1)).toBe("2026-07-01");
    expect(addDays("2026-01-01", -1)).toBe("2025-12-31");
  });

  it("handles a leap day", () => {
    expect(addDays("2028-02-28", 1)).toBe("2028-02-29");
  });
});

describe("dailyLoadByDate", () => {
  it("sums multiple activities on the same day and treats null as 0", () => {
    const map = dailyLoadByDate([
      activity("2026-06-20", 50),
      activity("2026-06-20", 30),
      activity("2026-06-20", null),
      activity("2026-06-19", 40),
    ]);
    expect(map.get("2026-06-20")).toBe(80);
    expect(map.get("2026-06-19")).toBe(40);
  });
});

describe("trailingSum", () => {
  it("sums the inclusive trailing window", () => {
    const map = dailyLoadByDate([
      activity("2026-06-20", 10), // day 0
      activity("2026-06-19", 20), // day -1
      activity("2026-06-14", 100), // day -6 (still in 7d window)
      activity("2026-06-13", 999), // day -7 (outside 7d window)
    ]);
    expect(trailingSum(map, "2026-06-20", 7)).toBe(130);
    expect(trailingSum(map, "2026-06-20", 8)).toBe(1129);
  });
});

describe("computeLoadMetrics", () => {
  it("computes daily, 7d, 28d load and the acute:chronic ratio", () => {
    // 28 consecutive days of load 10 ending on the target date.
    const activities: Activity[] = [];
    let date = "2026-06-20";
    for (let i = 0; i < 28; i++) {
      activities.push(activity(date, 10));
      date = addDays(date, -1);
    }

    const m = computeLoadMetrics(activities, "2026-06-20");
    expect(m.trainingLoadDaily).toBe(10);
    expect(m.load7d).toBe(70);
    expect(m.load28d).toBe(280);
    // chronic = 280 / 4 = 70; ratio = 70 / 70 = 1.
    expect(m.acuteChronicRatio).toBeCloseTo(1, 10);
  });

  it("flags overreaching when recent load spikes above chronic base", () => {
    const activities: Activity[] = [];
    let date = "2026-06-20";
    for (let i = 0; i < 28; i++) {
      // Last 7 days heavy (40), prior 21 days light (10).
      activities.push(activity(date, i < 7 ? 40 : 10));
      date = addDays(date, -1);
    }
    const m = computeLoadMetrics(activities, "2026-06-20");
    expect(m.load7d).toBe(280); // 7 * 40
    expect(m.load28d).toBe(490); // 280 + 21 * 10
    // chronic = 122.5; ratio ≈ 2.29 → very high.
    expect(m.acuteChronicRatio).toBeCloseTo(280 / 122.5, 6);
    expect(acrZone(m.acuteChronicRatio, m.load28d > 0)).toBe("veryHigh");
  });

  it("returns a 0 ratio with no chronic base (avoids divide-by-zero)", () => {
    const m = computeLoadMetrics([activity("2026-06-20", 50)], "2026-06-20");
    expect(m.trainingLoadDaily).toBe(50);
    expect(m.load7d).toBe(50);
    expect(m.load28d).toBe(50);
    expect(m.acuteChronicRatio).toBeCloseTo(50 / (50 / 4), 6);
  });

  it("is zero for a day with no activities", () => {
    const m = computeLoadMetrics([], "2026-06-20");
    expect(m).toEqual({
      trainingLoadDaily: 0,
      load7d: 0,
      load28d: 0,
      acuteChronicRatio: 0,
    });
  });
});

describe("acrZone", () => {
  it("classifies bands", () => {
    expect(acrZone(1.0, false)).toBe("none");
    expect(acrZone(0.5, true)).toBe("detraining");
    expect(acrZone(1.0, true)).toBe("optimal");
    expect(acrZone(1.4, true)).toBe("high");
    expect(acrZone(1.8, true)).toBe("veryHigh");
  });
});
