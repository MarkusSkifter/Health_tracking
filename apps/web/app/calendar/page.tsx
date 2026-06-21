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
          <p className="text-xs font-medium uppercase tracking-[0.18em] text-neutral-400">
            Calendar
          </p>
          <h1 className="mt-1 text-2xl font-semibold tracking-tight">
            {monthLabel(month)}
          </h1>
        </div>
        <div className="flex items-center gap-1 text-sm">
          <Link
            href={`/calendar?month=${prev}`}
            className="rounded-lg px-3 py-1.5 text-neutral-500 transition-colors hover:bg-neutral-50 hover:text-neutral-900"
          >
            &larr; {monthShort(prev)}
          </Link>
          {!isFuture && (
            <Link
              href={`/calendar?month=${next}`}
              className="rounded-lg px-3 py-1.5 text-neutral-500 transition-colors hover:bg-neutral-50 hover:text-neutral-900"
            >
              {monthShort(next)} &rarr;
            </Link>
          )}
        </div>
      </header>

      <CalendarGrid
        year={year}
        month={monthNum}
        activities={activities}
        planned={planned}
      />

      <div className="flex flex-wrap gap-4 text-xs text-neutral-400">
        <span className="flex items-center gap-1.5">
          <span className="h-3 w-3 rounded bg-emerald-100" /> Run
        </span>
        <span className="flex items-center gap-1.5">
          <span className="h-3 w-3 rounded bg-amber-100" /> Ride
        </span>
        <span className="flex items-center gap-1.5">
          <span className="h-3 w-3 rounded bg-blue-100" /> Swim
        </span>
        <span className="flex items-center gap-1.5">
          <span className="h-3 w-3 rounded bg-violet-100" /> Other
        </span>
        <span className="flex items-center gap-1.5">
          <span className="h-3 w-3 rounded border border-dashed border-violet-300" /> Planned
        </span>
      </div>
    </main>
  );
}
