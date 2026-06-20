import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { requireAdminUser } from "@/lib/admin";
import {
  addCatalogItemToTemplateDayAction,
  addWorkoutTemplateSetAction,
  deleteWorkoutTemplateAction,
  moveWorkoutTemplateExerciseAction,
  removeWorkoutTemplateExerciseAction,
  removeWorkoutTemplateSetAction,
  saveWorkoutTemplateAction,
  updateWorkoutTemplateDayAction,
  updateWorkoutTemplateSetAction,
} from "@/lib/admin-template-actions";
import { AppShell } from "@/components/app-shell";
import { AppButton, AppCard, AppInput, AppTextarea, PageHeader } from "@/components/ui";
import { TemplateDayCard } from "@/components/template-day-card";

export default async function AdminTemplatesPage({
  searchParams,
}: {
  searchParams?: Promise<{ error?: string }>;
}) {
  const params = await searchParams;
  await requireAdminUser();

  const [templates, catalogItems] = await Promise.all([
    prisma.workoutTemplate.findMany({
      orderBy: [{ isActive: "desc" }, { sortOrder: "asc" }, { name: "asc" }],
      include: {
        days: {
          orderBy: { dayOfWeek: "asc" },
          include: {
            exercises: {
              orderBy: { orderIndex: "asc" },
              include: {
                catalogItem: true,
                sets: { orderBy: { setIndex: "asc" } },
              },
            },
          },
        },
      },
    }),
    prisma.exerciseCatalogItem.findMany({
      where: { isActive: true },
      orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
    }),
  ]);

  return (
    <AppShell>
      <PageHeader
        title="Admin template lịch"
        description="Tạo các mẫu tập sẵn để user chọn một lần rồi áp vào lịch cá nhân."
        action={
          <Link href="/admin/exercises" className="shrink-0 rounded-[14px] border border-[#243041] bg-[#121A2B] px-4 py-3 text-[15px] font-semibold text-[#F8FAFC]">
            Metadata bài tập
          </Link>
        }
      />

      {params?.error ? (
        <p className="rounded-[14px] border border-[#7F1D1D] bg-[#3B0C0C] px-4 py-3 text-[13px] font-semibold text-[#FCA5A5]">
          Dữ liệu template chưa hợp lệ. Kiểm tra lại tên mẫu, cấu trúc ngày và thông số set.
        </p>
      ) : null}

      <AppCard className="space-y-4 border-[#243041] bg-[#121A2B]">
        <div>
          <h2 className="text-[18px] font-bold text-[#F8FAFC]">Tạo mẫu mới</h2>
          <p className="mt-1 text-[13px] leading-5 text-[#94A3B8]">Tạo khung trước, sau đó mở từng ngày và chọn nhiều bài cùng lúc.</p>
        </div>
        <form action={saveWorkoutTemplateAction} className="space-y-4">
          <AppInput name="name" placeholder="Tên mẫu, ví dụ 5 buổi/tuần" required className="border-[#314155] bg-[#111C2E]" />
          <AppTextarea name="description" rows={3} placeholder="Mô tả ngắn cho user" className="border-[#314155] bg-[#111C2E]" />
          <div className="grid grid-cols-2 gap-2">
            <AppInput name="sessionsPerWeek" type="number" placeholder="Số buổi" inputMode="numeric" className="border-[#314155] bg-[#111C2E]" />
            <AppInput name="sortOrder" type="number" placeholder="Thứ tự" inputMode="numeric" className="border-[#314155] bg-[#111C2E]" />
          </div>
          <label className="flex min-h-[52px] items-center gap-3 rounded-[16px] border border-[#243041] bg-[#0F172A] px-4 text-[14px] font-semibold text-[#F8FAFC]">
            <input type="checkbox" name="isActive" defaultChecked className="h-5 w-5 accent-[#0EA5E9]" />
            Hiện cho user chọn
          </label>
          <AppButton className="w-full bg-[#0EA5E9] text-[#082F49] hover:bg-[#38BDF8]">Tạo template</AppButton>
        </form>
      </AppCard>

      <section className="space-y-4">
        {templates.map((template) => (
          <AppCard key={template.id} className="space-y-4 border-[#243041] bg-[#121A2B]">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <h2 className="text-[20px] font-bold text-[#F8FAFC]">{template.name}</h2>
                <p className="mt-1 text-[13px] text-[#94A3B8]">
                  {template.sessionsPerWeek} buổi/tuần · {template.isActive ? "Đang hiện cho user" : "Đang ẩn"}
                </p>
              </div>
              <form action={deleteWorkoutTemplateAction}>
                <input type="hidden" name="templateId" value={template.id} />
                <button className="min-h-[40px] rounded-[14px] border border-[#7F1D1D] bg-[#3B0C0C] px-3 py-2 text-[13px] font-semibold text-[#FCA5A5]">
                  Xóa
                </button>
              </form>
            </div>

            <form action={saveWorkoutTemplateAction} className="space-y-4 rounded-[18px] border border-[#243041] bg-[#0F172A] p-4">
              <input type="hidden" name="templateId" value={template.id} />
              <AppInput name="name" defaultValue={template.name} placeholder="Tên mẫu" required className="border-[#314155] bg-[#111C2E]" />
              <AppTextarea name="description" rows={3} defaultValue={template.description ?? ""} placeholder="Mô tả ngắn" className="border-[#314155] bg-[#111C2E]" />
              <div className="grid grid-cols-2 gap-2">
                <AppInput name="sessionsPerWeek" type="number" defaultValue={template.sessionsPerWeek} placeholder="Số buổi" inputMode="numeric" className="border-[#314155] bg-[#111C2E]" />
                <AppInput name="sortOrder" type="number" defaultValue={template.sortOrder} placeholder="Thứ tự" inputMode="numeric" className="border-[#314155] bg-[#111C2E]" />
              </div>
              <label className="flex min-h-[52px] items-center gap-3 rounded-[16px] border border-[#243041] bg-[#111827] px-4 text-[14px] font-semibold text-[#F8FAFC]">
                <input type="checkbox" name="isActive" defaultChecked={template.isActive} className="h-5 w-5 accent-[#0EA5E9]" />
                Hiện cho user chọn
              </label>
              <AppButton className="w-full bg-[#0EA5E9] text-[#082F49] hover:bg-[#38BDF8]">Lưu template</AppButton>
            </form>

            <div className="space-y-4">
              {template.days.map((day) => (
                <TemplateDayCard
                  key={day.id}
                  day={day}
                  catalogItems={catalogItems}
                  updateAction={updateWorkoutTemplateDayAction}
                  addAction={addCatalogItemToTemplateDayAction}
                  exercisesNode={
                    <div className="space-y-3">
                      {day.exercises.map((exercise, exerciseIndex) => (
                        <AppCard key={exercise.id} className="space-y-3 border-[#243041] bg-[#0F172A]">
                          <div className="flex items-start justify-between gap-3">
                            <div className="min-w-0">
                              <div className="flex items-center gap-2">
                                <span className="rounded-full bg-[#0EA5E9]/12 px-2.5 py-1 text-[11px] font-semibold text-[#7DD3FC]">#{exerciseIndex + 1}</span>
                                <h3 className="truncate text-[18px] font-bold text-[#F8FAFC]">{exercise.catalogItem.name}</h3>
                              </div>
                              <p className="mt-2 text-[13px] text-[#94A3B8]">{exercise.catalogItem.muscleGroup || "Chưa phân nhóm cơ"}</p>
                            </div>
                            <form action={removeWorkoutTemplateExerciseAction}>
                              <input type="hidden" name="templateExerciseId" value={exercise.id} />
                              <button className="min-h-[40px] rounded-[14px] border border-[#7F1D1D] bg-[#3B0C0C] px-3 py-2 text-[13px] font-semibold text-[#FCA5A5]">
                                Xóa
                              </button>
                            </form>
                          </div>

                          <div className="grid grid-cols-2 gap-2">
                            <form action={moveWorkoutTemplateExerciseAction}>
                              <input type="hidden" name="templateExerciseId" value={exercise.id} />
                              <input type="hidden" name="direction" value="up" />
                              <button className="min-h-[44px] w-full rounded-[14px] border border-[#243041] bg-[#111827] px-3 py-2 text-[13px] font-semibold text-[#E2E8F0]">
                                Đưa lên
                              </button>
                            </form>
                            <form action={moveWorkoutTemplateExerciseAction}>
                              <input type="hidden" name="templateExerciseId" value={exercise.id} />
                              <input type="hidden" name="direction" value="down" />
                              <button className="min-h-[44px] w-full rounded-[14px] border border-[#243041] bg-[#111827] px-3 py-2 text-[13px] font-semibold text-[#E2E8F0]">
                                Đưa xuống
                              </button>
                            </form>
                          </div>

                          <div className="space-y-2">
                            {exercise.sets.map((set) => (
                              <div key={set.id} className="space-y-2 rounded-[16px] border border-[#243041] bg-[#111827] p-3">
                                <p className="text-[13px] font-semibold text-[#CBD5E1]">Set {set.setIndex + 1}</p>
                                <form action={updateWorkoutTemplateSetAction} className="space-y-3">
                                  <input type="hidden" name="templateExerciseId" value={exercise.id} />
                                  <input type="hidden" name="templateSetId" value={set.id} />
                                  <input type="hidden" name="setIndex" value={set.setIndex} />
                                  <div className="grid grid-cols-2 gap-2">
                                    <label className="space-y-1">
                                      <span className="text-[12px] font-medium text-[#94A3B8]">Mức nặng (%)</span>
                                      <AppInput name="intensityPercent" type="number" defaultValue={set.intensityPercent ?? ""} placeholder="Ví dụ 70" inputMode="numeric" className="border-[#314155] bg-[#0F172A]" />
                                    </label>
                                    <label className="space-y-1">
                                      <span className="text-[12px] font-medium text-[#94A3B8]">Số reps mục tiêu</span>
                                      <AppInput name="targetReps" type="number" defaultValue={set.targetReps ?? ""} placeholder="Ví dụ 12" inputMode="numeric" className="border-[#314155] bg-[#0F172A]" />
                                    </label>
                                  </div>
                                  <label className="space-y-1">
                                    <span className="text-[12px] font-medium text-[#94A3B8]">Tạ mục tiêu (kg)</span>
                                    <AppInput name="targetWeightKg" type="number" step="0.5" defaultValue={set.targetWeightKg ?? ""} placeholder="Ví dụ 40" inputMode="decimal" className="border-[#314155] bg-[#0F172A]" />
                                  </label>
                                  <AppButton className="w-full bg-[#0EA5E9] text-[#082F49] hover:bg-[#38BDF8]">Lưu set</AppButton>
                                </form>
                                <form action={removeWorkoutTemplateSetAction}>
                                  <input type="hidden" name="templateSetId" value={set.id} />
                                  <button className="min-h-[40px] w-full rounded-[14px] border border-[#7F1D1D] bg-[#3B0C0C] px-3 py-2 text-[13px] font-semibold text-[#FCA5A5]">
                                    Xóa set
                                  </button>
                                </form>
                              </div>
                            ))}
                            <form action={addWorkoutTemplateSetAction}>
                              <input type="hidden" name="templateExerciseId" value={exercise.id} />
                              <button className="min-h-[44px] w-full rounded-[14px] border border-[#0EA5E9]/40 bg-[#0C2537] px-3 py-2 text-[13px] font-semibold text-[#7DD3FC]">
                                Thêm set mới
                              </button>
                            </form>
                          </div>
                        </AppCard>
                      ))}
                    </div>
                  }
                />
              ))}
            </div>
          </AppCard>
        ))}
      </section>
    </AppShell>
  );
}
