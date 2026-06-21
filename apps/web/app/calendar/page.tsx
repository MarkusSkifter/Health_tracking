import type { Activity, PlannedWorkout } from "@health/shared";
import Link from "next/link";
import { fetchActivities, fetchEvents } from "../../lib/api";
import { CalendarGrid } from "../components/CalendarGrid";

export const revalidate = 60;

type SearchParams = Promise<{ month?: string }>;

function prevMonth(ym: string): string {
  const [y, mo] = ym.split("-").map(Number);
  const d = new Date((y ?? 2024), (mo ?? 1) - 2, 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

function nextMonth(ym: string): string {
  const [y, mo] = ym.split("-").map(Number);
  const d = new Date((y ?? 2024), (mo ?? 1), 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

function monthLabel(ym: string): string {
  return new Intl.DateTimeFormat("en-GB", { month: "long", year: "numeric" }).format(
    new Date(`${ym}-15`),
  );
}

function monthShort(ym: string): string {
  return new Intl.DateTimeFormat("en-GB", { month: "short", year: "2-digit" }).format(
    new Date(`${ym}-15`),
  );
}

export default async function CalendarPage({ searchParams }: { searchParams: SearchParams }) {
  const { month: mp } = await searchParams;
  const now = new Date();
  const thisMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
  const month = mp ?? thisMonth;

  const [y, mo] = month.split("-").map(Number);
  const year = y ?? now.getFullYear();
  const monthNum = mo ?? now.getMonth() + 1;
  const from = `${month}-01`;
  const lastDay = new Date(year, monthNum, 0).getDate();
  const to = `${month}-${String(lastDay).padStart(2, "0")}`;

  let activities: Activity[] = [];
  let planned: PlannedWorkout[] = [];
  try {
    [activities, planned] = await Promise.all([
      fetchActivities(from, to),
      fetchEvents(from, to),
    ]);
  } catch {
    // show empty calendar
  }

  const prev = prevMonth(month);
  const next = nextMonth(month);
  const isFuture = next > nextMonth(thisMonth);

  return (
    <main className="flex flex-col gap-8">
      <header className="flex items-end justify-between gap-4">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-widest text-slate-400">Calendar</p>
          <h1 className="mt-1 text-2xl font-bold tracking-tight text-slate-900">
            {monthLabel(month)}
          </h1>
        </div>
        <div className="flex items-center gap-0.5">
          <Link
            href={`/calendar?month=${prev}`}
            className="flex items-center gap-1 rounded-xl px-3 py-1.5 text-sm font-medium text-slate-400 transition-colors hover:bg-white hover:text-slate-700"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M15.75 19.5L8.25 12l7.5-7.5" />
            </svg>
            {monthShort(prev)}
          </Link>
          {!isFuture && (
            <Link
              href={`/calendar?month=${next}`}
              className="flex items-center gap-1 rounded-xl px-3 py-1.5 text-sm font-medium text-slate-400 transition-colors hover:bg-white hover:text-slate-700"
            >
              {monthShort(next)}
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M8.25 4.5l7.5 7.5-7.5 7.5" />
              </svg>
            </Link>
          )}
        </div>
      </header>

      <div className="rounded-2xl border border-slate-100 bg-white p-4">
        <CalendarGrid
          year={year}
          month={monthNum}
          activities={activities}
          planned={planned}
        />
      </div>

      {/* Legend */}
      <div className="flex flex-wrap gap-5 text-xs text-slate-400">
        <span className="flex items-center gap-1.5">
          <span className="h-2.5 w-2.5 rounded-sm bg-emerald-100" /> Run
        </span>
        <span className="flex items-center gap-1.5">
          <span className="h-2.5 w-2.5 rounded-sm bg-amber-100" /> Ride
        </span>
        <span className="flex items-center gap-1.5">
          <span className="h-2.5 w-2.5 rounded-sm bg-blue-100" /> Swim
        </span>
        <span className="flex items-center gap-1.5">
          <span className="h-2.5 w-2.5 rounded-sm bg-slate-100" /> Other
        </span>
        <span className="flex items-center gap-1.5">
          <span className="h-2.5 w-2.5 rounded-sm border border-dashed border-violet-300" /> Planned
        </span>
      </div>
    </main>
  );
}
