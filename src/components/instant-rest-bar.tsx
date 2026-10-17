"use client";

import { useEffect, useState } from "react";
import { getRestCountdownParts } from "@/lib/workout-rest";

// Shown the moment a set/exercise is tapped, before the server has answered, so the screen reacts instantly.
// It disappears on its own once the real rest card replaces the controls that render it.
export function InstantRestBar({ dueAtMs, totalSeconds }: { dueAtMs: number; totalSeconds: number }) {
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    const interval = window.setInterval(() => setNow(Date.now()), 250);
    return () => window.clearInterval(interval);
  }, []);

  const secondsLeft = Math.max(0, Math.ceil((dueAtMs - now) / 1000));
  if (secondsLeft === 0) {
    return null;
  }

  const progress = Math.min(1, Math.max(0, secondsLeft / Math.max(totalSeconds, 1)));

  return (
    <div
      className="fixed left-1/2 top-[calc(8px+env(safe-area-inset-top))] z-[60] w-[calc(100%-24px)] max-w-[456px] -translate-x-1/2 overflow-hidden rounded-[16px] border border-[#C8F31D]/35 bg-[#14161A] shadow-2xl"
      role="status"
      aria-live="polite"
    >
      <div className="flex items-center justify-between px-4 py-3">
        <p className="text-[13px] font-black text-[#C8F31D]">Đang nghỉ</p>
        <p className="text-[22px] font-black tabular-nums text-[#F4F5F7]">{getRestCountdownParts(dueAtMs, now).label}</p>
      </div>
      <div className="h-[4px] bg-[#23262B]">
        <div className="h-full bg-[#C8F31D] transition-[width] duration-200 ease-linear" style={{ width: `${progress * 100}%` }} />
      </div>
    </div>
  );
}
