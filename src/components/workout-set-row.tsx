import { AppButton, AppInput } from "@/components/ui";

export function WorkoutSetRow({
  setLog,
  action,
}: {
  setLog: {
    id: string;
    setIndex: number;
    intensityPercent: number | null;
    targetReps: number | null;
    targetWeightKg: number | null;
    actualReps: number | null;
    actualWeightKg: number | null;
    note: string | null;
    isCompleted: boolean;
  };
  action: (formData: FormData) => Promise<void>;
}) {
  return (
    <form action={action} className={`space-y-3 rounded-[16px] border p-3 ${setLog.isCompleted ? "border-[#22C55E]/60 bg-[#12301f]" : "border-[#374151] bg-[#1F2937]"}`}>
      <input type="hidden" name="setLogId" value={setLog.id} />
      <div className="flex items-center justify-between gap-3">
        <div className="min-w-0">
          <p className="text-[17px] font-bold text-[#F9FAFB]">Set {setLog.setIndex + 1}</p>
          <p className="truncate text-[13px] text-[#9CA3AF]">
            {setLog.intensityPercent ?? 0}% sức · {setLog.targetReps ?? 0} reps · {setLog.targetWeightKg ?? 0}kg
          </p>
        </div>
        <label className="flex min-h-[48px] shrink-0 items-center gap-2 rounded-[14px] bg-[#0B0F14] px-3 text-[13px] font-bold text-[#F9FAFB]">
          <input type="checkbox" name="isCompleted" defaultChecked={setLog.isCompleted} className="h-6 w-6 accent-[#22C55E]" />
          Xong
        </label>
      </div>
      <div className="grid grid-cols-2 gap-2">
        <AppInput type="number" step="0.5" name="actualWeightKg" defaultValue={setLog.actualWeightKg ?? ""} placeholder="Kg thực tế" inputMode="decimal" />
        <AppInput type="number" name="actualReps" defaultValue={setLog.actualReps ?? ""} placeholder="Reps" inputMode="numeric" />
      </div>
      <AppInput name="note" defaultValue={setLog.note ?? ""} placeholder="Ghi chú nhanh" />
      <AppButton className="w-full bg-[#38BDF8] text-[#0B0F14] hover:bg-[#0ea5e9]">Lưu set</AppButton>
    </form>
  );
}
