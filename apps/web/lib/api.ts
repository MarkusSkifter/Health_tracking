import type { Activity, AiWeekPlan, AnalyticsDay, AthleteProfile, DailySummary, PlannedWorkout, TodayResponse, TrainingGoal } from "@health/shared";

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

export async function fetchUpcoming(): Promise<{ workouts: PlannedWorkout[]; suggestions: AiWeekPlan | null }> {
  try {
    const res = await fetch(`${API_BASE}/api/upcoming`, { cache: "no-store" });
    if (!res.ok) return { workouts: [], suggestions: null };
    return (await res.json()) as { workouts: PlannedWorkout[]; suggestions: AiWeekPlan | null };
  } catch {
    return { workouts: [], suggestions: null };
  }
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

export async function fetchEvents(from: string, to: string): Promise<PlannedWorkout[]> {
  try {
    const res = await fetch(
      `${API_BASE}/api/events?from=${from}&to=${to}`,
      { cache: "no-store" },
    );
    if (!res.ok) return [];
    const data = (await res.json()) as { workouts: PlannedWorkout[] };
    return data.workouts;
  } catch {
    return [];
  }
}

export async function fetchProfile(): Promise<AthleteProfile> {
  const res = await fetch(`${API_BASE}/api/profile`, { cache: "no-store" });
  if (!res.ok) return { bio: null, weeklyTrainingHours: null, trainingDaysPerWeek: null };
  return (await res.json()) as AthleteProfile;
}

export async function saveProfile(profile: AthleteProfile): Promise<void> {
  const res = await fetch(`${API_BASE}/api/profile`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(profile),
  });
  if (!res.ok) throw new Error("Failed to save profile");
}

export async function fetchGoals(): Promise<(TrainingGoal & { isPast: boolean })[]> {
  const res = await fetch(`${API_BASE}/api/goals`, { cache: "no-store" });
  if (!res.ok) return [];
  const data = (await res.json()) as { goals: (TrainingGoal & { isPast: boolean })[] };
  return data.goals;
}

export async function createGoal(goal: { eventName: string; eventType?: string | null; targetDate: string; notes?: string | null }): Promise<string> {
  const res = await fetch(`${API_BASE}/api/goals`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(goal),
  });
  if (!res.ok) throw new Error("Failed to create goal");
  const data = (await res.json()) as { id: string };
  return data.id;
}

export async function deleteGoal(id: string): Promise<void> {
  const res = await fetch(`${API_BASE}/api/goals/${id}`, { method: "DELETE" });
  if (!res.ok) throw new Error("Failed to delete goal");
}
