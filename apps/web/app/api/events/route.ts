import { NextResponse } from "next/server";

const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:3001";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const from = searchParams.get("from") ?? "";
  const to = searchParams.get("to") ?? "";
  try {
    const res = await fetch(`${API_BASE}/api/events?from=${from}&to=${to}`);
    if (!res.ok) return NextResponse.json({ workouts: [] });
    return NextResponse.json(await res.json());
  } catch {
    return NextResponse.json({ workouts: [] });
  }
}
