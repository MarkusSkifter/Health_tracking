import type { ReactNode } from "react";
import { DeviceTicker } from "./DeviceTicker";
import { Masthead } from "./Masthead";

/* Page chrome for ledger routes other than Today: paper canvas, shared
   masthead, centered measure, and an optional footer ticker. */
export function LedgerShell({ children, ticker }: { children: ReactNode; ticker?: string[] }) {
  return (
    <div className="ledger relative min-h-dvh pb-16">
      <Masthead />
      <div className="mx-auto max-w-[1240px] px-5 pt-10 md:px-10 md:pt-12">{children}</div>
      {ticker && ticker.length > 0 ? <DeviceTicker items={ticker} /> : null}
    </div>
  );
}
