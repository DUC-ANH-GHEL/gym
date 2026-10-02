"use client";

import { useEffect, useState, useTransition } from "react";
import { getRestCountdownParts } from "@/lib/workout-rest";

const TEXT = {
  left: "còn lại",
  next: "Tiếp theo",
  extend: "+15 giây",
  skip: "Tập tiếp",
  working: "Đang xử lý...",
};

const RADIUS = 94;
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

  function skip() {
    const formData = new FormData();
    formData.set("continueUrl", continueUrl);
    startTransition(async () => {
      await skipAction(formData);
    });
  }

  return (
    <section className="flex min-h-0 flex-1 flex-col" aria-live="polite">
      <div className="flex min-h-0 flex-1 flex-col items-center justify-center gap-5">
        <div className="relative h-[210px] w-[210px]">
          <svg width="210" height="210" viewBox="0 0 210 210" aria-hidden="true">
            <circle cx="105" cy="105" r={RADIUS} fill="none" stroke="#1F2329" strokeWidth="10" />
            <circle
              cx="105"
              cy="105"
              r={RADIUS}
              fill="none"
              stroke="#C8F31D"
              strokeWidth="10"
              strokeLinecap="round"
              strokeDasharray={CIRCUMFERENCE}
              strokeDashoffset={CIRCUMFERENCE * (1 - secondsLeft / total)}
              transform="rotate(-90 105 105)"
              style={{ transition: "stroke-dashoffset 250ms linear" }}
            />
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <p className="text-[54px] font-black leading-none tabular-nums text-[#F4F5F7]">{countdown.label}</p>
            <p className="mt-1 text-[12px] font-bold text-[#8B919B]">{finished ? TEXT.skip : TEXT.left}</p>
          </div>
        </div>

        <div className="w-full rounded-[16px] border border-[#1F2329] bg-[#14161A] px-4 py-3">
          <p className="text-[12px] font-bold text-[#8B919B]">{TEXT.next}</p>
          <p className="mt-0.5 break-words text-[16px] font-black leading-tight text-[#F4F5F7]">{title}</p>
          <p className="mt-0.5 text-[13px] font-semibold text-[#C8F31D]">{detail}</p>
        </div>
      </div>

      <div className="grid shrink-0 grid-cols-2 gap-2 pb-2">
        <button
          type="button"
          disabled={isPending}
          onClick={() => startTransition(async () => extendAction())}
          className="min-h-[52px] rounded-[16px] border border-[#2A2F36] bg-[#14161A] px-3 text-[15px] font-black text-[#F4F5F7] transition active:scale-[0.98] disabled:opacity-55"
        >
          {TEXT.extend}
        </button>
        <button
          type="button"
          disabled={isPending}
          onClick={skip}
          className="min-h-[52px] rounded-[16px] bg-[#C8F31D] px-3 text-[15px] font-black text-[#0A0B0D] transition active:scale-[0.98] disabled:opacity-55"
        >
          {isPending ? TEXT.working : TEXT.skip}
        </button>
      </div>
    </section>
  );
}
