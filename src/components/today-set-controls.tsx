"use client";

import type { FormEvent } from "react";
import { useEffect, useState } from "react";
import { useFormStatus } from "react-dom";
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
  saving: "\u0110ang l\u01b0u...",
};

function FullScreenLoading() {
  const { pending } = useFormStatus();

  if (!pending) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#0B0F14]/75 px-6 backdrop-blur-sm" aria-live="polite">
      <div className="flex min-h-[112px] w-full max-w-[260px] flex-col items-center justify-center rounded-[22px] border border-[#263241] bg-[#111827] px-5 py-4 text-center shadow-[0_24px_70px_rgba(0,0,0,0.45)]">
        <div className="h-9 w-9 animate-spin rounded-full border-4 border-[#334155] border-t-[#38BDF8]" />
        <p className="mt-3 text-[17px] font-black text-[#F9FAFB]">{TEXT.saving}</p>
      </div>
    </div>
  );
}

function SubmitSetButton({ restLocked, setNumber }: { restLocked: boolean; setNumber: number }) {
  const { pending } = useFormStatus();
  const disabled = restLocked || pending;

  return (
    <>
      <button
        type="submit"
        disabled={disabled}
        className="fixed bottom-[calc(64px+env(safe-area-inset-bottom))] left-1/2 z-30 min-h-[52px] w-[calc(100%-24px)] max-w-[456px] -translate-x-1/2 rounded-[16px] bg-[#22C55E] px-4 py-2.5 text-[18px] font-black text-white shadow-[0_14px_28px_rgba(34,197,94,0.22)] transition active:scale-[0.98] disabled:cursor-not-allowed disabled:bg-[#334155] disabled:text-[#CBD5E1] disabled:shadow-none disabled:active:scale-100"
      >
        {pending ? TEXT.saving : restLocked ? TEXT.waitRest : `Xong set ${setNumber}`}
      </button>
      <FullScreenLoading />
    </>
  );
}

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
    <form action={action} onSubmit={handleSubmit} noValidate className="space-y-1.5">
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

      <SubmitSetButton restLocked={restLocked} setNumber={setNumber} />
    </form>
  );
}
