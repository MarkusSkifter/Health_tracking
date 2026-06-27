import type { Activity, AnalyticsDay } from "@health/shared";
import Link from "next/link";
import { fetchActivities, fetchAnalytics } from "../../lib/api";
import { AnalyticsCharts } from "../components/AnalyticsCharts";
import { AnalyticsDailyTable } from "../components/AnalyticsDailyTable";
import { LedgerShell } from "../components/ledger/LedgerShell";

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

function Rule({ label, aside }: { label: string; aside?: string }) {
  return (
    <div className="lx-rule mb-6">
      <span style={{ width: 7, height: 7, background: "var(--signal)", borderRadius: "50%", flex: "none" }} />
      <h2 className="lx-serif" style={{ fontSize: "clamp(24px, 3.5vw, 32px)", fontWeight: 600, letterSpacing: "-0.01em", color: "var(--ink)", flex: "none" }}>{label}</h2>
      {aside && <span className="lx-eyebrow shrink-0">{aside}</span>}
    </div>
  );
}

export default async function AnalyticsPage({ searchParams }: { searchParams: SearchParams }) {
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
    [days, activityList] = await Promise.all([fetchAnalytics(from, to), fetchActivities(from, to)]);
  } catch {
    /* show empty state */
  }

  const prev = shiftMonth(month, -1);
  const next = shiftMonth(month, 1);
  const isCurrentOrFuture = next > thisMonth;

  const ticker = [
    "intervals.icu · connected",
    `${monthLabel(month).toLowerCase()} · ${days.length} days observed`,
    `${activityList.length} sessions`,
    "coros · linked",
  ];

  return (
    <LedgerShell ticker={ticker}>
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="lx-eyebrow">Performance review</p>
          <h1 className="lx-serif mt-2" style={{ fontSize: "clamp(40px, 7vw, 72px)", fontWeight: 600, lineHeight: 0.95, letterSpacing: "-0.02em", color: "var(--ink)" }}>
            {monthLabel(month)}
          </h1>
        </div>
        <div className="flex items-center gap-5">
          <Link href={`/analytics?month=${prev}`} className="lx-eyebrow" style={{ color: "var(--ink-2)" }}>← {monthShort(prev)}</Link>
          {!isCurrentOrFuture && (
            <Link href={`/analytics?month=${next}`} className="lx-eyebrow" style={{ color: "var(--ink-2)" }}>{monthShort(next)} →</Link>
          )}
        </div>
      </header>

      {days.length === 0 ? (
        <div className="mt-12 flex h-56 flex-col items-center justify-center gap-2 text-center lx-leaf">
          <p className="lx-serif" style={{ fontSize: 24, fontWeight: 600, color: "var(--ink-2)" }}>No data for {monthLabel(month)}</p>
          <p className="lx-sans text-sm" style={{ color: "var(--ink-3)" }}>Sync your account to import this month.</p>
        </div>
      ) : (
        <>
          <section className="mt-12">
            <Rule label="Trends" aside={`${days.length} days`} />
            <AnalyticsCharts days={days} activityList={activityList} />
          </section>

          <section className="mt-16">
            <Rule label="Daily log" aside="tap a day to expand" />
            <AnalyticsDailyTable days={days} activityList={activityList} />
          </section>
        </>
      )}
    </LedgerShell>
  );
}
