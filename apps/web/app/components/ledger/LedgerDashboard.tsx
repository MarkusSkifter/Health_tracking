"use client";

import type { ReactNode } from "react";
import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import type { FitnessPoint } from "./fitness";
import { FitnessProjection } from "./FitnessProjection";
import { Macrocycle, type MacroWeek } from "./Macrocycle";
import { ReadinessHeader, type ReadinessHeaderProps } from "./ReadinessHeader";
import { ReadinessRing } from "./ReadinessRing";
import { Reveal } from "./Reveal";
import { VitalsMatrix, type VitalTile } from "./VitalsMatrix";
import { WeekRibbon, type RibbonDay } from "./WeekRibbon";
import { WhatsNextCard, type NextSession } from "./WhatsNextCard";

export interface LedgerData {
  header: ReadinessHeaderProps;
  nextSession: NextSession | null;
  fitness: FitnessPoint[];
  vitals: VitalTile[];
  ribbon: RibbonDay[];
  macro: MacroWeek[];
  goal: { eventName: string; daysOut: number; phase: string } | null;
  ticker: string[];
}

const NAV = [
  { href: "/", label: "Today" },
  { href: "/calendar", label: "Calendar" },
  { href: "/analytics", label: "Analytics" },
  { href: "/settings", label: "Settings" },
];

export function LedgerDashboard({ data }: { data: LedgerData }) {
  return (
    <div className="ledger relative min-h-dvh pb-16">
      <Masthead />

      <div className="mx-auto max-w-[1240px] px-5 md:px-10">
        {/* Deck — a true dashboard above the fold on laptop, stacked on phone */}
        <div className="grid gap-12 lg:grid-cols-12 lg:gap-14 lg:items-start">
          <div className="lg:col-span-7">
            <ReadinessHeader {...data.header} />
          </div>
          <div className="flex flex-col gap-10 lg:col-span-5 lg:pt-24">
            <ReadinessRing readiness={data.header.readiness} />
            {data.nextSession && (
              <div className="w-full">
                <div className="lx-rule mb-5">
                  <span style={{ width: 7, height: 7, background: "var(--signal)", borderRadius: "50%", flex: "none" }} />
                  <span className="lx-eyebrow shrink-0" style={{ color: "var(--ink-2)" }}>The next session</span>
                </div>
                <Reveal>
                  <WhatsNextCard session={data.nextSession} />
                </Reveal>
              </div>
            )}
          </div>
        </div>

        <Section title="Fitness, fatigue & form" aside="90-day projection">
          <Reveal>
            <FitnessProjection points={data.fitness} />
          </Reveal>
        </Section>

        <Section title="Watch vitals" aside="last reading">
          <VitalsMatrix tiles={data.vitals} />
        </Section>

        <Section title="The week ahead" aside="7 days">
          <Reveal>
            <WeekRibbon days={data.ribbon} />
          </Reveal>
        </Section>

        <Section
          title="Macrocycle"
          aside={data.goal ? `${data.goal.phase} · ${data.goal.daysOut}d to ${data.goal.eventName}` : "weekly ramp"}
        >
          <Reveal>
            <Macrocycle weeks={data.macro} />
          </Reveal>
        </Section>
      </div>

      <DeviceTicker items={data.ticker} />
    </div>
  );
}

function Section({ title, aside, children }: { title: string; aside?: string; children: ReactNode }) {
  return (
    <section className="mt-16 md:mt-20">
      <div className="lx-rule mb-7">
        <span style={{ width: 7, height: 7, background: "var(--signal)", borderRadius: "50%", flex: "none" }} />
        <h2 className="lx-serif" style={{ fontSize: "clamp(26px, 4vw, 36px)", fontWeight: 600, letterSpacing: "-0.01em", color: "var(--ink)", flex: "none" }}>
          {title}
        </h2>
        {aside && <span className="lx-eyebrow shrink-0">{aside}</span>}
      </div>
      {children}
    </section>
  );
}

