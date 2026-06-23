"use client";

import type { ReactNode } from "react";
import { usePathname } from "next/navigation";
import { BottomNav } from "./BottomNav";
import { FluidBackground } from "./FluidBackground";
import { TopNav } from "./TopNav";

/* The Today route (`/`) is the full-bleed Editorial Ledger and supplies its
   own masthead + footer ticker. Every other route keeps the dark instrument
   chrome until it's reskinned. */
export function Chrome({ children }: { children: ReactNode }) {
  const pathname = usePathname();

  if (pathname === "/") {
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
