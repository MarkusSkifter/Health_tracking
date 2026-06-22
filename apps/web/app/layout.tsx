import type { Metadata, Viewport } from "next";
import type { ReactNode } from "react";
import { Inter } from "next/font/google";
import "./globals.css";
import { BottomNav } from "./components/BottomNav";
import { FluidBackground } from "./components/FluidBackground";
import { ServiceWorkerRegister } from "./components/ServiceWorkerRegister";
import { TopNav } from "./components/TopNav";

const inter = Inter({ subsets: ["latin"], display: "swap" });

export const metadata: Metadata = {
  title: "Training Insights",
  description: "Your daily training load, recovery, and trends.",
  manifest: "/manifest.webmanifest",
  icons: { icon: "/icon.svg" },
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "Training Insights",
  },
};

export const viewport: Viewport = {
  themeColor: "#060608",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en" className={inter.className}>
      <body>
        <FluidBackground />
        <TopNav />
        <div className="relative z-10">
          <div className="mx-auto max-w-4xl px-5 pt-20 pb-28 md:px-10 md:pt-20 md:pb-12">
            {children}
          </div>
        </div>
        <BottomNav />
        <ServiceWorkerRegister />
      </body>
    </html>
  );
}
