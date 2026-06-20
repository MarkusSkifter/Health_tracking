import type { DailySummary, TodayResponse } from "@health/shared";

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
