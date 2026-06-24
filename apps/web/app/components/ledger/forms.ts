import type { CSSProperties } from "react";

/* Shared ledger form styling so every input on the paper stock matches. */
export const ledgerInput: CSSProperties = {
  width: "100%",
  background: "var(--paper-3)",
  border: "1px solid var(--line-2)",
  borderRadius: "var(--radius)",
  padding: "9px 12px",
  fontSize: 14,
  color: "var(--ink)",
  outline: "none",
  fontFamily: "var(--font-body)",
};

export const ledgerPrimaryBtn: CSSProperties = {
  fontFamily: "var(--type-body)",
  fontSize: 10.5,
  fontWeight: 600,
  letterSpacing: "0.2em",
  textTransform: "uppercase",
  background: "var(--signal)",
  color: "var(--paper)",
  borderRadius: "var(--radius)",
  padding: "10px 18px",
};

export const ledgerGhostBtn: CSSProperties = {
  fontFamily: "var(--type-body)",
  fontSize: 10.5,
  fontWeight: 600,
  letterSpacing: "0.2em",
  textTransform: "uppercase",
  border: "1px solid var(--line-2)",
  color: "var(--ink-2)",
  borderRadius: "var(--radius)",
  padding: "10px 18px",
};
