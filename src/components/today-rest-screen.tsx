"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { getRestCountdownParts } from "@/lib/workout-rest";

const TEXT = {
  resting: "Đang nghỉ",
  next: "Tiếp theo",
  extend: "+15 giây",
  skip: "Tập tiếp",
  working: "Đang xử lý...",
};

const RADIUS = 27;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;

export function TodayRestScreen({
  continueUrl,
  detail,
  dueAtMs,
  extendAction,
  skipAction,
  title,
  totalSeconds,
}: {
  continueUrl: string;
  detail: string;
  dueAtMs: number;
  extendAction: () => Promise<void>;
  skipAction: (formData: FormData) => Promise<void>;
  title: string;
  totalSeconds: number;
}) {
  const [now, setNow] = useState(() => Date.now());
  const [isPending, startTransition] = useTransition();
  const countdown = getRestCountdownParts(dueAtMs, now);
  const secondsLeft = Math.max(0, Math.ceil((dueAtMs - now) / 1000));
  const total = Math.max(totalSeconds, secondsLeft, 1);
  const finished = secondsLeft === 0;

  useEffect(() => {
    const interval = window.setInterval(() => setNow(Date.now()), 250);
    return () => window.clearInterval(interval);
  }, []);

  const autoAdvancedForRef = useRef<number | null>(null);

  // Rest is over: move on automatically instead of waiting for a tap.
  useEffect(() => {
    if (!finished || autoAdvancedForRef.current === dueAtMs) {
      return;
    }
    autoAdvancedForRef.current = dueAtMs;
    skip();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [finished, dueAtMs]);

  function skip() {
    const formData = new FormData();
    formData.set("continueUrl", continueUrl);
    startTransition(async () => {
      await skipAction(formData);
    });
  }

  return (
    <section className="shrink-0 rounded-[18px] border border-[#1F2329] bg-[#14161A] p-3" aria-live="polite">
      <div className="flex items-center gap-3">
        <div className="relative h-[64px] w-[64px] shrink-0">
          <svg width="64" height="64" viewBox="0 0 64 64" aria-hidden="true">
            <circle cx="32" cy="32" r={RADIUS} fill="none" stroke="#1F2329" strokeWidth="5" />
            <circle
              cx="32"
              cy="32"
              r={RADIUS}
              fill="none"
              stroke="#C8F31D"
              strokeWidth="5"
              strokeLinecap="round"
              strokeDasharray={CIRCUMFERENCE}
              strokeDashoffset={CIRCUMFERENCE * (1 - secondsLeft / total)}
              transform="rotate(-90 32 32)"
              style={{ transition: "stroke-dashoffset 250ms linear" }}
            />
          </svg>
          <p className="absolute inset-0 flex items-center justify-center text-[16px] font-black tabular-nums text-[#F4F5F7]">
            {countdown.label}
          </p>
        </div>

        <div className="min-w-0 flex-1">
          <p className="text-[12px] font-black leading-4 text-[#C8F31D]">
            {TEXT.resting} · {TEXT.next}
          </p>
          <p className="break-words text-[15px] font-black leading-tight text-[#F4F5F7]">{title}</p>
          <p className="break-words text-[12px] font-semibold leading-4 text-[#8B919B]">{detail}</p>
        </div>
      </div>

      <div className="mt-2.5 grid grid-cols-2 gap-2">
        <button
          type="button"
          disabled={isPending}
          onClick={() => startTransition(async () => extendAction())}
          className="min-h-[44px] rounded-[14px] border border-[#2A2F36] bg-[#0A0B0D] px-3 text-[14px] font-black text-[#F4F5F7] transition active:scale-[0.98] disabled:opacity-55"
        >
          {TEXT.extend}
        </button>
        <button
          type="button"
          disabled={isPending}
          onClick={skip}
          className="min-h-[44px] rounded-[14px] bg-[#C8F31D] px-3 text-[14px] font-black text-[#0A0B0D] transition active:scale-[0.98] disabled:opacity-55"
        >
          {isPending ? TEXT.working : TEXT.skip}
        </button>
      </div>
    </section>
  );
}
