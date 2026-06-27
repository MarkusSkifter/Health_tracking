"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState } from "react";

const NAV = [
  { href: "/", label: "Today" },
  { href: "/calendar", label: "Calendar" },
  { href: "/analytics", label: "Analytics" },
  { href: "/settings", label: "Settings" },
];

/* Editorial masthead shared across the ledger routes. */
export function Masthead() {
  const pathname = usePathname();
  const router = useRouter();
  const [syncState, setSyncState] = useState<"idle" | "syncing" | "done" | "error">("idle");

  const isActive = (href: string) => (href === "/" ? pathname === "/" : pathname.startsWith(href));

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
      <div className="mx-auto flex max-w-[1240px] items-center justify-between px-5 py-3.5 md:px-10">
        <div className="flex items-baseline gap-2.5">
          <span className="lx-serif" style={{ fontSize: 22, fontWeight: 700, letterSpacing: "-0.01em", color: "var(--ink)" }}>Gamman</span>
          <span className="lx-eyebrow hidden sm:inline">Training</span>
        </div>

        <nav className="hidden items-center gap-7 md:flex">
          {NAV.map((n) => (
            <Link key={n.href} href={n.href} className="lx-eyebrow transition-colors" style={{ color: isActive(n.href) ? "var(--signal-ink)" : "var(--ink-3)" }}>
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

      <nav className="flex gap-6 overflow-x-auto px-5 pb-2.5 md:hidden" style={{ borderTop: "1px solid var(--line)" }}>
        {NAV.map((n) => (
          <Link key={n.href} href={n.href} className="lx-eyebrow shrink-0 pt-2.5 transition-colors" style={{ color: isActive(n.href) ? "var(--signal-ink)" : "var(--ink-3)" }}>
            {n.label}
          </Link>
        ))}
      </nav>
    </header>
  );
}
