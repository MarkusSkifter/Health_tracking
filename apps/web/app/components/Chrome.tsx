"use client";

import type { ReactNode } from "react";
import { usePathname } from "next/navigation";
import { BottomNav } from "./BottomNav";
import { FluidBackground } from "./FluidBackground";
import { TopNav } from "./TopNav";

/* The ledger routes are full-bleed and supply their own masthead + ticker.
   Every other route keeps the dark instrument chrome until it's reskinned. */
const LEDGER_ROUTES = ["/", "/calendar", "/analytics"];

export function Chrome({ children }: { children: ReactNode }) {
  const pathname = usePathname();

  if (LEDGER_ROUTES.includes(pathname)) {
    return <>{children}</>;
  }

  return (
    <>
      <FluidBackground />
      <TopNav />
      <div className="relative z-10">
        <div className="mx-auto max-w-4xl px-5 pt-20 pb-28 md:px-10 md:pt-20 md:pb-12">
          {children}
        </div>
      </div>
      <BottomNav />
    </>
  );
}
