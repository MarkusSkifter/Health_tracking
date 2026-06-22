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
      const body = await res.json().catch(() => ({})) as { error?: string };
      return NextResponse.json({ error: body.error ?? `API error ${res.status}` }, { status: 502 });
    }
    return NextResponse.json({ ok: true });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Could not reach API";
    return NextResponse.json({ error: msg }, { status: 502 });
  }
}
