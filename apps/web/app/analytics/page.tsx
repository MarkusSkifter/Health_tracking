import type { Activity, AnalyticsDay } from "@health/shared";
import Link from "next/link";
import { fetchActivities, fetchAnalytics } from "../../lib/api";
import { AnalyticsCharts } from "../components/AnalyticsCharts";
import { AnalyticsDailyTable } from "../components/AnalyticsDailyTable";

export const revalidate = 60;

type SearchParams = Promise<{ month?: string }>;

function prevMonth(ym: string): string {
  const parts = ym.split("-").map(Number);
  const y = parts[0] ?? new Date().getFullYear();
  const mo = parts[1] ?? new Date().getMonth() + 1;
  const d = new Date(y, mo - 2, 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

function nextMonth(ym: string): string {
  const parts = ym.split("-").map(Number);
  const y = parts[0] ?? new Date().getFullYear();
  const mo = parts[1] ?? new Date().getMonth() + 1;
  const d = new Date(y, mo, 1);
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


export default async function AnalyticsPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const { month: mp } = await searchParams;
  const now = new Date();
  const thisMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
  const month = mp ?? thisMonth;

  const parts = month.split("-").map(Number);
  const year = parts[0] ?? now.getFullYear();
  const m = parts[1] ?? now.getMonth() + 1;
  const from = `${month}-01`;
  const lastDay = new Date(year, m, 0).getDate();
  const to = `${month}-${String(lastDay).padStart(2, "0")}`;

  let days: AnalyticsDay[] = [];
  let activityList: Activity[] = [];
  try {
    [days, activityList] = await Promise.all([
      fetchAnalytics(from, to),
      fetchActivities(from, to),
    ]);
  } catch {
    // empty state shown below
  }

  const prev = prevMonth(month);
  const next = nextMonth(month);
  const isCurrentOrFuture = next > thisMonth;

  return (
    <main className="flex flex-col gap-10">
      {/* Header + month navigation */}
      <header className="flex items-end justify-between gap-4">
        <div>
          <p className="text-xs font-medium uppercase tracking-[0.18em] text-neutral-400">
            Analytics
          </p>
          <h1 className="mt-1 text-2xl font-semibold tracking-tight">
            {monthLabel(month)}
          </h1>
        </div>
        <div className="flex items-center gap-1 text-sm">
          <Link
            href={`/analytics?month=${prev}`}
            className="rounded-lg px-3 py-1.5 text-neutral-500 transition-colors hover:bg-neutral-50 hover:text-neutral-900"
          >
            ← {monthShort(prev)}
          </Link>
          {!isCurrentOrFuture && (
            <Link
              href={`/analytics?month=${next}`}
              className="rounded-lg px-3 py-1.5 text-neutral-500 transition-colors hover:bg-neutral-50 hover:text-neutral-900"
            >
              {monthShort(next)} →
            </Link>
          )}
        </div>
      </header>

      {days.length === 0 ? (
        <p className="text-sm text-neutral-400">No data for {monthLabel(month)}.</p>
      ) : (
        <>
          {/* Chart grid — client component (avoids passing functions to server) */}
          <section>
            <AnalyticsCharts days={days} />
          </section>

          {/* Daily data table — rows with activities are expandable */}
          <section>
            <h2 className="mb-3 text-xs font-medium uppercase tracking-[0.18em] text-neutral-400">
              Daily data
            </h2>
            <AnalyticsDailyTable days={days} activityList={activityList} />
          </section>
        </>
      )}
    </main>
  );
}
