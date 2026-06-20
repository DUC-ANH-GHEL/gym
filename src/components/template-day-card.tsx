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

type TemplateDayCardProps = {
  day: {
    id: string;
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

export function TemplateDayCard({ day, catalogItems, exercisesNode, updateAction, addAction }: TemplateDayCardProps) {
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
        <input type="hidden" name="templateDayId" value={day.id} />
        <AppInput name="title" defaultValue={day.title} placeholder="Tên ngày" className="border-[#314155] bg-[#111C2E]" />
        <label className="flex min-h-[52px] items-center gap-3 rounded-[16px] border border-[#243041] bg-[#111827] px-4 text-[14px] font-semibold text-[#F8FAFC]">
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
          <p className="mt-1 text-[13px] leading-5 text-[#94A3B8]">Bỏ tick là panel gán bài hiện ngay. Không cần bấm lưu trước mới thấy.</p>
          {hasExercises ? <p className="mt-3 text-[13px] text-[#7DD3FC]">Hiện có {day.exercises.length} bài đã lưu cho ngày này, đang tạm ẩn vì bật ngày nghỉ.</p> : null}
        </div>
      ) : (
        <form action={addAction}>
          <input type="hidden" name="templateDayId" value={day.id} />
          <CatalogPickerPanel
            items={catalogItems}
            existingIds={day.exercises.map((exercise) => exercise.catalogItemId)}
            title="Gán bài cho ngày này"
            description="Chọn nhiều bài metadata theo nhóm cơ rồi thêm một lượt vào template."
            submitLabel="Thêm bài vào template"
            emptyLabel="Không còn metadata phù hợp để thêm cho ngày này."
          />
        </form>
      )}

      {!hasExercises ? (
        <div className="rounded-[18px] border border-dashed border-[#243041] bg-[#0F172A] px-4 py-5 text-[13px] leading-5 text-[#94A3B8]">
          {isRestDay ? "Ngày nghỉ này chưa có bài nào." : "Ngày tập này chưa có bài nào. Dùng panel phía trên để chọn nhiều bài một lần."}
        </div>
      ) : (
        exercisesNode
      )}
    </AppCard>
  );
}
