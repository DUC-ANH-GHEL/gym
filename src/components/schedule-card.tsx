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
    <AppCard className="space-y-3">
      <div>
        <p className="text-[13px] font-semibold text-[#38BDF8]">{dayNames[day.dayOfWeek] || "Ngày tập"}</p>
        <h2 className="text-[18px] font-bold text-[#F9FAFB]">{day.title}</h2>
        {day.isRestDay ? <p className="text-[13px] text-[#9CA3AF]">Ngày nghỉ</p> : null}
      </div>
      {children}
    </AppCard>
  );
}
