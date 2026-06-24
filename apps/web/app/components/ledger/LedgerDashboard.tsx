"use client";

import type { ReactNode } from "react";
import { DeviceTicker } from "./DeviceTicker";
import type { FitnessPoint } from "./fitness";
import { FitnessProjection } from "./FitnessProjection";
import { Macrocycle, type MacroWeek } from "./Macrocycle";
import { Masthead } from "./Masthead";
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
