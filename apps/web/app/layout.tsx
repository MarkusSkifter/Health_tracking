import type { Metadata, Viewport } from "next";
import type { ReactNode } from "react";
import "./globals.css";
import { BottomNav } from "./components/BottomNav";
import { ServiceWorkerRegister } from "./components/ServiceWorkerRegister";
import { SideNav } from "./components/SideNav";

export const metadata: Metadata = {
  title: "Training Insights",
  description: "Your daily training load, recovery, and trends.",
  manifest: "/manifest.webmanifest",
  icons: { icon: "/icon.svg" },
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "Training Insights",
  },
};

export const viewport: Viewport = {
  themeColor: "#ffffff",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body className="bg-white text-neutral-900">
        <SideNav />
        <div className="md:pl-56">
          <div className="mx-auto max-w-5xl px-5 pt-8 pb-24 md:px-10 md:pt-10 md:pb-10">
            {children}
          </div>
        </div>
        <BottomNav />
        <ServiceWorkerRegister />
      </body>
    </html>
  );
}
