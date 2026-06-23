"use client";

import type { CSSProperties, ReactNode } from "react";
import { useEffect, useState } from "react";
import { useInView } from "./hooks";

/* Wraps a section and plays the revealUp animation the first time it scrolls
   into view. `delay` staggers siblings (e.g. grid tiles).

   Content is rendered VISIBLE on the server and stays visible until the
   client mounts — so no-JS or a failed hydration can never leave a section
   permanently hidden. Only once JS is confirmed running do we arm the
   hidden→reveal animation. */
export function Reveal({
  children,
  delay = 0,
  className = "",
  as: Tag = "div",
  style,
}: {
  children: ReactNode;
  delay?: number;
  className?: string;
  as?: "div" | "section" | "li" | "article";
  style?: CSSProperties;
}) {
  const [ref, inView] = useInView();
  const [armed, setArmed] = useState(false);
  useEffect(() => setArmed(true), []);

  const hidden = armed && !inView;

  return (
    <Tag
      ref={ref as never}
      className={`${inView ? "animate-reveal" : ""} ${className}`}
      style={{
        ...(hidden ? { opacity: 0 } : {}),
        animationDelay: inView ? `${delay}ms` : undefined,
        ...style,
      }}
    >
      {children}
    </Tag>
  );
}
