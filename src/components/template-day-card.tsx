"use client";

import { useState } from "react";
import { CatalogPickerPanel } from "@/components/catalog-picker-panel";
import { AppButton, AppCard, AppInput, PendingButton } from "@/components/ui";

type CatalogItem = {
  id: string;
  name: string;
  muscleGroup: string | null;
  note?: string | null;
  defaultWeightKg?: number | null;
};

type TemplateSet = {
  id: string;
  setIndex: number;
  intensityPercent: number | null;
  targetReps: number | null;
  targetWeightKg: number | null;
};

type TemplateExercise = {
  id: string;
  catalogItemId: string;
  catalogItem: CatalogItem;
  sets: TemplateSet[];
};

type TemplateDayCardProps = {
  day: {
    id: string;
    dayOfWeek: number;
    title: string;
    isRestDay: boolean;
    exercises: TemplateExercise[];
  };
  catalogItems: CatalogItem[];
  updateAction: (formData: FormData) => Promise<void>;
  addAction: (formData: FormData) => Promise<void>;
  moveExerciseAction: (formData: FormData) => Promise<void>;
  removeExerciseAction: (formData: FormData) => Promise<void>;
  replaceExerciseAction: (formData: FormData) => Promise<void>;
  updateSetAction: (formData: FormData) => Promise<void>;
  addSetAction: (formData: FormData) => Promise<void>;
  removeSetAction: (formData: FormData) => Promise<void>;
};

const DAY_NAMES: Record<number, string> = {
  0: "Chủ nhật",
  1: "Thứ 2",
  2: "Thứ 3",
  3: "Thứ 4",
  4: "Thứ 5",
  5: "Thứ 6",
  6: "Thứ 7",
};

function formatNumber(value: number) {
  return Number.isInteger(value) ? String(value) : String(value).replace(".", ",");
}

function formatSet(set: TemplateSet | undefined) {
  if (!set) {
    return "Chưa có set";
  }

  const parts = [
    set.intensityPercent ? `${set.intensityPercent}%` : null,
    set.targetReps ? `${set.targetReps} reps` : null,
    set.targetWeightKg ? `${formatNumber(set.targetWeightKg)} kg` : null,
  ].filter(Boolean);

  return parts.length > 0 ? parts.join(" · ") : "Chưa có thông số";
}

function getExerciseSummary(exercise: TemplateExercise) {
  return `${exercise.catalogItem.muscleGroup || "Chưa phân nhóm"} · ${exercise.sets.length} set`;
}

