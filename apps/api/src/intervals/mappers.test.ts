import { describe, expect, it } from "vitest";
import { toActivity, toWellness } from "./mappers";

// Trimmed real intervals.icu payloads (athlete i307137 sample).
const rawActivity = {
  id: "i158151234",
  start_date_local: "2026-06-14T09:07:19",
  start_date: "2026-06-14T07:07:19Z",
  type: "Ride",
  name: "Morning Ride",
  moving_time: 5283,
  elapsed_time: 5604,
  distance: 42387.43,
  icu_average_watts: 155,
  icu_weighted_avg_watts: 195,
  average_heartrate: 130,
  max_heartrate: 172,
  icu_training_load: 54,
};

const rawWellness = {
  id: "2026-06-20",
  ctl: 64.47,
  atl: 60.06,
  restingHR: 58,
  hrv: null,
  sleepSecs: 31020,
  steps: null,
  weight: null,
  vo2max: null,
};

describe("toActivity", () => {
  it("maps the real activity payload to a normalized row", () => {
    expect(toActivity(rawActivity, 1)).toEqual({
      userId: 1,
      intervalsActivityId: "i158151234",
      date: "2026-06-14",
      type: "Ride",
      durationSec: 5283,
      distanceM: 42387.43,
      avgPower: 155,
      avgHr: 130,
      trainingLoad: 54,
    });
  });

  it("falls back to elapsed_time and rounds fractional power/HR", () => {
    const row = toActivity(
      {
        id: "i2",
        start_date_local: "2026-06-15T06:00:00",
        type: "Run",
        moving_time: null,
        elapsed_time: 3601,
        icu_average_watts: 240.6,
        average_heartrate: 145.4,
        icu_training_load: 42,
      },
      7,
    );
    expect(row.durationSec).toBe(3601);
    expect(row.avgPower).toBe(241);
    expect(row.avgHr).toBe(145);
    expect(row.distanceM).toBeNull();
  });

  it("uses average_watts when icu_average_watts is absent", () => {
    const row = toActivity(
      {
        id: "i3",
        start_date_local: "2026-06-16T06:00:00",
        type: "Ride",
        average_watts: 180,
      },
      1,
    );
    expect(row.avgPower).toBe(180);
    expect(row.trainingLoad).toBeNull();
  });
});

describe("toWellness", () => {
  it("maps the real wellness payload (camelCase) to a normalized row", () => {
    expect(toWellness(rawWellness, 1)).toEqual({
      userId: 1,
      date: "2026-06-20",
      restingHr: 58,
      hrv: null,
      sleepSec: 31020,
      steps: null,
      weightKg: null,
    });
  });
});
