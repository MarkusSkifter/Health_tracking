import type { Activity, PlannedWorkout } from "@health/shared";
import Link from "next/link";
import { fetchActivities, fetchEvents } from "../../lib/api";
import { CalendarGrid } from "../components/CalendarGrid";
import { LedgerShell } from "../components/ledger/LedgerShell";
import { intensity, type IntensityKey } from "../components/ledger/shared";

export const revalidate = 60;

type SearchParams = Promise<{ month?: string }>;

function shiftMonth(ym: string, delta: number): string {
  const [y, mo] = ym.split("-").map(Number);
  const d = new Date((y ?? 2024), (mo ?? 1) - 1 + delta, 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}
function monthLabel(ym: string): string {
  return new Intl.DateTimeFormat("en-GB", { month: "long", year: "numeric" }).format(new Date(`${ym}-15`));
}
function monthShort(ym: string): string {
  return new Intl.DateTimeFormat("en-GB", { month: "short", year: "2-digit" }).format(new Date(`${ym}-15`));
}

const LEGEND: Array<{ key: IntensityKey; label: string }> = [
  { key: "easy", label: "Recovery" },
  { key: "aerobic", label: "Endurance" },
  { key: "threshold", label: "Threshold" },
  { key: "vo2", label: "VO₂max" },
];

export default async function CalendarPage({ searchParams }: { searchParams: SearchParams }) {
  const { month: mp } = await searchParams;
  const thisMonth = new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/Copenhagen", year: "numeric", month: "2-digit" }).format(new Date()).slice(0, 7);
  const month = mp ?? thisMonth;

  const [y, mo] = month.split("-").map(Number);
  const year = y ?? new Date().getFullYear();
  const monthNum = mo ?? (new Date().getMonth() + 1);
  const from = `${month}-01`;
  const lastDay = new Date(year, monthNum, 0).getDate();
  const to = `${month}-${String(lastDay).padStart(2, "0")}`;

  let activities: Activity[] = [];
  let planned: PlannedWorkout[] = [];
  try {
    [activities, planned] = await Promise.all([fetchActivities(from, to), fetchEvents(from, to)]);
  } catch {
    /* show empty calendar */
  }

  const prev = shiftMonth(month, -1);
  const next = shiftMonth(month, 1);
  const isFuture = next > shiftMonth(thisMonth, 1);

  const ticker = [
    "intervals.icu · connected",
    `${monthLabel(month).toLowerCase()} · ${activities.length} sessions logged`,
    `${planned.length} planned`,
    "coros · linked",
  ];

  return (
    <LedgerShell ticker={ticker}>
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="lx-eyebrow">Training log</p>
          <h1 className="lx-serif mt-2" style={{ fontSize: "clamp(40px, 7vw, 72px)", fontWeight: 600, lineHeight: 0.95, letterSpacing: "-0.02em", color: "var(--ink)" }}>
            {monthLabel(month)}
          </h1>
        </div>
        <div className="flex items-center gap-5">
          <Link href={`/calendar?month=${prev}`} className="lx-eyebrow transition-colors" style={{ color: "var(--ink-2)" }}>
            ← {monthShort(prev)}
          </Link>
          {!isFuture && (
            <Link href={`/calendar?month=${next}`} className="lx-eyebrow transition-colors" style={{ color: "var(--ink-2)" }}>
              {monthShort(next)} →
            </Link>
          )}
        </div>
      </header>

      <div className="mt-8">
        <CalendarGrid year={year} month={monthNum} activities={activities} planned={planned} />
      </div>

      {/* Legend */}
      <div className="mt-5 flex flex-wrap items-center gap-x-6 gap-y-2">
        {LEGEND.map((l) => (
          <span key={l.key} className="lx-eyebrow flex items-center gap-1.5" style={{ color: "var(--ink-3)" }}>
            <span style={{ width: 8, height: 8, borderRadius: "50%", background: `var(${intensity(l.key).varName})` }} />
            {l.label}
          </span>
        ))}
        <span className="lx-eyebrow ml-auto flex items-center gap-4" style={{ color: "var(--ink-4)" }}>
          <span className="flex items-center gap-1.5"><span style={{ width: 8, height: 8, borderRadius: "50%", background: "var(--ink-3)" }} /> completed</span>
          <span className="flex items-center gap-1.5"><span style={{ width: 8, height: 8, borderRadius: "50%", border: "1.5px solid var(--ink-3)" }} /> planned</span>
        </span>
      </div>
    </LedgerShell>
  );
}
