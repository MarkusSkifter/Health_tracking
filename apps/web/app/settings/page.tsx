import type { ReactNode } from "react";
import { ImportHistoryButton } from "../components/ImportHistoryButton";
import { PushNotificationToggle } from "../components/PushNotificationToggle";
import { TrainingSettings } from "../components/TrainingSettings";
import { AthleteProfile } from "../components/AthleteProfile";
import { TrainingGoals } from "../components/TrainingGoals";
import { LedgerShell } from "../components/ledger/LedgerShell";

function Row({ title, desc, children }: { title: string; desc: ReactNode; children?: ReactNode }) {
  return (
    <section className="grid gap-5 py-9 md:grid-cols-[300px_1fr] md:gap-14" style={{ borderTop: "1px solid var(--line)" }}>
      <div>
        <h2 className="lx-serif" style={{ fontSize: 26, fontWeight: 600, letterSpacing: "-0.01em", color: "var(--ink)" }}>{title}</h2>
        <p className="lx-sans mt-2 text-sm leading-relaxed" style={{ color: "var(--ink-2)" }}>{desc}</p>
      </div>
      {children && <div>{children}</div>}
    </section>
  );
}

export default function SettingsPage() {
  return (
    <LedgerShell>
      <header>
        <p className="lx-eyebrow">Settings</p>
        <h1 className="lx-serif mt-2" style={{ fontSize: "clamp(40px, 7vw, 72px)", fontWeight: 600, lineHeight: 0.95, letterSpacing: "-0.02em", color: "var(--ink)" }}>
          Account
        </h1>
      </header>

      <div className="mt-8">
        <Row title="Athlete profile" desc="Describe yourself and your training background. The AI coach uses this to personalise suggestions to your fitness level and schedule.">
          <AthleteProfile />
        </Row>

        <Row title="Training goals" desc="Add races or events you're training toward. The coach periodizes your training — base, build, peak, taper — based on how far away each goal is.">
          <TrainingGoals />
        </Row>

        <Row title="Training thresholds" desc="Set your FTP and run threshold pace so the coach can tailor interval targets and zone descriptions to your fitness level.">
          <TrainingSettings />
        </Row>

        <Row title="Import history" desc="The daily sync keeps a rolling 7-day window. Use this to backfill your full history from intervals.icu — up to a year of activities and wellness data.">
          <ImportHistoryButton />
        </Row>

        <Row
          title="Daily notifications"
          desc="On iPhone, add the app to your Home Screen first: tap Share in Safari, then “Add to Home Screen.”"
        >
          <PushNotificationToggle />
        </Row>

        <Row title="Data source" desc="v1 runs for a single intervals.icu account configured on the server. Per-account OAuth is planned for v2." />

        <Row title="Connect intervals.icu" desc="Per-account OAuth connection is planned for v2." />
      </div>

      <p className="lx-mono mt-10 text-center text-[11px]" style={{ color: "var(--ink-4)" }}>Training Ledger · v1</p>
    </LedgerShell>
  );
}
