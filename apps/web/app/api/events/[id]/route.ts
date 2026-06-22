import { NextRequest, NextResponse } from "next/server";

const API_BASE = process.env.API_BASE_URL ?? "http://localhost:3001";

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const res = await fetch(`${API_BASE}/api/events/${id}`, { method: "DELETE" });
  const data = await res.json().catch(() => ({})) as { error?: string };
  return NextResponse.json(data, { status: res.status });
}
