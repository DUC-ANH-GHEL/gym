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
    <AppCard className="space-y-4 border-[#1F2329] bg-[#14161A] p-4">
      <div className="space-y-2">
        <div className="flex items-center justify-between gap-3">
          <p className="text-[13px] font-semibold text-[#C8F31D]">{dayNames[day.dayOfWeek] || "Ngày tập"}</p>
          <span
            className={`rounded-full px-3 py-1 text-[12px] font-semibold ${
              isRestDay ? "bg-[#1B1E23] text-[#B6BBC4]" : "bg-[#C8F31D]/12 text-[#C8F31D]"
            }`}
          >
            {isRestDay ? "Ngày nghỉ" : "Ngày tập"}
          </span>
        </div>
        <h2 className="text-[22px] font-bold leading-tight text-[#F4F5F7]">{day.title}</h2>
      </div>

      <form action={updateAction} className="space-y-3 rounded-[18px] border border-[#1F2329] bg-[#0A0B0D] p-4">
        <input type="hidden" name="dayOfWeek" value={day.dayOfWeek} />
        <AppInput name="title" defaultValue={day.title} placeholder="Tên buổi tập" className="border-[#2A2F36] bg-[#14161A]" />
        <label className="flex min-h-[52px] items-center gap-3 rounded-[16px] border border-[#1F2329] bg-[#0A0B0D] px-4 text-[14px] font-semibold text-[#F4F5F7]">
          <input
            type="checkbox"
            name="isRestDay"
            checked={isRestDay}
            onChange={(event) => setIsRestDay(event.target.checked)}
            className="h-5 w-5 accent-[#C8F31D]"
          />
          Đánh dấu là ngày nghỉ
        </label>
        <AppButton className="w-full bg-[#C8F31D] text-[#14161A] hover:bg-[#C8F31D]">Lưu ngày</AppButton>
      </form>

      {isRestDay ? (
        <div className="rounded-[18px] border border-dashed border-[#1F2329] bg-[#0A0B0D] px-4 py-5">
          <p className="text-[14px] font-semibold text-[#B6BBC4]">Ngày này đang là ngày nghỉ.</p>
          <p className="mt-1 text-[13px] leading-5 text-[#8B919B]">Bỏ tick là panel chọn bài hiện ngay. Không cần bấm lưu trước để nhìn thấy nó.</p>
          {hasExercises ? <p className="mt-3 text-[13px] text-[#C8F31D]">Buổi này đang có sẵn {day.exercises.length} bài đã lưu, hiện tạm ẩn vì đang bật ngày nghỉ.</p> : null}
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
        <AppCard className="border-[#1F2329] bg-[#0A0B0D]">
          <p className="text-[14px] leading-6 text-[#8B919B]">
            {isRestDay ? "Chưa có bài nào trong ngày nghỉ này." : "Buổi này chưa có bài nào. Chọn từ panel phía trên để thêm nhanh nhiều bài cùng lúc."}
          </p>
        </AppCard>
      ) : (
        exercisesNode
      )}
    </AppCard>
  );
}
