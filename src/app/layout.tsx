import type { Metadata } from "next";
import type { ReactNode } from "react";
import "./globals.css";

export const metadata: Metadata = {
  title: "Gym Planner",
  description: "Personal gym planner and workout tracker",
};

export default function RootLayout({ children }: Readonly<{ children: ReactNode }>) {
  return (
    <html lang="vi">
      <body>
        <div className="mx-auto min-h-screen max-w-[480px] bg-[#0B0F14]">
          {children}
        </div>
      </body>
    </html>
  );
}
