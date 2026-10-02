"use client";

import { useId, useState } from "react";
import { ExerciseMediaPreview } from "@/components/exercise-media-preview";
import { TodayExerciseAction } from "@/components/today-exercise-action";
import { getExerciseMedia } from "@/lib/exercise-media";
import type { WorkoutNavigationResult } from "@/lib/workout-actions";

const TEXT = {
  active: "Đang tập",
  done: "Xong",
  notStarted: "Chưa tập",
  continue: "Tiếp",
  start: "Tập",
  view: "Xem",
  image: "Ảnh",
  noMuscleGroup: "Chưa có nhóm cơ",
  open: "Đổi bài",
  title: "Đổi bài hôm nay",
  close: "Đóng",
};

export type TodayExercisePickerRow = {
  workoutDayExerciseId: string;
  exerciseLogId: string | null;
  name: string;
  muscleGroup: string | null;
  imageUrl: string | null;
  animationUrl: string | null;
  setCount: number;
  completedSets: number;
  isStarted: boolean;
  isCompleted: boolean;
};

function getStatus(row: TodayExercisePickerRow) {
  if (row.isCompleted) {
    return { label: TEXT.done, cta: TEXT.view, className: "border-[#C8F31D]/40 bg-[#1B2208] text-[#C8F31D]" };
  }

  if (row.isStarted) {
    return { label: TEXT.active, cta: TEXT.continue, className: "border-[#C8F31D]/40 bg-[#14161A] text-[#C8F31D]" };
  }

  return { label: TEXT.notStarted, cta: TEXT.start, className: "border-[#4B5563] bg-[#1B1E23] text-[#D1D5DB]" };
}

export function TodayExercisePicker({
  action,
  restDueAtMs,
  rows,
  triggerClassName,
}: {
  action: (formData: FormData) => Promise<WorkoutNavigationResult>;
  restDueAtMs: number | null;
  rows: TodayExercisePickerRow[];
  triggerClassName?: string;
}) {
  const [open, setOpen] = useState(false);
  const titleId = useId();

  return (
    <>
      <button
        type="button"
        className={
          triggerClassName ??
          "inline-flex min-h-[40px] shrink-0 items-center justify-center rounded-full border border-[#C8F31D]/45 bg-[#14161A] px-4 text-[14px] font-black text-[#C8F31D] active:scale-[0.98]"
        }
        onClick={() => setOpen(true)}
      >
        {TEXT.open}
      </button>

      {open ? (
        <div
          className="fixed inset-0 z-[70] flex items-end justify-center bg-black/65 px-2 pb-[calc(82px+env(safe-area-inset-bottom))] pt-[calc(18px+env(safe-area-inset-top))]"
          role="dialog"
          aria-modal="true"
          aria-labelledby={titleId}
          onClick={() => setOpen(false)}
        >
          <div
            className="flex max-h-[76dvh] w-full max-w-[480px] flex-col overflow-hidden rounded-t-[24px] border border-[#1F2329] bg-[#0A0B0D] shadow-2xl"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="flex items-center justify-between gap-3 border-b border-[#1F2329] px-4 py-3">
              <h2 id={titleId} className="min-w-0 flex-1 break-words text-[19px] font-black text-[#F9FAFB]">
                {TEXT.title}
              </h2>
              <button
                type="button"
                className="min-h-[42px] shrink-0 rounded-full border border-[#2A2F36] bg-[#14161A] px-4 text-[14px] font-black text-[#F9FAFB]"
                onClick={() => setOpen(false)}
              >
                {TEXT.close}
              </button>
            </div>

            <div className="min-h-0 space-y-2 overflow-y-auto px-3 py-3">
              {rows.map((row) => {
                const status = getStatus(row);
                const media = getExerciseMedia(row, "workout");

                return (
                  <div
                    key={row.workoutDayExerciseId}
                    className="grid min-w-0 grid-cols-[58px_minmax(0,1fr)_76px] items-center gap-2 rounded-[18px] border border-[#1F2329] bg-[#14161A] p-2"
                  >
                    <ExerciseMediaPreview
                      media={media}
                      alt={row.name}
                      width={96}
                      height={96}
                      imageClassName="h-[58px] w-[58px] rounded-[14px] object-cover"
                      placeholderClassName="flex h-[58px] w-[58px] shrink-0 items-center justify-center rounded-[14px] bg-[#1B1E23] text-[11px] font-bold text-[#8B919B]"
                      placeholderLabel={TEXT.image}
                      buttonClassName="shrink-0 rounded-[14px]"
                      sizes="58px"
                    />
                    <div className="min-w-0">
                      <div className="flex min-w-0 flex-wrap items-center gap-1.5">
                        <h3 className="min-w-0 break-words text-[15px] font-black leading-5 text-[#F9FAFB]">{row.name}</h3>
                        <span className={`shrink-0 rounded-full border px-2 py-0.5 text-[11px] font-black ${status.className}`}>
                          {status.label}
                        </span>
                      </div>
                      <p className="mt-0.5 break-words text-[12px] font-semibold leading-4 text-[#8B919B]">
                        {row.muscleGroup || TEXT.noMuscleGroup}
                      </p>
                      <p className="mt-0.5 text-[12px] font-bold text-[#D1D5DB]">
                        {row.completedSets}/{row.setCount} set
                      </p>
                    </div>
                    <TodayExerciseAction
                      action={action}
                      className={`inline-flex min-h-[44px] w-full items-center justify-center rounded-[14px] px-2 text-[14px] font-black transition active:scale-[0.98] ${
                        row.isCompleted
                          ? "border border-[#2A2F36] bg-[#0A0B0D] text-[#F9FAFB]"
                          : row.isStarted
                            ? "bg-[#C8F31D] text-[#0A0B0D]"
                            : "bg-[#C8F31D] text-[#0A0B0D]"
                      }`}
                      cta={status.cta}
                      exerciseLogId={row.exerciseLogId}
                      isCompleted={row.isCompleted}
                      isStarted={row.isStarted}
                      onBeforeNavigate={() => setOpen(false)}
                      restDueAtMs={restDueAtMs}
                      workoutDayExerciseId={row.workoutDayExerciseId}
                    />
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