function Masthead() {
  const router = useRouter();
  const [syncState, setSyncState] = useState<"idle" | "syncing" | "done" | "error">("idle");

  async function sync() {
    setSyncState("syncing");
    try {
      const res = await fetch("/api/sync", { method: "POST" });
      if (res.ok) {
        setSyncState("done");
        setTimeout(() => window.location.reload(), 700);
      } else {
        setSyncState("error");
        setTimeout(() => setSyncState("idle"), 4000);
      }
    } catch {
      setSyncState("error");
      setTimeout(() => setSyncState("idle"), 4000);
    }
  }

  async function logout() {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/login");
  }

  return (
    <header
      className="sticky top-0 z-40"
      style={{ background: "color-mix(in oklch, var(--paper) 88%, transparent)", borderBottom: "1px solid var(--line)", backdropFilter: "blur(8px)", WebkitBackdropFilter: "blur(8px)" }}
    >
      <div className="mx-auto flex max-w-5xl items-center justify-between px-5 py-3.5 md:px-8">
        <div className="flex items-baseline gap-2.5">
          <span className="lx-serif" style={{ fontSize: 22, fontWeight: 700, letterSpacing: "-0.01em", color: "var(--ink)" }}>Ledger</span>
          <span className="lx-eyebrow hidden sm:inline">Training</span>
        </div>

        <nav className="hidden items-center gap-7 md:flex">
          {NAV.map((n) => (
            <Link
              key={n.href}
              href={n.href}
              className="lx-eyebrow transition-colors"
              style={{ color: n.href === "/" ? "var(--signal-ink)" : "var(--ink-3)" }}
            >
              {n.label}
            </Link>
          ))}
        </nav>

        <div className="flex items-center gap-3">
          <button
            onClick={sync}
            disabled={syncState === "syncing" || syncState === "done"}
            className="lx-eyebrow px-3 py-1.5 transition-colors disabled:opacity-50"
            style={{ border: "1px solid var(--line-2)", borderRadius: "var(--radius)", color: syncState === "error" ? "var(--signal)" : "var(--ink-2)" }}
          >
            {syncState === "idle" && "Sync"}
            {syncState === "syncing" && "Syncing"}
            {syncState === "done" && "Synced"}
            {syncState === "error" && "Retry"}
          </button>
          <button onClick={logout} className="lx-eyebrow transition-colors" style={{ color: "var(--ink-4)" }} aria-label="Sign out">
            Sign out
          </button>
        </div>
      </div>

      {/* Mobile nav row — desktop shows links inline above */}
      <nav className="flex gap-6 overflow-x-auto px-5 pb-2.5 md:hidden" style={{ borderTop: "1px solid var(--line)" }}>
        {NAV.map((n) => (
          <Link
            key={n.href}
            href={n.href}
            className="lx-eyebrow shrink-0 pt-2.5 transition-colors"
            style={{ color: n.href === "/" ? "var(--signal-ink)" : "var(--ink-3)" }}
          >
            {n.label}
          </Link>
        ))}
      </nav>
    </header>
  );
}

function DeviceTicker({ items }: { items: string[] }) {
  if (items.length === 0) return null;
  const doubled = [...items, ...items];
  return (
    <div
      className="fixed inset-x-0 bottom-0 z-40 overflow-hidden"
      style={{ background: "var(--ink)", color: "var(--paper)", borderTop: "1px solid var(--ink)" }}
    >
      <div className="flex w-max animate-ticker py-2 whitespace-nowrap">
        {doubled.map((it, i) => (
          <span key={i} className="lx-mono flex items-center gap-2.5 px-6 text-[11px]" style={{ color: "rgba(249,247,242,0.72)" }}>
            <span style={{ width: 5, height: 5, borderRadius: "50%", background: "var(--signal)", display: "inline-block" }} />
            {it}
          </span>
        ))}
      </div>
    </div>
  );
}
