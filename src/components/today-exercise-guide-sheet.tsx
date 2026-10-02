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
  triggerClassName,
}: {
  exerciseName: string;
  muscleGroup: string | null;
  note: string | null;
  triggerClassName?: string;
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
        className={
          triggerClassName ??
          "inline-flex min-h-[40px] shrink-0 items-center justify-center rounded-full border border-[#C8F31D]/45 bg-[#1B2208] px-4 text-[14px] font-black text-[#C8F31D] active:scale-[0.98]"
        }
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
            className="flex max-h-[78dvh] w-full max-w-[480px] flex-col overflow-hidden rounded-t-[24px] border border-[#1F2329] bg-[#0A0B0D] shadow-2xl"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="flex items-start justify-between gap-3 border-b border-[#1F2329] px-4 py-3">
              <div className="min-w-0 flex-1">
                <p className="text-[12px] font-black text-[#C8F31D]">{TEXT.eyebrow}</p>
                <h2 id={titleId} className="break-words text-[21px] font-black leading-6 text-[#F4F5F7]">
                  {exerciseName}
                </h2>
                <p className="mt-1 text-[13px] font-semibold text-[#B6BBC4]">{muscleGroup || TEXT.noMuscleGroup}</p>
              </div>
              <button
                type="button"
                className="min-h-[42px] shrink-0 rounded-full border border-[#2A2F36] bg-[#14161A] px-4 text-[14px] font-black text-[#F4F5F7]"
                onClick={() => setOpen(false)}
              >
                {TEXT.close}
              </button>
            </div>

            <div className="min-h-0 overflow-y-auto px-3 py-3">
              <section className="rounded-[18px] border border-[#1F2329] bg-[#14161A] p-3">
                <h3 className="text-[16px] font-black text-[#F4F5F7]">{TEXT.stepsTitle}</h3>
                <ol className="mt-3 space-y-2">
                  {guideItems.map((item, index) => (
                    <li key={`${item}-${index}`} className="grid grid-cols-[32px_minmax(0,1fr)] gap-3 rounded-[14px] bg-[#0A0B0D] p-3">
                      <span className="flex h-8 w-8 items-center justify-center rounded-full bg-[#C8F31D] text-[14px] font-black text-[#0A0B0D]">
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