export function TemplateDayCard({
  day,
  catalogItems,
  updateAction,
  addAction,
  moveExerciseAction,
  removeExerciseAction,
  replaceExerciseAction,
  updateSetAction,
  addSetAction,
  removeSetAction,
}: TemplateDayCardProps) {
  const [isEditingDay, setIsEditingDay] = useState(false);
  const [isAddingExercises, setIsAddingExercises] = useState(false);
  const [editingExerciseId, setEditingExerciseId] = useState<string | null>(null);
  const [replacingExerciseId, setReplacingExerciseId] = useState<string | null>(null);
  const hasExercises = day.exercises.length > 0;
  const setCount = day.exercises.reduce((sum, exercise) => sum + exercise.sets.length, 0);
  const dayName = DAY_NAMES[day.dayOfWeek] || "Ngày tập";

  return (
    <AppCard className="min-w-0 space-y-4 border-[#243041] bg-[#121A2B] p-4">
      <div className="space-y-4">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="text-[13px] font-black text-[#38BDF8]">{dayName}</p>
            <h2 className="mt-1 break-words text-[24px] font-black leading-tight text-[#F8FAFC]">
              {dayName} · {day.title}
            </h2>
            <p className="mt-2 text-[14px] font-semibold leading-6 text-[#94A3B8]">
              {day.isRestDay ? "Ngày nghỉ" : `${day.exercises.length} bài · ${setCount} set`}
            </p>
          </div>
          <span className={`shrink-0 rounded-full px-3 py-1.5 text-[12px] font-black ${day.isRestDay ? "bg-[#1E293B] text-[#CBD5E1]" : "bg-[#123522] text-[#BBF7D0]"}`}>
            {day.isRestDay ? "Đang nghỉ" : "Đang tập"}
          </span>
        </div>

        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
          <button
            type="button"
            onClick={() => setIsEditingDay((value) => !value)}
            className="min-h-[44px] rounded-[14px] border border-[#334155] bg-[#111827] px-3 py-2 text-[13px] font-black text-[#E2E8F0]"
          >
            Sửa tên ngày
          </button>
          <form action={updateAction}>
            <input type="hidden" name="templateDayId" value={day.id} />
            <input type="hidden" name="title" value={day.title} />
            {!day.isRestDay ? <input type="hidden" name="isRestDay" value="on" /> : null}
            <PendingButton
              className="min-h-[44px] w-full rounded-[14px] border border-[#334155] bg-[#111827] px-3 py-2 text-[13px] font-black text-[#E2E8F0]"
              pendingLabel="Đang đổi..."
            >
              {day.isRestDay ? "Đổi thành ngày tập" : "Đặt nghỉ"}
            </PendingButton>
          </form>
          <button
            type="button"
            onClick={() => setIsAddingExercises((value) => !value)}
            className="col-span-2 min-h-[44px] rounded-[14px] border border-[#0EA5E9]/40 bg-[#0C2537] px-3 py-2 text-[13px] font-black text-[#7DD3FC] sm:col-span-1"
          >
            + Thêm bài
          </button>
        </div>
      </div>

      {isEditingDay ? (
        <form action={updateAction} className="space-y-3 rounded-[18px] border border-[#243041] bg-[#0F172A] p-4">
          <input type="hidden" name="templateDayId" value={day.id} />
          {day.isRestDay ? <input type="hidden" name="isRestDay" value="on" /> : null}
          <label className="space-y-2">
            <span className="text-[13px] font-bold text-[#CBD5E1]">Tên ngày</span>
            <AppInput name="title" defaultValue={day.title} placeholder="Ví dụ Ngực và tay sau" className="border-[#314155] bg-[#111C2E]" />
          </label>
          <AppButton className="w-full bg-[#0EA5E9] text-[#082F49] hover:bg-[#38BDF8]" pendingLabel="Đang lưu...">
            Lưu tên ngày
          </AppButton>
        </form>
      ) : null}

      {day.isRestDay ? (
        <div className="rounded-[18px] border border-dashed border-[#334155] bg-[#0F172A] px-4 py-5">
          <h3 className="text-[17px] font-black text-[#F8FAFC]">Ngày này đang nghỉ</h3>
          <p className="mt-2 text-[14px] leading-6 text-[#94A3B8]">
            Nếu muốn tập trong ngày này, bấm đổi thành ngày tập rồi thêm bài.
          </p>
          {hasExercises ? (
            <p className="mt-3 rounded-[14px] border border-[#0EA5E9]/30 bg-[#0C2537] px-3 py-2 text-[13px] font-bold leading-5 text-[#7DD3FC]">
              Ngày này vẫn có {day.exercises.length} bài đã lưu. Các bài đang được giữ lại.
            </p>
          ) : null}
        </div>
      ) : null}

      {isAddingExercises && !day.isRestDay ? (
        <form action={addAction}>
          <input type="hidden" name="templateDayId" value={day.id} />
          <CatalogPickerPanel
            items={catalogItems}
            existingIds={day.exercises.map((exercise) => exercise.catalogItemId)}
            title={`Thêm bài vào ${dayName}`}
            description="Chọn một hoặc nhiều bài, sau đó bấm thêm vào ngày tập."
            submitLabel={`Thêm bài vào ${dayName}`}
            emptyLabel="Không còn bài phù hợp để thêm cho ngày này."
          />
        </form>
      ) : null}

      {!hasExercises ? (
        <div className="rounded-[18px] border border-dashed border-[#334155] bg-[#0F172A] px-4 py-5 text-[14px] leading-6 text-[#94A3B8]">
          {day.isRestDay ? "Ngày nghỉ này chưa có bài nào." : "Ngày tập này chưa có bài nào. Bấm thêm bài để bắt đầu."}
        </div>
      ) : (
        <div className="space-y-3">
          {day.exercises.map((exercise, exerciseIndex) => {
            const isEditingSets = editingExerciseId === exercise.id;
            const isReplacingExercise = replacingExerciseId === exercise.id;

            return (
              <article key={exercise.id} className="min-w-0 rounded-[18px] border border-[#243041] bg-[#0F172A] p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-[12px] font-black text-[#38BDF8]">Bài {exerciseIndex + 1}</p>
                    <h3 className="mt-1 break-words text-[18px] font-black leading-6 text-[#F8FAFC]">{exercise.catalogItem.name}</h3>
                    <p className="mt-2 text-[14px] font-semibold leading-6 text-[#CBD5E1]">{getExerciseSummary(exercise)}</p>
                    <p className="mt-1 text-[13px] font-bold leading-5 text-[#94A3B8]">{formatSet(exercise.sets[0])}</p>
                  </div>
                  <span className="shrink-0 rounded-full bg-[#0EA5E9]/12 px-3 py-1 text-[12px] font-black text-[#7DD3FC]">
                    #{exerciseIndex + 1}
                  </span>
                </div>

                <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-5">
                  <form action={moveExerciseAction} className="min-w-0">
                    <input type="hidden" name="templateExerciseId" value={exercise.id} />
                    <input type="hidden" name="direction" value="up" />
                    <PendingButton
                      className="min-h-[44px] w-full rounded-[13px] border border-[#334155] bg-[#111827] px-2 text-[13px] font-black text-[#E2E8F0]"
                      pendingLabel="Đang lên..."
                    >
                      Lên
                    </PendingButton>
                  </form>
                  <form action={moveExerciseAction} className="min-w-0">
                    <input type="hidden" name="templateExerciseId" value={exercise.id} />
                    <input type="hidden" name="direction" value="down" />
                    <PendingButton
                      className="min-h-[44px] w-full rounded-[13px] border border-[#334155] bg-[#111827] px-2 text-[13px] font-black text-[#E2E8F0]"
                      pendingLabel="Đang xuống..."
                    >
                      Xuống
                    </PendingButton>
                  </form>
                  <button
                    type="button"
                    onClick={() => {
                      setReplacingExerciseId(isReplacingExercise ? null : exercise.id);
                      setEditingExerciseId(null);
                      setIsAddingExercises(false);
                    }}
                    className="min-h-[44px] w-full min-w-0 rounded-[13px] border border-[#0EA5E9]/40 bg-[#0C2537] px-2 text-[13px] font-black text-[#7DD3FC]"
                  >
                    Thay thế
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setEditingExerciseId(isEditingSets ? null : exercise.id);
                      setReplacingExerciseId(null);
                    }}
                    className="min-h-[44px] w-full min-w-0 rounded-[13px] border border-[#334155] bg-[#111827] px-2 text-[13px] font-black text-[#E2E8F0]"
                  >
                    Sửa set
                  </button>
                  <form action={removeExerciseAction} className="min-w-0">
                    <input type="hidden" name="templateExerciseId" value={exercise.id} />
                    <PendingButton
                      className="min-h-[44px] w-full rounded-[13px] border border-[#7F1D1D] bg-[#3B0C0C] px-2 text-[13px] font-black text-[#FCA5A5]"
                      pendingLabel="Đang xóa..."
                    >
                      Xóa
                    </PendingButton>
                  </form>
                </div>

                {isReplacingExercise ? (
                  <form action={replaceExerciseAction} className="mt-4">
                    <input type="hidden" name="templateExerciseId" value={exercise.id} />
                    <CatalogPickerPanel
                      items={catalogItems}
                      existingIds={day.exercises.map((item) => item.catalogItemId)}
                      title={`Thay thế ${exercise.catalogItem.name}`}
                      description="Chọn 1 bài mới. Bài mới sẽ giữ đúng vị trí trong ngày tập này."
                      submitLabel="Thay bài"
                      selectionMode="replace"
                      pendingLabel="Đang thay..."
                      actionSummary="Thay bài hiện tại"
                      emptyLabel="Không còn bài phù hợp để thay cho ngày này."
                    />
                  </form>
                ) : null}

                {isEditingSets ? (
                  <div className="mt-4 space-y-3 rounded-[16px] border border-[#243041] bg-[#111827] p-3">
                    <div className="flex items-center justify-between gap-3">
                      <h4 className="text-[15px] font-black text-[#F8FAFC]">Sửa set</h4>
                      <form action={addSetAction}>
                        <input type="hidden" name="templateExerciseId" value={exercise.id} />
                        <PendingButton
                          className="min-h-[40px] rounded-[13px] border border-[#0EA5E9]/40 bg-[#0C2537] px-3 text-[12px] font-black text-[#7DD3FC]"
                          pendingLabel="Đang thêm..."
                        >
                          + Thêm set
                        </PendingButton>
                      </form>
                    </div>

                    {exercise.sets.map((set) => (
                      <div key={set.id} className="space-y-3 rounded-[15px] border border-[#334155] bg-[#0F172A] p-3">
                        <p className="text-[13px] font-black text-[#CBD5E1]">Set {set.setIndex + 1}</p>
                        <form action={updateSetAction} className="space-y-3">
                          <input type="hidden" name="templateExerciseId" value={exercise.id} />
                          <input type="hidden" name="templateSetId" value={set.id} />
                          <input type="hidden" name="setIndex" value={set.setIndex} />
                          <div className="grid grid-cols-2 gap-2">
                            <label className="space-y-1">
                              <span className="text-[12px] font-bold text-[#94A3B8]">Mức nặng (%)</span>
                              <AppInput name="intensityPercent" type="number" defaultValue={set.intensityPercent ?? ""} placeholder="70" inputMode="numeric" className="border-[#314155] bg-[#111C2E]" />
                            </label>
                            <label className="space-y-1">
                              <span className="text-[12px] font-bold text-[#94A3B8]">Số reps</span>
                              <AppInput name="targetReps" type="number" defaultValue={set.targetReps ?? ""} placeholder="10" inputMode="numeric" className="border-[#314155] bg-[#111C2E]" />
                            </label>
                          </div>
                          <label className="space-y-1">
                            <span className="text-[12px] font-bold text-[#94A3B8]">Tạ mục tiêu (kg)</span>
                            <AppInput name="targetWeightKg" type="number" step="0.5" defaultValue={set.targetWeightKg ?? ""} placeholder="40" inputMode="decimal" className="border-[#314155] bg-[#111C2E]" />
                          </label>
                          <AppButton className="w-full bg-[#0EA5E9] text-[#082F49] hover:bg-[#38BDF8]" pendingLabel="Đang lưu...">
                            Lưu set
                          </AppButton>
                        </form>
                        <form action={removeSetAction}>
                          <input type="hidden" name="templateSetId" value={set.id} />
                          <PendingButton
                            className="min-h-[40px] w-full rounded-[13px] border border-[#7F1D1D] bg-[#3B0C0C] px-3 text-[12px] font-black text-[#FCA5A5]"
                            pendingLabel="Đang xóa..."
                          >
                            Xóa set
                          </PendingButton>
                        </form>
                      </div>
                    ))}
                  </div>
                ) : null}
              </article>
            );
          })}
        </div>
      )}
    </AppCard>
  );
}
