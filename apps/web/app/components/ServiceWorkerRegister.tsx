"use client";

import { useEffect } from "react";

/** Register the offline service worker (PWA). No-op if unsupported. */
export function ServiceWorkerRegister() {
  useEffect(() => {
    if ("serviceWorker" in navigator) {
      navigator.serviceWorker.register("/sw.js").catch(() => {
        /* ignore registration errors */
      });
    }
  }, []);
  return null;
}
