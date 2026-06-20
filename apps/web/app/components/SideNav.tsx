"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const items = [
  { href: "/", label: "Dashboard" },
  { href: "/analytics", label: "Analytics" },
  { href: "/settings", label: "Settings" },
];

export function SideNav() {
  const pathname = usePathname();
  return (
    <nav className="fixed left-0 top-0 hidden h-dvh w-56 flex-col border-r border-neutral-100 bg-white md:flex">
      <div className="px-6 pt-8 pb-7">
        <p className="text-xs font-medium uppercase tracking-widest text-neutral-400">
          Training
        </p>
        <p className="text-sm font-semibold text-neutral-900">Insights</p>
      </div>
      <ul className="flex flex-col gap-0.5 px-3">
        {items.map((item) => {
          const active =
            item.href === "/" ? pathname === "/" : pathname.startsWith(item.href);
          return (
            <li key={item.href}>
              <Link
                href={item.href}
                className={`flex items-center rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
                  active
                    ? "bg-neutral-900 text-white"
                    : "text-neutral-500 hover:bg-neutral-50 hover:text-neutral-900"
                }`}
              >
                {item.label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
