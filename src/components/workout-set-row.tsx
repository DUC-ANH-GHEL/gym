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
    <form action={action} className={`space-y-3 rounded-[16px] border p-3 ${setLog.isCompleted ? "border-[#C8F31D]/60 bg-[#1B2208]" : "border-[#2A2F36] bg-[#1B1E23]"}`}>
      <input type="hidden" name="setLogId" value={setLog.id} />
      <div className="flex items-center justify-between gap-3">
        <div className="min-w-0">
          <p className="text-[17px] font-bold text-[#F4F5F7]">Set {setNumber}</p>
          <p className="text-[13px] leading-5 text-[#8B919B]">
            Kế hoạch: {setLog.intensityPercent ?? 0}% nặng, {setLog.targetReps ?? 0} reps, {setLog.targetWeightKg ?? 0} kg
          </p>
        </div>
        <label className="flex min-h-[48px] shrink-0 items-center gap-2 rounded-[14px] bg-[#0A0B0D] px-3 text-[13px] font-bold text-[#F4F5F7]">
          <input type="checkbox" name="isCompleted" defaultChecked={setLog.isCompleted} className="h-6 w-6 accent-[#C8F31D]" />
          Xong
        </label>
      </div>

      <div className="grid grid-cols-2 gap-2">
        <label className="space-y-1">
          <span className="text-[12px] font-medium text-[#8B919B]">Tạ thực tế (kg)</span>
          <AppInput type="number" step="0.5" name="actualWeightKg" defaultValue={setLog.actualWeightKg ?? ""} placeholder="Ví dụ 40" inputMode="decimal" />
        </label>
        <label className="space-y-1">
          <span className="text-[12px] font-medium text-[#8B919B]">Reps thực tế</span>
          <AppInput type="number" name="actualReps" defaultValue={setLog.actualReps ?? ""} placeholder="Ví dụ 10" inputMode="numeric" />
        </label>
      </div>

      <label className="space-y-1">
        <span className="text-[12px] font-medium text-[#8B919B]">Ghi chú</span>
        <AppInput name="note" defaultValue={setLog.note ?? ""} placeholder="Ví dụ: set này khá nặng" />
      </label>

      <AppButton className="w-full bg-[#C8F31D] text-[#0A0B0D] hover:bg-[#C8F31D]">Lưu set</AppButton>
    </form>
  );
}
