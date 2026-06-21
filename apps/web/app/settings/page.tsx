import { ImportHistoryButton } from "../components/ImportHistoryButton";

export default function SettingsPage() {
  return (
    <main className="flex flex-col gap-6">
      <header>
        <p className="text-xs font-medium uppercase tracking-[0.18em] text-neutral-400">
          Settings
        </p>
        <h1 className="mt-1 text-xl font-semibold tracking-tight">Profile</h1>
      </header>

      <section className="rounded-2xl border border-neutral-200 p-4">
        <h2 className="text-sm font-medium">Account</h2>
        <p className="mt-1 text-sm text-neutral-500">
          v1 runs for a single intervals.icu account configured on the server.
        </p>
      </section>

      <section className="rounded-2xl border border-neutral-200 p-4 flex flex-col gap-3">
        <div>
          <h2 className="text-sm font-medium">Import history</h2>
          <p className="mt-1 text-sm text-neutral-500">
            The daily sync keeps a rolling 7-day window. Use this to backfill your full history from intervals.icu.
          </p>
        </div>
        <ImportHistoryButton />
      </section>

      <section className="rounded-2xl border border-neutral-200 p-4">
        <h2 className="text-sm font-medium">Connect intervals.icu</h2>
        <p className="mt-1 text-sm text-neutral-500">
          Per-account OAuth connection is planned for v2.
        </p>
      </section>

      <p className="text-center text-xs text-neutral-400">Training Insights · v1</p>
    </main>
  );
}
