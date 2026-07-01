"use client";

import type { FormEvent } from "react";
import { useEffect, useState } from "react";
import {
  clampWorkoutWeightKg,
  finalizeWorkoutWeightInput,
  formatWorkoutWeightKg,
  MAX_WORKOUT_WEIGHT_KG,
  updateWorkoutWeightInput,
} from "@/lib/workout-set-entry";

const TEXT = {
  weight: "T\u1ea1",
  weightInput: "Nh\u1eadp t\u1ea1",
  reps: "S\u1ed1 l\u1ea7n",
  decreaseWeight: "Gi\u1ea3m t\u1ea1",
  increaseWeight: "T\u0103ng t\u1ea1",
  repUnit: "l\u1ea7n",
  waitRest: "\u0110ang ngh\u1ec9",
};

export function TodaySetControls({
  setLogId,
  setNumber,
  defaultWeightKg,
  defaultReps,
  restDueAtMs,
  action,
}: {
  setLogId: string;
  setNumber: number;
  defaultWeightKg: number | null;
  defaultReps: number | null;
  restDueAtMs: number | null;
  action: (formData: FormData) => void | Promise<void>;
}) {
  const [weightKg, setWeightKg] = useState(() => clampWorkoutWeightKg(defaultWeightKg ?? 0));
  const [weightText, setWeightText] = useState(() => formatWorkoutWeightKg(clampWorkoutWeightKg(defaultWeightKg ?? 0)));
  const reps = defaultReps ?? 0;
  const [now, setNow] = useState(() => Date.now());
  const restLocked = typeof restDueAtMs === "number" && restDueAtMs > now;

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    const weightInput = event.currentTarget.elements.namedItem("actualWeightKg");
    if (!(weightInput instanceof HTMLInputElement)) {
      return;
    }

    const nextText = finalizeWorkoutWeightInput(weightInput.value, weightKg);
    const nextWeight = clampWorkoutWeightKg(Number(nextText));
    weightInput.value = nextText;
    setWeightText(nextText);
    setWeightKg(nextWeight);
  }

  useEffect(() => {
    if (!restLocked) {
      return;
    }

    const interval = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(interval);
  }, [restLocked]);

  return (
    <form action={action} onSubmit={handleSubmit} noValidate className="space-y-2">
      <input type="hidden" name="setLogId" value={setLogId} />
      <input type="hidden" name="isCompleted" value="on" />
      <input type="hidden" name="actualReps" value={formatWorkoutWeightKg(reps)} />

      <div className="grid grid-cols-2 gap-2">
        <div className="rounded-[14px] border border-[#263241] bg-[#0B0F14] p-2">
          <p className="px-1 text-[12px] font-bold text-[#9CA3AF]">{TEXT.weight}</p>
          <div className="mt-1.5 grid grid-cols-[30px_minmax(0,1fr)_30px] items-center gap-1">
            <button
              type="button"
              className="h-10 rounded-[12px] bg-[#1F2937] text-[22px] font-bold text-[#F9FAFB] active:scale-[0.97]"
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
                className="w-[56px] bg-transparent text-center text-[16px] font-black text-[#F9FAFB] outline-none"
                aria-label={TEXT.weightInput}
              />
              <span className="shrink-0">kg</span>
            </label>
            <button
              type="button"
              className="h-10 rounded-[12px] bg-[#1F2937] text-[22px] font-bold text-[#F9FAFB] active:scale-[0.97]"
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

        <div className="rounded-[14px] border border-[#263241] bg-[#0B0F14] p-2">
          <p className="px-1 text-[12px] font-bold text-[#9CA3AF]">{TEXT.reps}</p>
          <div className="mt-1.5 flex h-10 items-center justify-center rounded-[12px] bg-[#111827] px-2 text-center text-[16px] font-black text-[#F9FAFB]">
            <span className="min-w-0 whitespace-nowrap">
              {reps || 0} {TEXT.repUnit}
            </span>
          </div>
        </div>
      </div>

      <button
        disabled={restLocked}
        className="min-h-[50px] w-full rounded-[16px] bg-[#22C55E] px-4 py-2.5 text-[18px] font-black text-white shadow-[0_14px_28px_rgba(34,197,94,0.18)] transition active:scale-[0.98] disabled:cursor-not-allowed disabled:bg-[#334155] disabled:text-[#CBD5E1] disabled:shadow-none disabled:active:scale-100"
      >
        {restLocked ? TEXT.waitRest : `Xong set ${setNumber}`}
      </button>
    </form>
  );
}
