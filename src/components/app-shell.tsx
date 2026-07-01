"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";

const navItems = [
  { href: "/today", label: "H\u00f4m nay" },
  { href: "/schedule", label: "L\u1ecbch" },
  { href: "/history", label: "L\u1ecbch s\u1eed" },
  { href: "/profile", label: "C\u00e1 nh\u00e2n" },
] as const;

export function AppShell({ children, todayFit = false }: { children: ReactNode; todayFit?: boolean }) {
  const pathname = usePathname();
  const shellClassName = todayFit
    ? "h-[100svh] overflow-hidden bg-[#0B0F14] px-3 pb-[calc(64px+env(safe-area-inset-bottom))] pt-[calc(env(safe-area-inset-top)+6px)] text-[#F9FAFB]"
    : "min-h-dvh bg-[#0B0F14] px-4 pb-[calc(92px+env(safe-area-inset-bottom))] pt-[calc(env(safe-area-inset-top)+18px)] text-[#F9FAFB]";
  const mainClassName = todayFit ? "mx-auto flex h-full min-h-0 w-full max-w-[480px] flex-col gap-1.5 overflow-hidden" : "space-y-4";
  const navClassName = todayFit
    ? "fixed bottom-0 left-1/2 z-20 w-full max-w-[480px] -translate-x-1/2 border-t border-[#374151] bg-[#111827]/95 px-2 pb-[calc(7px+env(safe-area-inset-bottom))] pt-1.5 backdrop-blur"
    : "fixed bottom-0 left-1/2 z-20 w-full max-w-[480px] -translate-x-1/2 border-t border-[#374151] bg-[#111827]/95 px-3 pb-[calc(10px+env(safe-area-inset-bottom))] pt-2 backdrop-blur";
  const linkBaseClassName = todayFit
    ? "flex min-h-[46px] items-center justify-center rounded-[13px] px-1 py-1.5 text-center text-[12px] font-bold leading-tight transition"
    : "flex min-h-[52px] items-center justify-center rounded-[14px] px-1.5 py-2 text-center text-[12px] font-bold leading-tight transition";

  return (
    <div className={shellClassName}>
      <main className={mainClassName}>{children}</main>
      <nav className={navClassName}>
        <div className="grid grid-cols-4 gap-1.5">
          {navItems.map((item) => {
            const active = pathname === item.href;

            return (
              <Link
                key={item.href}
                href={item.href}
                className={`${linkBaseClassName} ${active ? "bg-[#22C55E] text-white" : "bg-[#1F2937] text-[#9CA3AF]"}`}
              >
                {item.label}
              </Link>
            );
          })}
        </div>
      </nav>
    </div>
  );
}
