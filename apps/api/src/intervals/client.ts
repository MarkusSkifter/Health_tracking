/**
 * Minimal intervals.icu API client (SPEC §4).
 *
 * Auth: HTTP Basic, username literal "API_KEY", password = the personal API key.
 * Date params are inclusive ISO calendar dates (YYYY-MM-DD).
 *
 * Returns raw `unknown[]` payloads on purpose — normalization into the typed
 * schema happens in a later step, and the raw response is what we persist to the
 * `*_raw` tables so it's never lost.
 */
const DEFAULT_BASE_URL = "https://intervals.icu";

export interface IntervalsClientOptions {
  apiKey: string;
  athleteId: string;
  baseUrl?: string;
}

export class IntervalsClient {
  private readonly authHeader: string;
  private readonly athleteId: string;
  private readonly baseUrl: string;

  constructor(opts: IntervalsClientOptions) {
    this.authHeader = `Basic ${Buffer.from(`API_KEY:${opts.apiKey}`).toString("base64")}`;
    this.athleteId = opts.athleteId;
    this.baseUrl = opts.baseUrl ?? DEFAULT_BASE_URL;
  }

  private async get<T>(path: string, params: Record<string, string>): Promise<T> {
    const url = new URL(`${this.baseUrl}${path}`);
    for (const [key, value] of Object.entries(params)) {
      url.searchParams.set(key, value);
    }

    const res = await fetch(url, {
      headers: { Authorization: this.authHeader, Accept: "application/json" },
    });

    if (!res.ok) {
      const body = await res.text().catch(() => "");
      throw new Error(
        `intervals.icu ${res.status} ${res.statusText} for ${path}` +
          (body ? `: ${body.slice(0, 300)}` : ""),
      );
    }

    return (await res.json()) as T;
  }

  /** Activities in `[oldest, newest]` (inclusive). */
  getActivities(oldest: string, newest: string): Promise<unknown[]> {
    return this.get<unknown[]>(`/api/v1/athlete/${this.athleteId}/activities`, {
      oldest,
      newest,
    });
  }

  /** Wellness records in `[oldest, newest]` (inclusive). */
  getWellness(oldest: string, newest: string): Promise<unknown[]> {
    return this.get<unknown[]>(`/api/v1/athlete/${this.athleteId}/wellness`, {
      oldest,
      newest,
    });
  }

  /** Calendar events in `[oldest, newest]` (inclusive). */
  getEvents(oldest: string, newest: string): Promise<unknown[]> {
    return this.get<unknown[]>(`/api/v1/athlete/${this.athleteId}/events`, {
      oldest,
      newest,
    });
  }

  /**
   * Time-series streams for a single activity (watts, heartrate, cadence, …).
   * Activity-scoped (not athlete-scoped). Returns the raw intervals.icu shape:
   * an array of `{ type, data: [...] }` channels, index-aligned at ~1 Hz.
   */
  getStreams(activityId: string, types?: string[]): Promise<unknown[]> {
    const params = types && types.length > 0 ? { types: types.join(",") } : {};
    return this.get<unknown[]>(`/api/v1/activity/${activityId}/streams`, params);
  }

  /** Delete a calendar event by its intervals.icu numeric id. */
  async deleteEvent(eventId: number): Promise<void> {
    const url = new URL(`${this.baseUrl}/api/v1/athlete/${this.athleteId}/events/${eventId}`);
    const res = await fetch(url, {
      method: "DELETE",
      headers: { Authorization: this.authHeader, Accept: "application/json" },
    });
    if (!res.ok) {
      const body = await res.text().catch(() => "");
      throw new Error(
        `intervals.icu ${res.status} ${res.statusText}` + (body ? `: ${body.slice(0, 300)}` : ""),
      );
    }
  }

  /** Create a calendar event (planned workout). */
  async createEvent(event: {
    start_date_local: string;
    name: string;
    category?: string;
    type?: string;
    moving_time?: number | null;
    icu_training_load?: number;
    description?: string;
  }): Promise<unknown> {
    const url = new URL(`${this.baseUrl}/api/v1/athlete/${this.athleteId}/events`);
    const res = await fetch(url, {
      method: "POST",
      headers: {
        Authorization: this.authHeader,
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify(event),
    });
    if (!res.ok) {
      const body = await res.text().catch(() => "");
      throw new Error(
        `intervals.icu ${res.status} ${res.statusText}` + (body ? `: ${body.slice(0, 300)}` : ""),
      );
    }
    return res.json();
  }
}
