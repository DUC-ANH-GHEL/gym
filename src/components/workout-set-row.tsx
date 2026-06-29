import { AppButton, AppInput } from "@/components/ui";

export function WorkoutSetRow({
  setLog,
  displayIndex,
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
  displayIndex?: number;
  action: (formData: FormData) => Promise<void>;
}) {
  const setNumber = displayIndex ?? setLog.setIndex + 1;

  return (
    <form action={action} className={`space-y-3 rounded-[16px] border p-3 ${setLog.isCompleted ? "border-[#22C55E]/60 bg-[#12301f]" : "border-[#374151] bg-[#1F2937]"}`}>
      <input type="hidden" name="setLogId" value={setLog.id} />
      <div className="flex items-center justify-between gap-3">
        <div className="min-w-0">
          <p className="text-[17px] font-bold text-[#F9FAFB]">Set {setNumber}</p>
          <p className="text-[13px] leading-5 text-[#9CA3AF]">
            Kế hoạch: {setLog.intensityPercent ?? 0}% nặng, {setLog.targetReps ?? 0} reps, {setLog.targetWeightKg ?? 0} kg
          </p>
        </div>
        <label className="flex min-h-[48px] shrink-0 items-center gap-2 rounded-[14px] bg-[#0B0F14] px-3 text-[13px] font-bold text-[#F9FAFB]">
          <input type="checkbox" name="isCompleted" defaultChecked={setLog.isCompleted} className="h-6 w-6 accent-[#22C55E]" />
          Xong
        </label>
      </div>

      <div className="grid grid-cols-2 gap-2">
        <label className="space-y-1">
          <span className="text-[12px] font-medium text-[#9CA3AF]">Tạ thực tế (kg)</span>
          <AppInput type="number" step="0.5" name="actualWeightKg" defaultValue={setLog.actualWeightKg ?? ""} placeholder="Ví dụ 40" inputMode="decimal" />
        </label>
        <label className="space-y-1">
          <span className="text-[12px] font-medium text-[#9CA3AF]">Reps thực tế</span>
          <AppInput type="number" name="actualReps" defaultValue={setLog.actualReps ?? ""} placeholder="Ví dụ 10" inputMode="numeric" />
        </label>
      </div>

      <label className="space-y-1">
        <span className="text-[12px] font-medium text-[#9CA3AF]">Ghi chú</span>
        <AppInput name="note" defaultValue={setLog.note ?? ""} placeholder="Ví dụ: set này khá nặng" />
      </label>

      <AppButton className="w-full bg-[#38BDF8] text-[#0B0F14] hover:bg-[#0ea5e9]">Lưu set</AppButton>
    </form>
  );
}
