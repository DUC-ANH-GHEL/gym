"use client";

import { useState } from "react";
import type { ReactNode } from "react";
import { CatalogPickerPanel } from "@/components/catalog-picker-panel";
import { AppButton, AppCard, AppInput } from "@/components/ui";

type CatalogItem = {
  id: string;
  name: string;
  muscleGroup: string | null;
  note?: string | null;
  defaultWeightKg?: number | null;
};

type ScheduleDayCardProps = {
  day: {
    dayOfWeek: number;
    title: string;
    isRestDay: boolean;
    exercises: { catalogItemId: string }[];
  };
  catalogItems: CatalogItem[];
  exercisesNode: ReactNode;
  updateAction: (formData: FormData) => Promise<void>;
  addAction: (formData: FormData) => Promise<void>;
};

const dayNames: Record<number, string> = {
  0: "Chủ nhật",
  1: "Thứ 2",
  2: "Thứ 3",
  3: "Thứ 4",
  4: "Thứ 5",
  5: "Thứ 6",
  6: "Thứ 7",
};

export function ScheduleDayCard({ day, catalogItems, exercisesNode, updateAction, addAction }: ScheduleDayCardProps) {
  const [isRestDay, setIsRestDay] = useState(day.isRestDay);
  const hasExercises = day.exercises.length > 0;

  return (
    <AppCard className="space-y-4 border-[#243041] bg-[#121A2B] p-4">
      <div className="space-y-2">
        <div className="flex items-center justify-between gap-3">
          <p className="text-[13px] font-semibold text-[#38BDF8]">{dayNames[day.dayOfWeek] || "Ngày tập"}</p>
          <span
            className={`rounded-full px-3 py-1 text-[12px] font-semibold ${
              isRestDay ? "bg-[#1E293B] text-[#CBD5E1]" : "bg-[#0EA5E9]/12 text-[#7DD3FC]"
            }`}
          >
            {isRestDay ? "Ngày nghỉ" : "Ngày tập"}
          </span>
        </div>
        <h2 className="text-[22px] font-bold leading-tight text-[#F8FAFC]">{day.title}</h2>
      </div>

      <form action={updateAction} className="space-y-3 rounded-[18px] border border-[#243041] bg-[#0F172A] p-4">
        <input type="hidden" name="dayOfWeek" value={day.dayOfWeek} />
        <AppInput name="title" defaultValue={day.title} placeholder="Tên buổi tập" className="border-[#314155] bg-[#111C2E]" />
        <label className="flex min-h-[52px] items-center gap-3 rounded-[16px] border border-[#243041] bg-[#0B1220] px-4 text-[14px] font-semibold text-[#F8FAFC]">
          <input
            type="checkbox"
            name="isRestDay"
            checked={isRestDay}
            onChange={(event) => setIsRestDay(event.target.checked)}
            className="h-5 w-5 accent-[#0EA5E9]"
          />
          Đánh dấu là ngày nghỉ
        </label>
        <AppButton className="w-full bg-[#0EA5E9] text-[#082F49] hover:bg-[#38BDF8]">Lưu ngày</AppButton>
      </form>

      {isRestDay ? (
        <div className="rounded-[18px] border border-dashed border-[#243041] bg-[#0F172A] px-4 py-5">
          <p className="text-[14px] font-semibold text-[#E2E8F0]">Ngày này đang là ngày nghỉ.</p>
          <p className="mt-1 text-[13px] leading-5 text-[#94A3B8]">Bỏ tick là panel chọn bài hiện ngay. Không cần bấm lưu trước để nhìn thấy nó.</p>
          {hasExercises ? <p className="mt-3 text-[13px] text-[#7DD3FC]">Buổi này đang có sẵn {day.exercises.length} bài đã lưu, hiện tạm ẩn vì đang bật ngày nghỉ.</p> : null}
        </div>
      ) : (
        <form action={addAction}>
          <input type="hidden" name="dayOfWeek" value={day.dayOfWeek} />
          <CatalogPickerPanel
            items={catalogItems}
            existingIds={day.exercises.map((entry) => entry.catalogItemId)}
            title="Thêm bài vào buổi này"
            description="Chạm chọn nhiều bài theo nhóm cơ rồi thêm một lần."
            submitLabel="Thêm bài đã chọn"
            emptyLabel="Không còn bài phù hợp để thêm cho buổi này."
          />
        </form>
      )}

      {!hasExercises ? (
        <AppCard className="border-[#243041] bg-[#0F172A]">
          <p className="text-[14px] leading-6 text-[#94A3B8]">
            {isRestDay ? "Chưa có bài nào trong ngày nghỉ này." : "Buổi này chưa có bài nào. Chọn từ panel phía trên để thêm nhanh nhiều bài cùng lúc."}
          </p>
        </AppCard>
      ) : (
        exercisesNode
      )}
    </AppCard>
  );
}
