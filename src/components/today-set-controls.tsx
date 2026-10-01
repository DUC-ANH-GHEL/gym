"use client";

import type { FormEvent } from "react";
import { useEffect, useState, useTransition } from "react";
import {
  clampWorkoutWeightKg,
  finalizeWorkoutWeightInput,
  formatWorkoutWeightKg,
  MAX_WORKOUT_WEIGHT_KG,
  updateWorkoutWeightInput,
} from "@/lib/workout-set-entry";
import { EXERCISE_REST_SECONDS, SET_REST_SECONDS } from "@/lib/workout-rest";

const TEXT = {
  weight: "T\u1ea1",
  weightInput: "Nh\u1eadp t\u1ea1",
  reps: "S\u1ed1 l\u1ea7n",
  decreaseWeight: "Gi\u1ea3m t\u1ea1",
  increaseWeight: "T\u0103ng t\u1ea1",
  repUnit: "l\u1ea7n",
  waitRest: "\u0110ang ngh\u1ec9",
  saving: "\u0110ang ghi nh\u1eadn...",
};

function SubmitSetButton({ restLocked, setNumber, saving }: { restLocked: boolean; setNumber: number; saving: boolean }) {
  const disabled = restLocked || saving;
  const label = restLocked ? TEXT.waitRest : saving ? TEXT.saving : `Xong set ${setNumber}`;

  return (
    <button
      type="submit"
      disabled={disabled}
      className="fixed bottom-[calc(64px+env(safe-area-inset-bottom))] left-1/2 z-30 min-h-[52px] w-[calc(100%-24px)] max-w-[456px] -translate-x-1/2 rounded-[16px] bg-[#22C55E] px-4 py-2.5 text-[18px] font-black text-white shadow-[0_14px_28px_rgba(34,197,94,0.22)] transition active:scale-[0.98] disabled:cursor-not-allowed disabled:bg-[#334155] disabled:text-[#CBD5E1] disabled:shadow-none disabled:active:scale-100"
      aria-live="polite"
    >
      {label}
    </button>
  );
}

