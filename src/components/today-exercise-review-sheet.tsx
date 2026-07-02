"use client";

import { useId, useState } from "react";
import { ExerciseMediaPreview } from "@/components/exercise-media-preview";
import { getExerciseMedia } from "@/lib/exercise-media";

const TEXT = {
  close: "\u0110\u00f3ng",
  completed: "Xong",
  incomplete: "Ch\u01b0a xong",
  image: "\u1ea2nh",
  noMedia: "Ch\u01b0a c\u00f3 \u1ea3nh",
  note: "Ghi ch\u00fa",
  reps: "l\u1ea7n",
  reviewTitle: "Xem l\u1ea1i b\u00e0i",
  set: "Set",
  trigger: "Xem l\u1ea1i b\u00e0i n\u00e0y",
};

export type TodayExerciseReview = {
  id: string;
  name: string;
  muscleGroup: string | null;
  imageUrl: string | null;
  animationUrl: string | null;
  completedSets: number;
  setCount: number;
  setLogs: Array<{
    id: string;
    setNumber: number;
    targetReps: number | null;
    targetWeightKg: number | null;
    actualReps: number | null;
    actualWeightKg: number | null;
    note: string | null;
    isCompleted: boolean;
  }>;
};

function formatNumber(value: number | null | undefined) {
  if (typeof value !== "number") {
    return "--";
  }

  return Number.isInteger(value) ? String(value) : value.toFixed(1).replace(/\.0$/, "");
}

export function TodayExerciseReviewSheet({
  defaultOpen = false,
  exercise,
  triggerClassName,
  triggerLabel = TEXT.trigger,
}: {
  defaultOpen?: boolean;
  exercise: TodayExerciseReview;
  triggerClassName: string;
  triggerLabel?: string;
}) {
  const [open, setOpen] = useState(defaultOpen);
  const titleId = useId();
  const media = getExerciseMedia(exercise, "workout");

  return (
    <>
      <button type="button" className={triggerClassName} onClick={() => setOpen(true)}>
        {triggerLabel}
      </button>

      {open ? (
        <div
          className="fixed inset-0 z-[80] flex items-end justify-center bg-black/70 px-2 pb-[calc(82px+env(safe-area-inset-bottom))] pt-[calc(16px+env(safe-area-inset-top))]"
          role="dialog"
          aria-modal="true"
          aria-labelledby={titleId}
          onClick={() => setOpen(false)}
        >
          <div
            className="flex max-h-[78dvh] w-full max-w-[480px] flex-col overflow-hidden rounded-t-[24px] border border-[#263241] bg-[#0B0F14] shadow-2xl"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="flex items-center justify-between gap-3 border-b border-[#263241] px-4 py-3">
              <div className="min-w-0 flex-1">
                <p className="text-[12px] font-black text-[#86EFAC]">{TEXT.reviewTitle}</p>
                <h2 id={titleId} className="break-words text-[20px] font-black leading-6 text-[#F9FAFB]">
                  {exercise.name}
                </h2>
                <p className="text-[13px] font-semibold text-[#D1D5DB]">{exercise.muscleGroup || ""}</p>
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
              <div className="overflow-hidden rounded-[16px] border border-[#263241] bg-black">
                <ExerciseMediaPreview
                  media={media}
                  alt={exercise.name}
                  width={720}
                  height={420}
                  imageClassName="h-[190px] w-full object-cover"
                  placeholderClassName="flex h-[190px] w-full items-center justify-center bg-[#111827] text-[14px] font-bold text-[#9CA3AF]"
                  placeholderLabel={TEXT.noMedia}
                  buttonClassName="block h-[190px] w-full"
                  sizes="(max-width: 480px) 100vw, 480px"
                />
              </div>

              <div className="mt-3 rounded-[16px] border border-[#263241] bg-[#111827] p-3">
                <div className="flex items-center justify-between gap-3">
                  <p className="text-[13px] font-bold text-[#9CA3AF]">{TEXT.completed}</p>
                  <p className="text-[22px] font-black leading-none text-[#F9FAFB]">
                    {exercise.completedSets}/{exercise.setCount} set
                  </p>
                </div>
              </div>

              <div className="mt-3 space-y-2">
                {exercise.setLogs.map((setLog) => {
                  const weight = setLog.actualWeightKg ?? setLog.targetWeightKg;
                  const reps = setLog.actualReps ?? setLog.targetReps;

                  return (
                    <div key={setLog.id} className="rounded-[16px] border border-[#263241] bg-[#111827] p-3">
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <p className="text-[16px] font-black text-[#F9FAFB]">
                            {TEXT.set} {setLog.setNumber}
                          </p>
                          <p className="text-[12px] font-bold text-[#9CA3AF]">
                            {setLog.isCompleted ? TEXT.completed : TEXT.incomplete}
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="text-[18px] font-black text-[#F9FAFB]">{formatNumber(weight)} kg</p>
                          <p className="text-[14px] font-bold text-[#D1D5DB]">
                            {formatNumber(reps)} {TEXT.reps}
                          </p>
                        </div>
                      </div>
                      {setLog.note ? <p className="mt-2 rounded-[12px] bg-[#0B0F14] px-3 py-2 text-[13px] font-semibold text-[#D1D5DB]">{TEXT.note}: {setLog.note}</p> : null}
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
