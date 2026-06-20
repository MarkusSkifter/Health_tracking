import type { DailySummary } from "@health/shared";
import { fetchHistory } from "../../lib/api";
import { AcrBadge } from "../components/AcrBadge";

export const dynamic = "force-dynamic";

function shortDate(iso: string): string {
  return new Intl.DateTimeFormat("en-GB", {
    weekday: "short",
    day: "numeric",
    month: "short",
  }).format(new Date(`${iso}T00:00:00`));
}

export default async function HistoryPage() {
  let summaries: DailySummary[];
  try {
    summaries = await fetchHistory();
  } catch {
    summaries = [];
  }

  return (
    <main className="flex flex-col gap-6">
      <header>
        <p className="text-xs font-medium uppercase tracking-[0.18em] text-neutral-400">
          History
        </p>
        <h1 className="mt-1 text-xl font-semibold tracking-tight">Past days</h1>
      </header>

      {summaries.length === 0 ? (
        <p className="text-sm text-neutral-500">No summaries yet.</p>
      ) : (
        <ul className="flex flex-col gap-3">
          {summaries.map((s) => (
            <li key={s.date}>
              <details className="rounded-2xl border border-neutral-200 p-4">
                <summary className="flex list-none items-center justify-between gap-3">
                  <div>
                    <p className="font-medium">{shortDate(s.date)}</p>
                    <p className="text-xs text-neutral-400">
                      load {Math.round(s.trainingLoadDaily)}
                    </p>
                  </div>
                  <AcrBadge ratio={s.acuteChronicRatio} />
                </summary>
                <p className="mt-3 text-sm leading-relaxed text-neutral-700">
                  {s.aiSummaryText}
                </p>
              </details>
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}
