"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useState } from "react";
import { ledgerInput, ledgerPrimaryBtn } from "../components/ledger/forms";

function LoginForm() {
  const router = useRouter();
  const params = useSearchParams();
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");

    const res = await fetch("/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ password }),
    });

    if (res.ok) {
      const from = params.get("from") ?? "/";
      router.push(from);
      router.refresh();
    } else {
      setError("Incorrect password");
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      <div>
        <label htmlFor="password" className="lx-eyebrow mb-2 block">Password</label>
        <input
          id="password"
          type="password"
          autoFocus
          autoComplete="current-password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          style={{ ...ledgerInput, fontFamily: "var(--type-mono)" }}
          placeholder="Enter password"
        />
      </div>

      {error && <p className="lx-mono text-sm" style={{ color: "var(--signal)" }}>{error}</p>}

      <button type="submit" disabled={loading || !password} className="mt-1 transition-opacity hover:opacity-90 disabled:opacity-40" style={{ ...ledgerPrimaryBtn, padding: "12px 18px" }}>
        {loading ? "Signing in…" : "Sign in"}
      </button>
    </form>
  );
}

export default function LoginPage() {
  return (
    <main className="ledger relative flex min-h-dvh items-center justify-center px-5">
      {/* faint signal rule, top — a printed accent */}
      <div className="absolute inset-x-0 top-0 h-[3px]" style={{ background: "var(--signal)", opacity: 0.9 }} />

      <div className="relative z-10 w-full max-w-sm">
        <div className="mb-10 flex items-baseline gap-2.5">
          <span className="lx-serif" style={{ fontSize: 30, fontWeight: 700, letterSpacing: "-0.01em", color: "var(--ink)" }}>Ledger</span>
          <span className="lx-eyebrow">Training</span>
        </div>

        <h1 className="lx-serif" style={{ fontSize: "clamp(40px, 9vw, 60px)", fontWeight: 600, lineHeight: 0.95, letterSpacing: "-0.02em", color: "var(--ink)" }}>
          Sign in
        </h1>
        <p className="lx-sans mb-8 mt-2 text-sm" style={{ color: "var(--ink-2)" }}>Your daily training ledger awaits.</p>

        <Suspense>
          <LoginForm />
        </Suspense>
      </div>
    </main>
  );
}
