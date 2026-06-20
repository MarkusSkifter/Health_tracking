import type { TodayResponse } from "@health/shared";
import { fetchToday } from "../lib/api";
import { AcrBadge } from "./components/AcrBadge";
import { Sparkline } from "./components/Sparkline";

export const dynamic = "force-dynamic";

function longDate(iso: string): string {
  return new Intl.DateTimeFormat("en-GB", {
    weekday: "long",
    day: "numeric",
    month: "long",
  }).format(new Date(`${iso}T00:00:00`));
}

export default async function TodayPage() {
  let today: TodayResponse | null;
  try {
    today = await fetchToday();
  } catch {
    return (
      <EmptyState
        title="Can't reach the server"
        message="The API isn't responding. Start it with “pnpm dev:api”."
      />
    );
  }

  if (!today) {
    return (
      <EmptyState
        title="No summary yet"
        message="Run the daily job (pnpm --filter @health/api job:daily) to generate your first summary."
      />
    );
  }

  const { summary, trend } = today;

  return (
    <main className="flex flex-col gap-9">
      <header>
        <p className="text-xs font-medium uppercase tracking-[0.18em] text-neutral-400">
          Today
        </p>
        <h1 className="mt-1 text-xl font-semibold tracking-tight">
          {longDate(summary.date)}
        </h1>
      </header>

      <section className="flex items-end justify-between">
        <div>
          <p className="text-6xl font-semibold tabular-nums tracking-tight">
            {Math.round(summary.trainingLoadDaily)}
          </p>
          <p className="mt-1 text-sm text-neutral-500">Training load today</p>
        </div>
        <AcrBadge ratio={summary.acuteChronicRatio} />
      </section>

      <section>
        <Sparkline values={trend.map((t) => t.trainingLoadDaily)} />
        <div className="mt-1.5 flex justify-between text-xs text-neutral-400">
          <span>7-day {Math.round(summary.load7d)}</span>
          <span>28-day {Math.round(summary.load28d)}</span>
        </div>
      </section>

      <section>
        <p className="text-[15px] leading-relaxed text-neutral-800">
          {summary.aiSummaryText}
        </p>
      </section>
    </main>
  );
}

function EmptyState({ title, message }: { title: string; message: string }) {
  return (
    <main className="flex min-h-[60dvh] flex-col items-center justify-center gap-2 text-center">
      <h1 className="text-lg font-semibold">{title}</h1>
      <p className="max-w-xs text-sm text-neutral-500">{message}</p>
    </main>
  );
}
