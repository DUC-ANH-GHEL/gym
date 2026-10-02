"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";

const navItems = [
  {
    href: "/today",
    label: "Hôm nay",
    icon: "M12 3c1 3 4 5 4 9a4 4 0 1 1-8 0c0-1.5.6-2.6 1.5-3.5.2 1 .8 1.6 1.5 1.8C11 8 11 5 12 3z",
  },
  {
    href: "/schedule",
    label: "Lịch",
    icon: "M7 3v3M17 3v3M4 9h16M5 5h14a1 1 0 0 1 1 1v13a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V6a1 1 0 0 1 1-1z",
  },
  {
    href: "/history",
    label: "Lịch sử",
    icon: "M12 7v5l3 2M4 12a8 8 0 1 0 2.3-5.7M4 4v4h4",
  },
  {
    href: "/profile",
    label: "Cá nhân",
    icon: "M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8zM5 20a7 7 0 0 1 14 0",
  },
] as const;

export function AppShell({ children, todayFit = false }: { children: ReactNode; todayFit?: boolean }) {
  const pathname = usePathname();
  const isAdminRoute = pathname.startsWith("/admin");
  const shellClassName = todayFit
    ? "mx-auto h-[100svh] w-full max-w-[480px] overflow-hidden bg-[#0A0B0D] px-3 pb-[calc(64px+env(safe-area-inset-bottom))] pt-[calc(env(safe-area-inset-top)+6px)] text-[#F9FAFB]"
    : `mx-auto min-h-dvh w-full ${isAdminRoute ? "max-w-[1280px]" : "max-w-[480px]"} bg-[#0A0B0D] px-4 pb-[calc(92px+env(safe-area-inset-bottom))] pt-[calc(env(safe-area-inset-top)+18px)] text-[#F9FAFB]`;
  const mainClassName = todayFit ? "mx-auto flex h-full min-h-0 w-full max-w-[480px] flex-col gap-2 overflow-hidden" : "space-y-4";
  const navClassName =
    "fixed bottom-0 left-1/2 z-20 w-full max-w-[480px] -translate-x-1/2 border-t border-[#1F2329] bg-[#0D0F12] px-2 pb-[calc(6px+env(safe-area-inset-bottom))] pt-1.5";
  const linkBaseClassName = "flex min-h-[48px] flex-col items-center justify-center gap-0.5 rounded-[12px] px-1 text-[11px] font-bold leading-tight transition active:scale-[0.97]";

  return (
    <div className={shellClassName}>
      <main className={mainClassName}>{children}</main>
      <nav className={navClassName}>
        <div className="grid grid-cols-4 gap-1">
          {navItems.map((item) => {
            const active = pathname === item.href;

            return (
              <Link
                key={item.href}
                href={item.href}
                aria-current={active ? "page" : undefined}
                className={`${linkBaseClassName} ${active ? "text-[#C8F31D]" : "text-[#6B717B]"}`}
              >
                <svg
                  width="22"
                  height="22"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.8"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  aria-hidden="true"
                >
                  <path d={item.icon} />
                </svg>
                {item.label}
              </Link>
            );
          })}
        </div>
      </nav>
    </div>
  );
}
