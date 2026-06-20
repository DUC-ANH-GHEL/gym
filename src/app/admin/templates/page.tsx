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
import { AppButton, AppCard, AppInput, AppSelect, AppTextarea, PageHeader } from "@/components/ui";
import { AppShell } from "@/components/app-shell";
import { ScheduleCard } from "@/components/schedule-card";

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
        description="Tạo mẫu tập sẵn để user chỉ việc chọn và áp vào lịch cá nhân."
        action={
          <Link href="/admin/exercises" className="shrink-0 rounded-[14px] bg-[#1F2937] px-4 py-3 text-[15px] font-bold text-[#F9FAFB]">
            Metadata bài tập
          </Link>
        }
      />

      {params?.error ? (
        <p className="rounded-[12px] border border-[#EF4444]/50 bg-[#EF4444]/10 px-3 py-2 text-[13px] font-semibold text-[#FCA5A5]">
          Dữ liệu template chưa hợp lệ. Kiểm tra tên, ngày tập và thông số set.
        </p>
      ) : null}

      <AppCard>
        <div className="mb-4">
          <h2 className="text-[18px] font-bold text-[#F9FAFB]">Tạo mẫu mới</h2>
          <p className="mt-1 text-[13px] text-[#9CA3AF]">Tạo trước khung template, rồi chỉnh từng ngày ngay bên dưới.</p>
        </div>
        <form action={saveWorkoutTemplateAction} className="space-y-4">
          <AppInput name="name" placeholder="Tên mẫu, ví dụ 5 buổi/tuần" required />
          <AppTextarea name="description" rows={3} placeholder="Mô tả ngắn cho user" />
          <div className="grid grid-cols-2 gap-2">
            <AppInput name="sessionsPerWeek" type="number" placeholder="Số buổi/tuần" inputMode="numeric" />
            <AppInput name="sortOrder" type="number" placeholder="Thứ tự" inputMode="numeric" />
          </div>
          <label className="flex min-h-[48px] items-center gap-3 rounded-[12px] bg-[#1F2937] px-3 text-[14px] font-bold text-[#F9FAFB]">
            <input type="checkbox" name="isActive" defaultChecked className="h-6 w-6 accent-[#22C55E]" />
            Hiện cho user chọn
          </label>
          <AppButton className="w-full">Tạo template</AppButton>
        </form>
      </AppCard>

      <section className="space-y-4">
        {templates.map((template) => (
          <AppCard key={template.id} className="space-y-4">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <h2 className="text-[20px] font-bold text-[#F9FAFB]">{template.name}</h2>
                <p className="mt-1 text-[13px] text-[#9CA3AF]">
                  {template.sessionsPerWeek} buổi/tuần · {template.isActive ? "Đang hiện" : "Đã ẩn"}
                </p>
              </div>
              <form action={deleteWorkoutTemplateAction}>
                <input type="hidden" name="templateId" value={template.id} />
                <button className="min-h-[40px] rounded-[12px] bg-[#EF4444] px-3 py-2 text-[13px] font-bold text-white">Xóa</button>
              </form>
            </div>

            <form action={saveWorkoutTemplateAction} className="space-y-4 rounded-[14px] border border-[#374151] bg-[#1F2937] p-3">
              <input type="hidden" name="templateId" value={template.id} />
              <AppInput name="name" defaultValue={template.name} placeholder="Tên mẫu" required />
              <AppTextarea name="description" rows={3} defaultValue={template.description ?? ""} placeholder="Mô tả ngắn" />
              <div className="grid grid-cols-2 gap-2">
                <AppInput name="sessionsPerWeek" type="number" defaultValue={template.sessionsPerWeek} placeholder="Số buổi/tuần" inputMode="numeric" />
                <AppInput name="sortOrder" type="number" defaultValue={template.sortOrder} placeholder="Thứ tự" inputMode="numeric" />
              </div>
              <label className="flex min-h-[48px] items-center gap-3 rounded-[12px] bg-[#0B0F14] px-3 text-[14px] font-bold text-[#F9FAFB]">
                <input type="checkbox" name="isActive" defaultChecked={template.isActive} className="h-6 w-6 accent-[#22C55E]" />
                Hiện cho user chọn
              </label>
              <AppButton className="w-full bg-[#38BDF8] text-[#0B0F14] hover:bg-[#0ea5e9]">Lưu template</AppButton>
            </form>

            <div className="space-y-4">
              {template.days.map((day) => (
                <ScheduleCard key={day.id} day={day}>
                  <form action={updateWorkoutTemplateDayAction} className="space-y-3 rounded-[14px] border border-[#374151] bg-[#1F2937] p-3">
                    <input type="hidden" name="templateDayId" value={day.id} />
                    <AppInput name="title" defaultValue={day.title} placeholder="Tên ngày" />
                    <label className="flex min-h-[48px] items-center gap-3 rounded-[12px] bg-[#0B0F14] px-3 text-[14px] font-bold text-[#F9FAFB]">
                      <input type="checkbox" name="isRestDay" defaultChecked={day.isRestDay} className="h-6 w-6 accent-[#22C55E]" />
                      Ngày nghỉ
                    </label>
                    <AppButton className="w-full bg-[#38BDF8] text-[#0B0F14] hover:bg-[#0ea5e9]">Lưu ngày</AppButton>
                  </form>

                  {!day.isRestDay ? (
                    <div className="space-y-3">
                      <form action={addCatalogItemToTemplateDayAction} className="space-y-2 rounded-[14px] border border-[#374151] bg-[#1F2937] p-3">
                        <input type="hidden" name="templateDayId" value={day.id} />
                        <AppSelect name="catalogItemId" defaultValue="">
                          <option value="">Thêm bài metadata vào ngày này</option>
                          {catalogItems.map((item) => (
                            <option key={item.id} value={item.id}>
                              {item.name}
                            </option>
                          ))}
                        </AppSelect>
                        <AppButton className="w-full">Thêm bài</AppButton>
                      </form>

                      {day.exercises.map((exercise) => (
                        <AppCard key={exercise.id} className="space-y-3 bg-[#111827]">
                          <div className="flex items-start justify-between gap-3">
                            <div className="min-w-0">
                              <h3 className="truncate text-[18px] font-bold text-[#F9FAFB]">{exercise.catalogItem.name}</h3>
                              <p className="text-[13px] text-[#9CA3AF]">{exercise.catalogItem.muscleGroup || "Chưa có nhóm cơ"}</p>
                            </div>
                            <form action={removeWorkoutTemplateExerciseAction}>
                              <input type="hidden" name="templateExerciseId" value={exercise.id} />
                              <button className="min-h-[40px] rounded-[12px] bg-[#EF4444] px-3 py-2 text-[13px] font-bold text-white">Xóa</button>
                            </form>
                          </div>

                          <div className="grid grid-cols-2 gap-2">
                            <form action={moveWorkoutTemplateExerciseAction}>
                              <input type="hidden" name="templateExerciseId" value={exercise.id} />
                              <input type="hidden" name="direction" value="up" />
                              <button className="min-h-[44px] w-full rounded-[12px] bg-[#1F2937] px-3 py-2 text-[13px] font-bold text-[#F9FAFB]">Lên</button>
                            </form>
                            <form action={moveWorkoutTemplateExerciseAction}>
                              <input type="hidden" name="templateExerciseId" value={exercise.id} />
                              <input type="hidden" name="direction" value="down" />
                              <button className="min-h-[44px] w-full rounded-[12px] bg-[#1F2937] px-3 py-2 text-[13px] font-bold text-[#F9FAFB]">Xuống</button>
                            </form>
                          </div>

                          <div className="space-y-2">
                            {exercise.sets.map((set) => (
                              <div key={set.id} className="space-y-2 rounded-[14px] border border-[#374151] bg-[#1F2937] p-3">
                                <form action={updateWorkoutTemplateSetAction} className="grid grid-cols-2 gap-2">
                                  <input type="hidden" name="templateExerciseId" value={exercise.id} />
                                  <input type="hidden" name="templateSetId" value={set.id} />
                                  <input type="hidden" name="setIndex" value={set.setIndex} />
                                  <AppInput name="intensityPercent" type="number" defaultValue={set.intensityPercent ?? ""} placeholder="%" inputMode="numeric" />
                                  <AppInput name="targetReps" type="number" defaultValue={set.targetReps ?? ""} placeholder="Reps" inputMode="numeric" />
                                  <AppInput name="targetWeightKg" type="number" step="0.5" defaultValue={set.targetWeightKg ?? ""} placeholder="Kg" inputMode="decimal" />
                                  <AppButton className="w-full bg-[#38BDF8] text-[#0B0F14] hover:bg-[#0ea5e9]">
                                    Lưu set {set.setIndex + 1}
                                  </AppButton>
                                </form>
                                <form action={removeWorkoutTemplateSetAction}>
                                  <input type="hidden" name="templateSetId" value={set.id} />
                                  <button className="min-h-[40px] w-full rounded-[12px] border border-[#EF4444]/50 px-3 py-2 text-[13px] font-bold text-[#FCA5A5]">
                                    Xóa set
                                  </button>
                                </form>
                              </div>
                            ))}
                            <form action={addWorkoutTemplateSetAction}>
                              <input type="hidden" name="templateExerciseId" value={exercise.id} />
                              <button className="min-h-[44px] w-full rounded-[12px] border border-[#38BDF8]/60 px-3 py-2 text-[13px] font-bold text-[#38BDF8]">
                                Thêm set
                              </button>
                            </form>
                          </div>
                        </AppCard>
                      ))}
                    </div>
                  ) : null}
                </ScheduleCard>
              ))}
            </div>
          </AppCard>
        ))}
      </section>
    </AppShell>
  );
}
