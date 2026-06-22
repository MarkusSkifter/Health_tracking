import { ImportHistoryButton } from "../components/ImportHistoryButton";
import { TrainingSettings } from "../components/TrainingSettings";

export default function SettingsPage() {
  return (
    <main className="flex flex-col gap-8">
      <header>
        <p className="text-[11px] font-semibold uppercase tracking-widest text-slate-400">Settings</p>
        <h1 className="mt-1 text-2xl font-bold tracking-tight text-slate-900">Account</h1>
      </header>

      <div className="flex flex-col gap-4">
        <section className="rounded-2xl border border-slate-100 bg-white p-6">
          <h2 className="text-sm font-semibold text-slate-900">Data source</h2>
          <p className="mt-1.5 text-sm leading-relaxed text-slate-500">
            v1 runs for a single intervals.icu account configured on the server. Per-account OAuth is planned for v2.
          </p>
        </section>

        <section className="rounded-2xl border border-slate-100 bg-white p-6">
          <h2 className="text-sm font-semibold text-slate-900">Import history</h2>
          <p className="mt-1.5 mb-4 text-sm leading-relaxed text-slate-500">
            The daily sync keeps a rolling 7-day window. Use this to backfill your full history from intervals.icu — up to one year of activities and wellness data.
          </p>
          <ImportHistoryButton />
        </section>

        <section className="rounded-2xl border border-slate-100 bg-white p-6">
          <h2 className="text-sm font-semibold text-slate-900">Training thresholds</h2>
          <p className="mt-1.5 mb-5 text-sm leading-relaxed text-slate-500">
            Set your FTP and run threshold pace so the AI coach can tailor interval targets and zone descriptions to your fitness level.
          </p>
          <TrainingSettings />
        </section>

        <section className="rounded-2xl border border-slate-100 bg-white p-6">
          <h2 className="text-sm font-semibold text-slate-900">Connect intervals.icu</h2>
          <p className="mt-1.5 text-sm leading-relaxed text-slate-500">
            Per-account OAuth connection is planned for v2.
          </p>
        </section>
      </div>

      <p className="text-center text-xs text-slate-300">Training Insights v1</p>
    </main>
  );
}
