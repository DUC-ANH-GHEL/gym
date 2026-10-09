"use client";

import { useState, useTransition } from "react";
import { setRestTimerEnabledAction } from "@/lib/profile-actions";

export function RestTimerToggle({ defaultEnabled }: { defaultEnabled: boolean }) {
  const [enabled, setEnabled] = useState(defaultEnabled);
  const [isPending, startTransition] = useTransition();

  function toggle(next: boolean) {
    const previous = enabled;
    setEnabled(next);
    startTransition(async () => {
      try {
        await setRestTimerEnabledAction(next);
      } catch {
        setEnabled(previous);
      }
    });
  }

  return (
    <div className="mt-4 flex items-center justify-between gap-3 rounded-[14px] border border-[#2A2F36] px-3 py-3">
      <label htmlFor="restTimerEnabled" className="min-w-0 flex-1">
        <span className="block text-[15px] font-bold text-[#F4F5F7]">Bộ đếm giờ nghỉ</span>
        <span className="block text-[13px] text-[#8B919B]">Tắt thì không hiện đồng hồ đếm và không gửi thông báo nhắc nghỉ.</span>
      </label>
      <button
        id="restTimerEnabled"
        type="button"
        role="switch"
        aria-checked={enabled}
        disabled={isPending}
        onClick={() => toggle(!enabled)}
        className={`relative h-8 w-14 shrink-0 rounded-full transition-colors ${enabled ? "bg-[#C8F31D]" : "bg-[#2A2F36]"}`}
      >
        <span
          className={`absolute left-1 top-1 h-6 w-6 rounded-full transition-transform ${enabled ? "translate-x-6 bg-[#0A0B0D]" : "bg-[#8B919B]"}`}
        />
      </button>
    </div>
  );
}
