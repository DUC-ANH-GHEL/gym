"use client";

import { useState } from "react";

const TEXT = {
  weight: "T\u1ea1",
  reps: "S\u1ed1 l\u1ea7n",
  decreaseWeight: "Gi\u1ea3m t\u1ea1",
  resetWeight: "\u0110\u1eb7t l\u1ea1i t\u1ea1",
  increaseWeight: "T\u0103ng t\u1ea1",
  decreaseReps: "Gi\u1ea3m s\u1ed1 l\u1ea7n",
  resetReps: "\u0110\u1eb7t l\u1ea1i s\u1ed1 l\u1ea7n",
  increaseReps: "T\u0103ng s\u1ed1 l\u1ea7n",
  repUnit: "l\u1ea7n",
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
  action,
}: {
  setLogId: string;
  setNumber: number;
  defaultWeightKg: number | null;
  defaultReps: number | null;
  action: (formData: FormData) => void | Promise<void>;
}) {
  const [weightKg, setWeightKg] = useState(() => defaultWeightKg ?? 0);
  const [reps, setReps] = useState(() => defaultReps ?? 0);

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
              onClick={() => setWeightKg((value) => Math.max(0, Number((value - 2.5).toFixed(1))))}
              aria-label={TEXT.decreaseWeight}
            >
              -
            </button>
            <button
              type="button"
              className="min-w-0 whitespace-nowrap rounded-[12px] bg-[#111827] px-1 py-2 text-center text-[17px] font-black text-[#F9FAFB]"
              onClick={() => setWeightKg(0)}
              aria-label={TEXT.resetWeight}
            >
              {formatNumber(weightKg) || "0"} kg
            </button>
            <button
              type="button"
              className="h-11 rounded-[12px] bg-[#1F2937] text-[22px] font-bold text-[#F9FAFB] active:scale-[0.97]"
              onClick={() => setWeightKg((value) => Number((value + 2.5).toFixed(1)))}
              aria-label={TEXT.increaseWeight}
            >
              +
            </button>
          </div>
        </div>

        <div className="rounded-[16px] border border-[#263241] bg-[#0B0F14] p-2">
          <p className="px-1 text-[12px] font-bold text-[#9CA3AF]">{TEXT.reps}</p>
          <div className="mt-2 grid grid-cols-[30px_minmax(0,1fr)_30px] items-center gap-1">
            <button
              type="button"
              className="h-11 rounded-[12px] bg-[#1F2937] text-[22px] font-bold text-[#F9FAFB] active:scale-[0.97]"
              onClick={() => setReps((value) => Math.max(0, value - 1))}
              aria-label={TEXT.decreaseReps}
            >
              -
            </button>
            <button
              type="button"
              className="min-w-0 whitespace-nowrap rounded-[12px] bg-[#111827] px-1 py-2 text-center text-[17px] font-black text-[#F9FAFB]"
              onClick={() => setReps(0)}
              aria-label={TEXT.resetReps}
            >
              {reps || 0} {TEXT.repUnit}
            </button>
            <button
              type="button"
              className="h-11 rounded-[12px] bg-[#1F2937] text-[22px] font-bold text-[#F9FAFB] active:scale-[0.97]"
              onClick={() => setReps((value) => value + 1)}
              aria-label={TEXT.increaseReps}
            >
              +
            </button>
          </div>
        </div>
      </div>

      <button className="min-h-[56px] w-full rounded-[16px] bg-[#22C55E] px-4 py-3 text-[18px] font-black text-white shadow-[0_14px_28px_rgba(34,197,94,0.18)] transition active:scale-[0.98]">
        Xong set {setNumber}
      </button>
    </form>
  );
}
