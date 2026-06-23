"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useState } from "react";

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
        <label
          htmlFor="password"
          className="mb-1.5 block text-sm font-medium"
          style={{ color: "rgba(255,255,255,0.5)" }}
        >
          Password
        </label>
        <input
          id="password"
          type="password"
          autoFocus
          autoComplete="current-password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          style={{
            width: "100%",
            background: "var(--ink-3)",
            border: "0.5px solid var(--line-2)",
            borderRadius: 8,
            padding: "10px 14px",
            fontSize: 14,
            fontFamily: "var(--type-mono)",
            color: "#fff",
            outline: "none",
            transition: "border-color 0.15s",
          }}
          placeholder="Enter password"
        />
      </div>

      {error && <p className="readout text-sm" style={{ color: "#F87171" }}>{error}</p>}

      <button
        type="submit"
        disabled={loading || !password}
        className="rounded-lg px-4 py-2.5 text-white transition-opacity hover:opacity-90 disabled:opacity-40"
        style={{
          fontFamily: "var(--type-mono)",
          fontSize: 12,
          fontWeight: 600,
          letterSpacing: "0.12em",
          textTransform: "uppercase",
          background: "linear-gradient(135deg, #1D9E75, #2A7FC0)",
        }}
      >
        {loading ? "Signing in…" : "Sign in"}
      </button>
    </form>
  );
}

export default function LoginPage() {
  return (
    <main className="relative flex min-h-dvh items-center justify-center px-4" style={{ background: "#060608" }}>
      {/* Subtle top-right ambient glow on login too */}
      <div
        style={{
          position: "absolute",
          top: -100,
          right: -100,
          width: 500,
          height: 500,
          borderRadius: "50%",
          background: "radial-gradient(circle, rgba(29,158,117,0.18) 0%, transparent 70%)",
          pointerEvents: "none",
        }}
      />
      <div className="relative z-10 w-full max-w-sm">
        <div className="mb-8 flex items-center gap-3">
          <div
            className="flex h-9 w-9 items-center justify-center rounded-md"
            style={{ background: "var(--ink-3)", border: "0.5px solid var(--line-2)" }}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#5dcaa5" strokeWidth="2.25" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="22 12 18 12 15 21 9 3 6 12 2 12" />
            </svg>
          </div>
          <div>
            <p className="chan">Training</p>
            <h1 className="stat mt-0.5 text-xl text-white">Insights</h1>
          </div>
        </div>
        <Suspense>
          <LoginForm />
        </Suspense>
      </div>
    </main>
  );
}
