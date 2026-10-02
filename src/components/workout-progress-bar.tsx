export function WorkoutProgressBar({ completed, total }: { completed: number; total: number }) {
  const percent = total === 0 ? 0 : Math.round((completed / total) * 100);
  return (
    <div className="space-y-2 rounded-[16px] border border-[#2A2F36] bg-[#1B1E23] p-4">
      <div className="flex items-center justify-between text-[15px] font-semibold text-[#F4F5F7]">
        <span>Tiến độ</span>
        <span>{completed}/{total} set</span>
      </div>
      <div className="h-3 overflow-hidden rounded-full bg-[#2A2F36]">
        <div className="h-full rounded-full bg-[#C8F31D]" style={{ width: `${percent}%` }} />
      </div>
    </div>
  );
}
