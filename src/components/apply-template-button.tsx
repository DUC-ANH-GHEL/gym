"use client";

import { useState } from "react";
import { PendingButton } from "@/components/ui";

// Applying a template replaces the whole week, so it takes a second, explicit tap.
export function ApplyTemplateButton({
  action,
  isCurrent,
  templateId,
  templateName,
}: {
  action: (formData: FormData) => Promise<void>;
  isCurrent: boolean;
  templateId: string;
  templateName: string;
}) {
  const [confirming, setConfirming] = useState(false);

  if (!confirming) {
    return (
      <button
        type="button"
        onClick={() => setConfirming(true)}
        className={`min-h-[48px] w-full rounded-[16px] px-4 text-[15px] font-black active:scale-[0.99] ${
          isCurrent ? "border border-[#2A2F36] bg-[#14161A] text-[#B6BBC4]" : "bg-[#C8F31D] text-[#0A0B0D]"
        }`}
      >
        {isCurrent ? "Áp dụng lại mẫu này" : "Dùng mẫu này"}
      </button>
    );
  }

  return (
    <form action={action} className="space-y-2 rounded-[16px] border border-[#C8F31D]/40 bg-[#0E1722] p-3">
      <input type="hidden" name="templateId" value={templateId} />
      <p className="text-[13px] font-bold leading-5 text-[#F4F5F7]">
        Thay lịch tuần hiện tại bằng mẫu <span className="text-[#C8F31D]">{templateName}</span>? Lịch sử tập không bị mất.
      </p>
      <div className="grid grid-cols-2 gap-2">
        <button
          type="button"
          onClick={() => setConfirming(false)}
          className="min-h-[46px] rounded-[14px] border border-[#2A2F36] bg-[#14161A] px-3 text-[14px] font-black text-[#B6BBC4]"
        >
          Hủy
        </button>
        <PendingButton
          className="min-h-[46px] rounded-[14px] bg-[#C8F31D] px-3 text-[14px] font-black text-[#0A0B0D] active:scale-[0.99]"
          pendingLabel="Đang áp..."
        >
          Xác nhận
        </PendingButton>
      </div>
    </form>
  );
}
