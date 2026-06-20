import { NextResponse } from "next/server";

const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:3001";

export async function POST() {
  try {
    const res = await fetch(`${API_BASE}/api/ingest`, { method: "POST" });
    if (!res.ok) {
      return NextResponse.json({ error: "Ingest failed" }, { status: 502 });
    }
    const data = await res.json();
    return NextResponse.json(data);
  } catch {
    return NextResponse.json({ error: "Could not reach API" }, { status: 502 });
  }
}
