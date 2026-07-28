"use client";

import type { FormEvent } from "react";
import { useEffect, useId, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import type { WorkoutNavigationResult } from "@/lib/workout-actions";
import {
  clampWorkoutWeightKg,
  finalizeWorkoutWeightInput,
  formatWorkoutWeightKg,
  MAX_WORKOUT_WEIGHT_KG,
  updateWorkoutWeightInput,
} from "@/lib/workout-set-entry";

const TEXT = {
  open: "Xong cả bài",
  title: "Hoàn thành bài tập",
  description: "Nhập mức tạ bạn vừa tập. Mức này sẽ được ghi cho tất cả set của bài.",
  weight: "Mức tạ",
  cancel: "Quay lại",
  confirm: "Xong bài tập",
  saving: "Đang ghi nhận...",
  decreaseWeight: "Giảm tạ",
  increaseWeight: "Tăng tạ",
};

export function TodayCompleteExercise({
  action,
  defaultWeightKg,
  exerciseLogId,
  restDueAtMs,
}: {
  action: (formData: FormData) => Promise<WorkoutNavigationResult>;
  defaultWeightKg: number | null;
  exerciseLogId: string;
  restDueAtMs: number | null;
}) {
  const router = useRouter();
  const titleId = useId();
  const [open, setOpen] = useState(false);
  const [isSaving, startTransition] = useTransition();
  const initialWeight = clampWorkoutWeightKg(defaultWeightKg ?? 0);
  const [weightKg, setWeightKg] = useState(initialWeight);
  const [weightText, setWeightText] = useState(() => formatWorkoutWeightKg(initialWeight));
  const [now, setNow] = useState(() => Date.now());
  const restLocked = typeof restDueAtMs === "number" && restDueAtMs > now;

  useEffect(() => {
    if (!restLocked) {
      return;
    }

    const interval = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(interval);
  }, [restLocked]);

  function close() {
    if (!isSaving) {
      setOpen(false);
    }
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const weightInput = event.currentTarget.elements.namedItem("actualWeightKg");
    if (!(weightInput instanceof HTMLInputElement)) {
      return;
    }

    const nextText = finalizeWorkoutWeightInput(weightInput.value, weightKg);
    weightInput.value = nextText;
    setWeightText(nextText);
    setWeightKg(clampWorkoutWeightKg(Number(nextText)));

    const formData = new FormData(event.currentTarget);
    startTransition(async () => {
      const result = await action(formData);
      setOpen(false);
      router.replace(result.nextUrl);
    });
  }

  return (
    <>
      <button
        type="button"
        disabled={restLocked}
        onClick={() => setOpen(true)}
        className="min-h-[50px] w-full rounded-[14px] border border-[#38BDF8]/50 bg-[#082F49] px-4 py-2 text-[16px] font-black text-[#7DD3FC] transition active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-55 disabled:active:scale-100"
      >
        {TEXT.open}
      </button>

      {open ? (
        <div
          className="fixed inset-0 z-[80] flex items-end justify-center bg-black/65 px-3 pb-[calc(16px+env(safe-area-inset-bottom))] pt-[calc(16px+env(safe-area-inset-top))]"
          role="dialog"
          aria-modal="true"
          aria-labelledby={titleId}
          onClick={close}
        >
          <form
            noValidate
            onSubmit={handleSubmit}
            onClick={(event) => event.stopPropagation()}
            className="w-full max-w-[480px] rounded-[24px] border border-[#263241] bg-[#0B0F14] p-4 shadow-2xl"
          >
            <input type="hidden" name="exerciseLogId" value={exerciseLogId} />
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <h2 id={titleId} className="text-[20px] font-black text-[#F9FAFB]">
                  {TEXT.title}
                </h2>
                <p className="mt-1 text-[14px] font-semibold leading-5 text-[#CBD5E1]">{TEXT.description}</p>
              </div>
            </div>

            <div className="mt-4 rounded-[16px] border border-[#263241] bg-[#111827] p-2">
              <p className="px-1 text-[13px] font-bold text-[#9CA3AF]">{TEXT.weight}</p>
              <div className="mt-1 grid grid-cols-[48px_minmax(0,1fr)_48px] items-center gap-2">
                <button
                  type="button"
                  disabled={isSaving}
                  aria-label={TEXT.decreaseWeight}
                  onClick={() =>
                    setWeightKg((value) => {
                      const nextValue = clampWorkoutWeightKg(value - 2.5);
                      setWeightText(formatWorkoutWeightKg(nextValue));
                      return nextValue;
                    })
                  }
                  className="h-12 rounded-[14px] bg-[#1F2937] text-[28px] font-bold text-[#F9FAFB] disabled:opacity-55"
                >
                  -
                </button>
                <label className="flex h-12 min-w-0 items-center justify-center rounded-[14px] bg-[#0B0F14] px-2 text-[20px] font-black text-[#F9FAFB]">
                  <input
                    type="number"
                    min={0}
                    max={MAX_WORKOUT_WEIGHT_KG}
                    step={0.5}
                    inputMode="decimal"
                    name="actualWeightKg"
                    autoFocus
                    value={weightText}
                    disabled={isSaving}
                    onChange={(event) => {
                      const nextInput = updateWorkoutWeightInput(event.target.value, weightKg);
                      setWeightText(nextInput.text);
                      setWeightKg(nextInput.weightKg);
                    }}
                    onBlur={(event) => {
                      const nextText = finalizeWorkoutWeightInput(event.target.value, weightKg);
                      setWeightText(nextText);
                      setWeightKg(clampWorkoutWeightKg(Number(nextText)));
                    }}
                    className="w-[90px] bg-transparent text-center outline-none disabled:opacity-70"
                    aria-label={TEXT.weight}
                  />
                  <span>kg</span>
                </label>
                <button
                  type="button"
                  disabled={isSaving}
                  aria-label={TEXT.increaseWeight}
                  onClick={() =>
                    setWeightKg((value) => {
                      const nextValue = clampWorkoutWeightKg(value + 2.5);
                      setWeightText(formatWorkoutWeightKg(nextValue));
                      return nextValue;
                    })
                  }
                  className="h-12 rounded-[14px] bg-[#1F2937] text-[28px] font-bold text-[#F9FAFB] disabled:opacity-55"
                >
                  +
                </button>
              </div>
            </div>

            <div className="mt-4 grid grid-cols-2 gap-2">
              <button
                type="button"
                disabled={isSaving}
                onClick={close}
                className="min-h-[50px] rounded-[14px] border border-[#374151] bg-[#111827] px-3 text-[15px] font-black text-[#F9FAFB] disabled:opacity-55"
              >
                {TEXT.cancel}
              </button>
              <button
                type="submit"
                disabled={isSaving}
                className="min-h-[50px] rounded-[14px] bg-[#22C55E] px-3 text-[15px] font-black text-white disabled:opacity-55"
              >
                {isSaving ? TEXT.saving : TEXT.confirm}
              </button>
            </div>
          </form>
        </div>
      ) : null}
    </>
  );
}
