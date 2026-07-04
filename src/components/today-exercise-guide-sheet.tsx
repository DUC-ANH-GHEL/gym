"use client";

import { useId, useState } from "react";
import { buildExerciseGuideItems, getExerciseGuideFallback } from "@/lib/today-exercise-guide";

const TEXT = {
  open: "Hướng dẫn",
  openLabel: "Hướng dẫn chi tiết cách tập chuẩn",
  close: "Đóng",
  eyebrow: "Cách tập chuẩn",
  stepsTitle: "Làm theo từng bước",
  safetyTitle: "Nhớ kỹ",
  safetyOne: "Tập chậm, không giật tạ.",
  safetyTwo: "Giữ thân người chắc, dừng lại nếu thấy đau lạ.",
  noMuscleGroup: "Chưa có nhóm cơ",
};

export function TodayExerciseGuideSheet({
  exerciseName,
  muscleGroup,
  note,
}: {
  exerciseName: string;
  muscleGroup: string | null;
  note: string | null;
}) {
  const [open, setOpen] = useState(false);
  const titleId = useId();
  const items = buildExerciseGuideItems(note);
  const guideItems = items.length > 0 ? items : [getExerciseGuideFallback(exerciseName)];

  return (
    <>
      <button
        type="button"
        data-testid="today-exercise-guide-button"
        className="inline-flex min-h-[40px] shrink-0 items-center justify-center rounded-full border border-[#22C55E]/45 bg-[#12301F] px-4 text-[14px] font-black text-[#86EFAC] active:scale-[0.98]"
        aria-label={TEXT.openLabel}
        onClick={() => setOpen(true)}
      >
        {TEXT.open}
      </button>

      {open ? (
        <div
          className="fixed inset-0 z-[75] flex items-end justify-center bg-black/70 px-2 pb-[calc(82px+env(safe-area-inset-bottom))] pt-[calc(18px+env(safe-area-inset-top))]"
          role="dialog"
          data-testid="today-exercise-guide-dialog"
          aria-modal="true"
          aria-labelledby={titleId}
          onClick={() => setOpen(false)}
        >
          <div
            className="flex max-h-[78dvh] w-full max-w-[480px] flex-col overflow-hidden rounded-t-[24px] border border-[#263241] bg-[#0B0F14] shadow-2xl"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="flex items-start justify-between gap-3 border-b border-[#263241] px-4 py-3">
              <div className="min-w-0 flex-1">
                <p className="text-[12px] font-black text-[#86EFAC]">{TEXT.eyebrow}</p>
                <h2 id={titleId} className="break-words text-[21px] font-black leading-6 text-[#F9FAFB]">
                  {exerciseName}
                </h2>
                <p className="mt-1 text-[13px] font-semibold text-[#D1D5DB]">{muscleGroup || TEXT.noMuscleGroup}</p>
              </div>
              <button
                type="button"
                className="min-h-[42px] shrink-0 rounded-full border border-[#374151] bg-[#111827] px-4 text-[14px] font-black text-[#F9FAFB]"
                onClick={() => setOpen(false)}
              >
                {TEXT.close}
              </button>
            </div>

            <div className="min-h-0 overflow-y-auto px-3 py-3">
              <section className="rounded-[18px] border border-[#263241] bg-[#111827] p-3">
                <h3 className="text-[16px] font-black text-[#F9FAFB]">{TEXT.stepsTitle}</h3>
                <ol className="mt-3 space-y-2">
                  {guideItems.map((item, index) => (
                    <li key={`${item}-${index}`} className="grid grid-cols-[32px_minmax(0,1fr)] gap-3 rounded-[14px] bg-[#0B1220] p-3">
                      <span className="flex h-8 w-8 items-center justify-center rounded-full bg-[#22C55E] text-[14px] font-black text-white">
                        {index + 1}
                      </span>
                      <p className="break-words text-[15px] font-semibold leading-6 text-[#E5E7EB]">{item}</p>
                    </li>
                  ))}
                </ol>
              </section>

              <section className="mt-3 rounded-[18px] border border-[#F59E0B]/35 bg-[#2A1F08] p-3">
                <h3 className="text-[16px] font-black text-[#FCD34D]">{TEXT.safetyTitle}</h3>
                <ul className="mt-2 space-y-2 text-[14px] font-semibold leading-6 text-[#FDE68A]">
                  <li>{TEXT.safetyOne}</li>
                  <li>{TEXT.safetyTwo}</li>
                </ul>
              </section>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
