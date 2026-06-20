import type { AiDaySuggestion } from "@health/shared";
import { NextResponse } from "next/server";

const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:3001";

export async function POST(request: Request) {
  try {
    const day = (await request.json()) as AiDaySuggestion;
    const res = await fetch(`${API_BASE}/api/calendar/event`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(day),
    });
    if (!res.ok) {
      return NextResponse.json({ error: "Failed to create event" }, { status: 502 });
    }
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "Could not reach API" }, { status: 502 });
  }
}