export function TodaySetControls({
  setLogId,
  setNumber,
  defaultWeightKg,
  defaultReps,
  restDueAtMs,
  isLastSet,
  action,
}: {
  setLogId: string;
  setNumber: number;
  defaultWeightKg: number | null;
  defaultReps: number | null;
  restDueAtMs: number | null;
  isLastSet: boolean;
  action: (formData: FormData) => Promise<void>;
}) {
  const [isSaving, startTransition] = useTransition();
  const [weightKg, setWeightKg] = useState(() => clampWorkoutWeightKg(defaultWeightKg ?? 0));
  const [weightText, setWeightText] = useState(() => formatWorkoutWeightKg(clampWorkoutWeightKg(defaultWeightKg ?? 0)));
  const reps = defaultReps ?? 0;
  const [now, setNow] = useState(() => Date.now());
  // Start the rest lock locally on tap; the server response replaces it with the real one.
  const [optimisticDueAtMs, setOptimisticDueAtMs] = useState<number | null>(null);
  const effectiveDueAtMs = Math.max(restDueAtMs ?? 0, optimisticDueAtMs ?? 0);
  const restLocked = effectiveDueAtMs > now;

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const weightInput = event.currentTarget.elements.namedItem("actualWeightKg");
    if (!(weightInput instanceof HTMLInputElement)) {
      return;
    }

    const nextText = finalizeWorkoutWeightInput(weightInput.value, weightKg);
    const nextWeight = clampWorkoutWeightKg(Number(nextText));
    weightInput.value = nextText;
    setWeightText(nextText);
    setWeightKg(nextWeight);

    const formData = new FormData(event.currentTarget);
    const startedAt = Date.now();
    setNow(startedAt);
    setOptimisticDueAtMs(startedAt + (isLastSet ? EXERCISE_REST_SECONDS : SET_REST_SECONDS) * 1000);
    startTransition(async () => {
      try {
        await action(formData);
      } catch (error) {
        setOptimisticDueAtMs(null);
        throw error;
      }
    });
  }

  useEffect(() => {
    if (!restLocked) {
      return;
    }

    const interval = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(interval);
  }, [restLocked]);

  return (
    <form onSubmit={handleSubmit} noValidate className="space-y-1.5">
      <input type="hidden" name="setLogId" value={setLogId} />
      <input type="hidden" name="isCompleted" value="on" />
      <input type="hidden" name="actualReps" value={formatWorkoutWeightKg(reps)} />

      <div className="grid grid-cols-2 gap-2">
        <div className="rounded-[14px] border border-[#263241] bg-[#0B0F14] p-1.5">
          <p className="px-1 text-[12px] font-bold text-[#9CA3AF]">{TEXT.weight}</p>
          <div className="mt-1 grid grid-cols-[30px_minmax(0,1fr)_30px] items-center gap-1">
            <button
              type="button"
              disabled={restLocked}
              className="h-9 rounded-[12px] bg-[#1F2937] text-[22px] font-bold text-[#F9FAFB] active:scale-[0.97] disabled:cursor-not-allowed disabled:opacity-55 disabled:active:scale-100"
              onClick={() =>
                setWeightKg((value) => {
                  const nextValue = clampWorkoutWeightKg(value - 2.5);
                  setWeightText(formatWorkoutWeightKg(nextValue));
                  return nextValue;
                })
              }
              aria-label={TEXT.decreaseWeight}
            >
              -
            </button>
            <label className="flex min-w-0 items-center justify-center rounded-[12px] bg-[#111827] px-1 py-1.5 text-center text-[16px] font-black text-[#F9FAFB]">
              <input
                type="number"
                min={0}
                max={MAX_WORKOUT_WEIGHT_KG}
                step={0.5}
                inputMode="decimal"
                name="actualWeightKg"
                value={weightText}
                disabled={restLocked}
                onChange={(event) => {
                  const nextInput = updateWorkoutWeightInput(event.target.value, weightKg);
                  setWeightText(nextInput.text);
                  setWeightKg(nextInput.weightKg);
                }}
                onBlur={(event) => {
                  const nextText = finalizeWorkoutWeightInput(event.target.value, weightKg);
                  const nextWeight = clampWorkoutWeightKg(Number(nextText));
                  setWeightText(nextText);
                  setWeightKg(nextWeight);
                }}
                className="w-[56px] bg-transparent text-center text-[16px] font-black text-[#F9FAFB] outline-none disabled:opacity-70"
                aria-label={TEXT.weightInput}
              />
              <span className="shrink-0">kg</span>
            </label>
            <button
              type="button"
              disabled={restLocked}
              className="h-9 rounded-[12px] bg-[#1F2937] text-[22px] font-bold text-[#F9FAFB] active:scale-[0.97] disabled:cursor-not-allowed disabled:opacity-55 disabled:active:scale-100"
              onClick={() =>
                setWeightKg((value) => {
                  const nextValue = clampWorkoutWeightKg(value + 2.5);
                  setWeightText(formatWorkoutWeightKg(nextValue));
                  return nextValue;
                })
              }
              aria-label={TEXT.increaseWeight}
            >
              +
            </button>
          </div>
        </div>

        <div className="rounded-[14px] border border-[#263241] bg-[#0B0F14] p-1.5">
          <p className="px-1 text-[12px] font-bold text-[#9CA3AF]">{TEXT.reps}</p>
          <div className="mt-1 flex h-9 items-center justify-center rounded-[12px] bg-[#111827] px-2 text-center text-[16px] font-black text-[#F9FAFB]">
            <span className="min-w-0 whitespace-nowrap">
              {reps || 0} {TEXT.repUnit}
            </span>
          </div>
        </div>
      </div>

      <SubmitSetButton restLocked={restLocked} setNumber={setNumber} saving={isSaving} />
    </form>
  );
}
