"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";

const navItems = [
  { href: "/today", label: "Hôm nay" },
  { href: "/schedule", label: "Lịch" },
  { href: "/exercises", label: "Bài tập" },
  { href: "/profile", label: "Cá nhân" },
] as const;

export function AppShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();

  return (
    <div className="min-h-dvh bg-[#0B0F14] px-4 pb-[calc(92px+env(safe-area-inset-bottom))] pt-4 text-[#F9FAFB]">
      <main className="space-y-4">{children}</main>
      <nav className="fixed bottom-0 left-1/2 z-20 w-full max-w-[480px] -translate-x-1/2 border-t border-[#374151] bg-[#111827]/95 px-3 pb-[calc(10px+env(safe-area-inset-bottom))] pt-2 backdrop-blur">
        <div className="grid grid-cols-4 gap-1.5">
          {navItems.map((item) => {
            const active = pathname === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex min-h-[52px] items-center justify-center rounded-[14px] px-1.5 py-2 text-center text-[12px] font-bold leading-tight transition ${
                  active ? "bg-[#22C55E] text-white" : "bg-[#1F2937] text-[#9CA3AF]"
                }`}
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
