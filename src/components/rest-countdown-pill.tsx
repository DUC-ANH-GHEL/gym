"use client";

import { useEffect, useState } from "react";
import { getRestCountdownParts } from "@/lib/workout-rest";

const TEXT = {
  left: "c\u00f2n l\u1ea1i",
};

export function RestCountdownPill({ dueAtMs }: { dueAtMs: number }) {
  const [now, setNow] = useState(() => Date.now());
  const countdown = getRestCountdownParts(dueAtMs, now);

  useEffect(() => {
    if (dueAtMs <= Date.now()) {
      return;
    }

    const interval = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(interval);
  }, [dueAtMs]);

  return (
    <div className="shrink-0 rounded-[16px] border border-[#263241] bg-[#0B0F14] px-3 py-2 text-center">
      <p className="text-[24px] font-black leading-none tabular-nums text-[#F9FAFB]">{countdown.label}</p>
      <p className="mt-1 text-[11px] font-bold text-[#9CA3AF]">{TEXT.left}</p>
    </div>
  );
}
