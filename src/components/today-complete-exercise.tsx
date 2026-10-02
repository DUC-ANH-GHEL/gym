"use client";

import type { FormEvent } from "react";
import { useEffect, useId, useState, useTransition } from "react";
import {
  clampWorkoutWeightKg,
  finalizeWorkoutWeightInput,
  formatWorkoutWeightKg,
  MAX_WORKOUT_WEIGHT_KG,
  updateWorkoutWeightInput,
} from "@/lib/workout-set-entry";
import { EXERCISE_REST_SECONDS } from "@/lib/workout-rest";

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
  action: (formData: FormData) => Promise<void>;
  defaultWeightKg: number | null;
  exerciseLogId: string;
  restDueAtMs: number | null;
}) {
  const titleId = useId();
  const [open, setOpen] = useState(false);
  const [isSaving, startTransition] = useTransition();
  const initialWeight = clampWorkoutWeightKg(defaultWeightKg ?? 0);
  const [weightKg, setWeightKg] = useState(initialWeight);
  const [weightText, setWeightText] = useState(() => formatWorkoutWeightKg(initialWeight));
  const [now, setNow] = useState(() => Date.now());
  const [optimisticDueAtMs, setOptimisticDueAtMs] = useState<number | null>(null);
  const restLocked = Math.max(restDueAtMs ?? 0, optimisticDueAtMs ?? 0) > now;

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
    const startedAt = Date.now();
    setNow(startedAt);
    setOptimisticDueAtMs(startedAt + EXERCISE_REST_SECONDS * 1000);
    setOpen(false);
    startTransition(async () => {
      try {
        await action(formData);
      } catch (error) {
        setOptimisticDueAtMs(null);
        throw error;
      }
    });
  }

  return (
    <>
      <button
        type="button"
        disabled={restLocked}
        onClick={() => setOpen(true)}
        className="min-h-[46px] w-full rounded-[14px] border border-[#1F2329] bg-[#14161A] px-4 py-2 text-[15px] font-bold text-[#B6BBC4] transition active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-55 disabled:active:scale-100"
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
            className="w-full max-w-[480px] rounded-[24px] border border-[#1F2329] bg-[#0A0B0D] p-4 shadow-2xl"
          >
            <input type="hidden" name="exerciseLogId" value={exerciseLogId} />
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <h2 id={titleId} className="text-[20px] font-black text-[#F4F5F7]">
                  {TEXT.title}
                </h2>
                <p className="mt-1 text-[14px] font-semibold leading-5 text-[#B6BBC4]">{TEXT.description}</p>
              </div>
            </div>

            <div className="mt-4 rounded-[16px] border border-[#1F2329] bg-[#14161A] p-2">
              <p className="px-1 text-[13px] font-bold text-[#8B919B]">{TEXT.weight}</p>
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
                  className="h-12 rounded-[14px] bg-[#1B1E23] text-[28px] font-bold text-[#F4F5F7] disabled:opacity-55"
                >
                  -
                </button>
                <label className="flex h-12 min-w-0 items-center justify-center rounded-[14px] bg-[#0A0B0D] px-2 text-[20px] font-black text-[#F4F5F7]">
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
                  className="h-12 rounded-[14px] bg-[#1B1E23] text-[28px] font-bold text-[#F4F5F7] disabled:opacity-55"
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
                className="min-h-[50px] rounded-[14px] border border-[#2A2F36] bg-[#14161A] px-3 text-[15px] font-black text-[#F4F5F7] disabled:opacity-55"
              >
                {TEXT.cancel}
              </button>
              <button
                type="submit"
                disabled={isSaving}
                className="min-h-[50px] rounded-[14px] bg-[#C8F31D] px-3 text-[15px] font-black text-[#0A0B0D] disabled:opacity-55"
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
