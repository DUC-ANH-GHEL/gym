export function WorkoutProgressBar({ completed, total }: { completed: number; total: number }) {
  const percent = total === 0 ? 0 : Math.round((completed / total) * 100);
  return (
    <div className="space-y-2 rounded-[16px] border border-[#374151] bg-[#1F2937] p-4">
      <div className="flex items-center justify-between text-[15px] font-semibold text-[#F9FAFB]">
        <span>Tiến độ</span>
        <span>{completed}/{total} set</span>
      </div>
      <div className="h-3 overflow-hidden rounded-full bg-[#374151]">
        <div className="h-full rounded-full bg-[#22C55E]" style={{ width: `${percent}%` }} />
      </div>
    </div>
  );
}
