import { AppCard } from "@/components/ui";
import type { ReactNode } from "react";

const dayNames: Record<number, string> = {
  0: "Chủ nhật",
  1: "Thứ 2",
  2: "Thứ 3",
  3: "Thứ 4",
  4: "Thứ 5",
  5: "Thứ 6",
  6: "Thứ 7",
};

export function ScheduleCard({
  day,
  children,
}: {
  day: { dayOfWeek: number; title: string; isRestDay: boolean };
  children?: ReactNode;
}) {
  return (
    <AppCard className="space-y-4 border-[#1F2329] bg-[#14161A] p-4">
      <div className="space-y-2">
        <div className="flex items-center justify-between gap-3">
          <p className="text-[13px] font-semibold text-[#C8F31D]">{dayNames[day.dayOfWeek] || "Ngày tập"}</p>
          <span
            className={`rounded-full px-3 py-1 text-[12px] font-semibold ${
              day.isRestDay ? "bg-[#1B1E23] text-[#B6BBC4]" : "bg-[#C8F31D]/12 text-[#C8F31D]"
            }`}
          >
            {day.isRestDay ? "Ngày nghỉ" : "Ngày tập"}
          </span>
        </div>
        <h2 className="text-[22px] font-bold leading-tight text-[#F4F5F7]">{day.title}</h2>
      </div>
      {children}
    </AppCard>
  );
}
