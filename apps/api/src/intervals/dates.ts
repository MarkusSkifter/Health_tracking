/** Athlete-local timezone for day boundaries (SPEC: early-morning local job). */
export const ATHLETE_TIMEZONE = "Europe/Copenhagen";

const DAY_MS = 24 * 60 * 60 * 1000;

/** Format an instant as a YYYY-MM-DD calendar date in the given timezone. */
export function isoDateInTimeZone(instant: Date, timeZone: string): string {
  // en-CA renders as YYYY-MM-DD.
  return new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(instant);
}

/** Inclusive rolling window ending today (athlete-local), `days` long. */
export function rollingWindow(
  days: number,
  now: Date = new Date(),
  timeZone: string = ATHLETE_TIMEZONE,
): { oldest: string; newest: string } {
  const newest = isoDateInTimeZone(now, timeZone);
  const oldest = isoDateInTimeZone(new Date(now.getTime() - days * DAY_MS), timeZone);
  return { oldest, newest };
}
