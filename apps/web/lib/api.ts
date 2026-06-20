import type { Activity, AnalyticsDay, DailySummary, TodayResponse } from "@health/shared";

const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:3001";

export async function fetchToday(): Promise<TodayResponse | null> {
  const res = await fetch(`${API_BASE}/api/today`, { cache: "no-store" });
  if (res.status === 404) return null;
  if (!res.ok) throw new Error(`Failed to load today (${res.status})`);
  return (await res.json()) as TodayResponse;
}

export async function fetchHistory(): Promise<DailySummary[]> {
  const res = await fetch(`${API_BASE}/api/history`, { cache: "no-store" });
  if (!res.ok) throw new Error(`Failed to load history (${res.status})`);
  const data = (await res.json()) as { summaries: DailySummary[] };
  return data.summaries;
}

export async function fetchActivities(from: string, to: string): Promise<Activity[]> {
  const res = await fetch(
    `${API_BASE}/api/activities?from=${from}&to=${to}`,
    { cache: "no-store" },
  );
  if (!res.ok) throw new Error(`Failed to load activities (${res.status})`);
  const data = (await res.json()) as { activities: Activity[] };
  return data.activities;
}

export async function fetchAnalytics(from: string, to: string): Promise<AnalyticsDay[]> {
  const res = await fetch(
    `${API_BASE}/api/analytics?from=${from}&to=${to}`,
    { cache: "no-store" },
  );
  if (!res.ok) throw new Error(`Failed to load analytics (${res.status})`);
  const data = (await res.json()) as { days: AnalyticsDay[] };
  return data.days;
}
