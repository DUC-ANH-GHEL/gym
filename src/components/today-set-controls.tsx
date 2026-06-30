"use client";

import { useEffect, useState } from "react";
import { clampWorkoutWeightKg, MAX_WORKOUT_WEIGHT_KG } from "@/lib/workout-set-entry";

const TEXT = {
  weight: "T\u1ea1",
  weightInput: "Nh\u1eadp t\u1ea1",
  reps: "S\u1ed1 l\u1ea7n",
  decreaseWeight: "Gi\u1ea3m t\u1ea1",
  increaseWeight: "T\u0103ng t\u1ea1",
  repUnit: "l\u1ea7n",
  waitRest: "\u0110ang ngh\u1ec9",
};

function formatNumber(value: number | null) {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    return "";
  }

  return Number.isInteger(value) ? String(value) : String(value).replace(/\.0$/, "");
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
  const reps = defaultReps ?? 0;
  const [now, setNow] = useState(() => Date.now());
  const restLocked = typeof restDueAtMs === "number" && restDueAtMs > now;

  useEffect(() => {
    if (!restLocked) {
      return;
    }

    const interval = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(interval);
  }, [restLocked]);

  return (
    <form action={action} className="space-y-3">
      <input type="hidden" name="setLogId" value={setLogId} />
      <input type="hidden" name="isCompleted" value="on" />
      <input type="hidden" name="actualWeightKg" value={formatNumber(weightKg)} />
      <input type="hidden" name="actualReps" value={formatNumber(reps)} />

      <div className="grid grid-cols-2 gap-2">
        <div className="rounded-[16px] border border-[#263241] bg-[#0B0F14] p-2">
          <p className="px-1 text-[12px] font-bold text-[#9CA3AF]">{TEXT.weight}</p>
          <div className="mt-2 grid grid-cols-[30px_minmax(0,1fr)_30px] items-center gap-1">
            <button
              type="button"
              className="h-11 rounded-[12px] bg-[#1F2937] text-[22px] font-bold text-[#F9FAFB] active:scale-[0.97]"
              onClick={() => setWeightKg((value) => clampWorkoutWeightKg(value - 2.5))}
              aria-label={TEXT.decreaseWeight}
            >
              -
            </button>
            <label className="flex min-w-0 items-center justify-center rounded-[12px] bg-[#111827] px-1 py-2 text-center text-[17px] font-black text-[#F9FAFB]">
              <input
                type="number"
                min={0}
                max={MAX_WORKOUT_WEIGHT_KG}
                step={0.5}
                inputMode="decimal"
                value={formatNumber(weightKg) || "0"}
                onChange={(event) => setWeightKg(clampWorkoutWeightKg(Number(event.target.value)))}
                className="w-[44px] bg-transparent text-center text-[17px] font-black text-[#F9FAFB] outline-none"
                aria-label={TEXT.weightInput}
              />
              <span className="shrink-0">kg</span>
            </label>
            <button
              type="button"
              className="h-11 rounded-[12px] bg-[#1F2937] text-[22px] font-bold text-[#F9FAFB] active:scale-[0.97]"
              onClick={() => setWeightKg((value) => clampWorkoutWeightKg(value + 2.5))}
              aria-label={TEXT.increaseWeight}
            >
              +
            </button>
          </div>
        </div>

        <div className="rounded-[16px] border border-[#263241] bg-[#0B0F14] p-2">
          <p className="px-1 text-[12px] font-bold text-[#9CA3AF]">{TEXT.reps}</p>
          <div className="mt-2 flex h-11 items-center justify-center rounded-[12px] bg-[#111827] px-2 text-center text-[17px] font-black text-[#F9FAFB]">
            <span className="min-w-0 whitespace-nowrap">
              {reps || 0} {TEXT.repUnit}
            </span>
          </div>
        </div>
      </div>

      <button
        disabled={restLocked}
        className="min-h-[56px] w-full rounded-[16px] bg-[#22C55E] px-4 py-3 text-[18px] font-black text-white shadow-[0_14px_28px_rgba(34,197,94,0.18)] transition active:scale-[0.98] disabled:cursor-not-allowed disabled:bg-[#334155] disabled:text-[#CBD5E1] disabled:shadow-none disabled:active:scale-100"
      >
        {restLocked ? TEXT.waitRest : `Xong set ${setNumber}`}
      </button>
    </form>
  );
}
