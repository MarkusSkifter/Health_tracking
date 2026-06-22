import type { Activity, AnalyticsDay } from "@health/shared";
import Link from "next/link";
import { fetchActivities, fetchAnalytics } from "../../lib/api";
import { AnalyticsCharts } from "../components/AnalyticsCharts";
import { AnalyticsDailyTable } from "../components/AnalyticsDailyTable";

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

export default async function AnalyticsPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const { month: mp } = await searchParams;
  const now = new Date();
  const thisMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
  const month = mp ?? thisMonth;

  const [y, m] = month.split("-").map(Number);
  const year = y ?? now.getFullYear();
  const mo = m ?? now.getMonth() + 1;
  const from = `${month}-01`;
  const lastDay = new Date(year, mo, 0).getDate();
  const to = `${month}-${String(lastDay).padStart(2, "0")}`;

  let days: AnalyticsDay[] = [];
  let activityList: Activity[] = [];
  try {
    [days, activityList] = await Promise.all([
      fetchAnalytics(from, to),
      fetchActivities(from, to),
    ]);
  } catch {
    // show empty state
  }

  const prev = prevMonth(month);
  const next = nextMonth(month);
  const isCurrentOrFuture = next > thisMonth;

  const navBtnStyle = "flex items-center gap-1 rounded-xl px-3 py-1.5 text-sm font-medium transition-colors";

  return (
    <main className="flex flex-col gap-8">
      <header className="flex items-end justify-between gap-4">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-widest" style={{ color: "rgba(255,255,255,0.4)" }}>Analytics</p>
          <h1 className="mt-1 text-2xl font-bold tracking-tight text-white">
            {monthLabel(month)}
          </h1>
        </div>
        <div className="flex items-center gap-0.5">
          <Link
            href={`/analytics?month=${prev}`}
            className={navBtnStyle}
            style={{ color: "rgba(255,255,255,0.4)" }}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M15.75 19.5L8.25 12l7.5-7.5" />
            </svg>
            {monthShort(prev)}
          </Link>
          {!isCurrentOrFuture && (
            <Link
              href={`/analytics?month=${next}`}
              className={navBtnStyle}
              style={{ color: "rgba(255,255,255,0.4)" }}
            >
              {monthShort(next)}
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M8.25 4.5l7.5 7.5-7.5 7.5" />
              </svg>
            </Link>
          )}
        </div>
      </header>

      {days.length === 0 ? (
        <div
          className="flex h-48 flex-col items-center justify-center gap-2 rounded-2xl text-center"
          style={{ border: "0.5px solid rgba(255,255,255,0.07)", background: "rgba(255,255,255,0.03)" }}
        >
          <p className="text-sm font-medium" style={{ color: "rgba(255,255,255,0.4)" }}>No data for {monthLabel(month)}</p>
          <p className="text-xs" style={{ color: "rgba(255,255,255,0.2)" }}>Sync your account to import data</p>
        </div>
      ) : (
        <>
          <section>
            <AnalyticsCharts days={days} />
          </section>

          <section>
            <p className="mb-3 text-[11px] font-semibold uppercase tracking-widest" style={{ color: "rgba(255,255,255,0.4)" }}>
              Daily log
            </p>
            <AnalyticsDailyTable days={days} activityList={activityList} />
          </section>
        </>
      )}
    </main>
  );
}
