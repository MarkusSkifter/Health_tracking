import { ImportHistoryButton } from "../components/ImportHistoryButton";
import { PushNotificationToggle } from "../components/PushNotificationToggle";
import { TrainingSettings } from "../components/TrainingSettings";
import { AthleteProfile } from "../components/AthleteProfile";
import { TrainingGoals } from "../components/TrainingGoals";

export default function SettingsPage() {
  return (
    <main className="flex flex-col gap-8">
      <header>
        <p className="text-[11px] font-semibold uppercase tracking-widest" style={{ color: "rgba(255,255,255,0.4)" }}>Settings</p>
        <h1 className="mt-1 text-2xl font-bold tracking-tight text-white">Account</h1>
      </header>

      <div className="flex flex-col gap-4">
        <section className="glass-card rounded-2xl p-6">
          <h2 className="text-sm font-semibold text-white">Athlete profile</h2>
          <p className="mt-1.5 mb-5 text-sm leading-relaxed" style={{ color: "rgba(255,255,255,0.45)" }}>
            Describe yourself and your training background. The AI coach uses this to personalise suggestions to your fitness level and schedule.
          </p>
          <AthleteProfile />
        </section>

        <section className="glass-card rounded-2xl p-6">
          <h2 className="text-sm font-semibold text-white">Training goals</h2>
          <p className="mt-1.5 mb-5 text-sm leading-relaxed" style={{ color: "rgba(255,255,255,0.45)" }}>
            Add races or events you are training toward. The AI coach will periodize your training — base, build, peak, taper — based on how far away each goal is.
          </p>
          <TrainingGoals />
        </section>

        <section className="glass-card rounded-2xl p-6">
          <h2 className="text-sm font-semibold text-white">Training thresholds</h2>
          <p className="mt-1.5 mb-5 text-sm leading-relaxed" style={{ color: "rgba(255,255,255,0.45)" }}>
            Set your FTP and run threshold pace so the AI coach can tailor interval targets and zone descriptions to your fitness level.
          </p>
          <TrainingSettings />
        </section>

        <section className="glass-card rounded-2xl p-6">
          <h2 className="text-sm font-semibold text-white">Data source</h2>
          <p className="mt-1.5 text-sm leading-relaxed" style={{ color: "rgba(255,255,255,0.45)" }}>
            v1 runs for a single intervals.icu account configured on the server. Per-account OAuth is planned for v2.
          </p>
        </section>

        <section className="glass-card rounded-2xl p-6">
          <h2 className="text-sm font-semibold text-white">Import history</h2>
          <p className="mt-1.5 mb-4 text-sm leading-relaxed" style={{ color: "rgba(255,255,255,0.45)" }}>
            The daily sync keeps a rolling 7-day window. Use this to backfill your full history from intervals.icu — up to one year of activities and wellness data.
          </p>
          <ImportHistoryButton />
        </section>

        <section className="glass-card rounded-2xl p-6">
          <h2 className="mb-4 text-sm font-semibold text-white">Daily notifications</h2>
          <PushNotificationToggle />
          <p className="mt-4 text-xs" style={{ color: "rgba(255,255,255,0.3)" }}>
            On iPhone, the app must be added to your Home Screen first: tap the Share icon in Safari, then "Add to Home Screen."
          </p>
        </section>

        <section className="glass-card rounded-2xl p-6">
          <h2 className="text-sm font-semibold text-white">Connect intervals.icu</h2>
          <p className="mt-1.5 text-sm leading-relaxed" style={{ color: "rgba(255,255,255,0.45)" }}>
            Per-account OAuth connection is planned for v2.
          </p>
        </section>
      </div>

      <p className="text-center text-xs" style={{ color: "rgba(255,255,255,0.2)" }}>Training Insights v1</p>
    </main>
  );
}
