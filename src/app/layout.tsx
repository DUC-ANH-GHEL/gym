import type { Metadata, Viewport } from "next";
import type { ReactNode } from "react";
import { GlobalLoadingFeedback } from "@/components/global-loading-feedback";
import "./globals.css";

export const metadata: Metadata = {
  title: "Gym Planner",
  description: "Lịch tập và tracker buổi tập cá nhân.",
  applicationName: "Gym Planner",
  manifest: "/manifest.webmanifest",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "Gym Planner",
  },
  formatDetection: {
    telephone: false,
  },
  icons: {
    icon: [
      { url: "/icon-192.png", sizes: "192x192", type: "image/png" },
      { url: "/icon-512.png", sizes: "512x512", type: "image/png" },
    ],
    shortcut: "/icon-192.png",
    apple: [{ url: "/apple-icon.png", sizes: "180x180", type: "image/png" }],
  },
  other: {
    "mobile-web-app-capable": "yes",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  viewportFit: "cover",
  themeColor: "#0B0F14",
};

export default function RootLayout({ children }: Readonly<{ children: ReactNode }>) {
  return (
    <html lang="vi">
      <body>
        <div className="min-h-screen bg-[#0B0F14]">
          <GlobalLoadingFeedback />
          {children}
        </div>
      </body>
    </html>
  );
}
