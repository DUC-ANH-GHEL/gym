import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/auth";
import { AppButton, AppCard, AppInput, AppSelect, PageHeader } from "@/components/ui";
import { AppShell } from "@/components/app-shell";
import { ScheduleCard } from "@/components/schedule-card";
import {
  addCatalogItemToDayAction,
  addWorkoutSetPlanAction,
  applyWorkoutTemplateAction,
  moveWorkoutDayExerciseAction,
  removeExerciseFromDayAction,
  removeWorkoutSetPlanAction,
  updateWorkoutDayAction,
  updateWorkoutSetPlanAction,
} from "@/lib/schedule-actions";

const days = [1, 2, 3, 4, 5, 6, 0];

export default async function SchedulePage() {
  const user = await requireUser();
  const [workoutDays, catalogItems, templates, profile] = await Promise.all([
    prisma.workoutDay.findMany({
      where: { userId: user.id },
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
    }),
    prisma.exerciseCatalogItem.findMany({
      where: { isActive: true },
      orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
    }),
    prisma.workoutTemplate.findMany({
      where: { isActive: true },
      orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
      include: {
        days: {
          include: {
            exercises: true,
          },
        },
      },
    }),
    prisma.gymProfile.findUnique({
      where: { userId: user.id },
      include: { appliedWorkoutTemplate: true },
    }),
  ]);

  return (
    <AppShell>
      <PageHeader title="Lịch tập" description="Chọn mẫu có sẵn rồi chỉnh tiếp từng buổi theo ý bạn." />

      <section className="space-y-3">
        <div>
          <h2 className="text-[18px] font-bold text-[#F9FAFB]">Mẫu lịch từ admin</h2>
          <p className="mt-1 text-[13px] text-[#9CA3AF]">
            Chọn một mẫu sẽ ghi đè toàn bộ lịch hiện tại của bạn.
            {profile?.appliedWorkoutTemplate ? ` Đang dùng: ${profile.appliedWorkoutTemplate.name}.` : ""}
          </p>
        </div>
        <div className="space-y-3">
          {templates.map((template) => {
            const activeDays = template.days.filter((day) => !day.isRestDay).length;
            const exerciseCount = template.days.reduce((sum, day) => sum + day.exercises.length, 0);

            return (
              <AppCard key={template.id} className="space-y-3">
                <div>
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <h3 className="text-[18px] font-bold text-[#F9FAFB]">{template.name}</h3>
                      <p className="text-[13px] text-[#9CA3AF]">
                        {template.sessionsPerWeek || activeDays} buổi/tuần · {exerciseCount} bài trong mẫu
                      </p>
                    </div>
                    {profile?.appliedWorkoutTemplateId === template.id ? (
                      <span className="rounded-full bg-[#22C55E]/15 px-3 py-1 text-[12px] font-bold text-[#86EFAC]">
                        Đang áp dụng
                      </span>
                    ) : null}
                  </div>
                  {template.description ? (
                    <p className="mt-2 text-[14px] leading-5 text-[#D1D5DB]">{template.description}</p>
                  ) : null}
                </div>
                <form action={applyWorkoutTemplateAction}>
                  <input type="hidden" name="templateId" value={template.id} />
                  <AppButton className="w-full bg-[#38BDF8] text-[#0B0F14] hover:bg-[#0ea5e9]">Áp mẫu này</AppButton>
                </form>
              </AppCard>
            );
          })}
        </div>
      </section>

      <section className="space-y-4">
        <div>
          <h2 className="text-[18px] font-bold text-[#F9FAFB]">Lịch của tôi</h2>
          <p className="mt-1 text-[13px] text-[#9CA3AF]">Bạn có thể thêm bài trực tiếp vào từng ngày, kể cả ngày đang để nghỉ.</p>
        </div>

        {days.map((dayOfWeek) => {
          const day = workoutDays.find((item) => item.dayOfWeek === dayOfWeek);
          if (!day) {
            return null;
          }

          return (
            <ScheduleCard key={day.id} day={day}>
              <form action={updateWorkoutDayAction} className="space-y-3 rounded-[14px] border border-[#374151] bg-[#1F2937] p-3">
                <input type="hidden" name="dayOfWeek" value={day.dayOfWeek} />
                <AppInput name="title" defaultValue={day.title} placeholder="Tên ngày" />
                <label className="flex min-h-[48px] items-center gap-3 rounded-[12px] bg-[#0B0F14] px-3 text-[14px] font-bold text-[#F9FAFB]">
                  <input type="checkbox" name="isRestDay" defaultChecked={day.isRestDay} className="h-6 w-6 accent-[#22C55E]" />
                  Ngày nghỉ
                </label>
                <AppButton className="w-full bg-[#38BDF8] text-[#0B0F14] hover:bg-[#0ea5e9]">Lưu ngày</AppButton>
              </form>

              <div className="space-y-3">
                <form action={addCatalogItemToDayAction} className="space-y-2 rounded-[14px] border border-[#374151] bg-[#1F2937] p-3">
                  <input type="hidden" name="dayOfWeek" value={day.dayOfWeek} />
                  <AppSelect name="catalogItemId" defaultValue="">
                    <option value="">
                      {catalogItems.length > 0 ? "Chọn bài tập cho ngày này" : "Chưa có metadata bài tập"}
                    </option>
                    {catalogItems.map((item) => (
                      <option key={item.id} value={item.id}>
                        {item.name}
                      </option>
                    ))}
                  </AppSelect>
                  {day.isRestDay ? (
                    <p className="text-[12px] text-[#9CA3AF]">Thêm bài đầu tiên sẽ tự đổi ngày này thành ngày tập.</p>
                  ) : null}
                  {catalogItems.length === 0 ? (
                    <p className="text-[12px] text-[#FCA5A5]">Hiện chưa có metadata bài tập để chọn.</p>
                  ) : null}
                  <AppButton className="w-full" disabled={catalogItems.length === 0}>
                    Thêm bài
                  </AppButton>
                </form>

                {day.exercises.length === 0 ? (
                  <AppCard className="bg-[#111827]">
                    <p className="text-[14px] text-[#9CA3AF]">
                      {day.isRestDay
                        ? "Ngày này đang để nghỉ. Chọn bài ở trên nếu muốn chuyển nó thành buổi tập."
                        : "Ngày này chưa có bài nào. Chọn bài ở trên để thêm vào lịch."}
                    </p>
                  </AppCard>
                ) : null}

                {day.exercises.map((entry) => (
                  <AppCard key={entry.id} className="space-y-3 bg-[#111827]">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <h3 className="truncate text-[18px] font-bold text-[#F9FAFB]">{entry.catalogItem.name}</h3>
                        <p className="text-[13px] text-[#9CA3AF]">{entry.catalogItem.muscleGroup || "Chưa có nhóm cơ"}</p>
                      </div>
                      <form action={removeExerciseFromDayAction}>
                        <input type="hidden" name="workoutDayExerciseId" value={entry.id} />
                        <button className="min-h-[40px] rounded-[12px] bg-[#EF4444] px-3 py-2 text-[13px] font-bold text-white">Xóa</button>
                      </form>
                    </div>

                    <div className="grid grid-cols-2 gap-2">
                      <form action={moveWorkoutDayExerciseAction}>
                        <input type="hidden" name="workoutDayExerciseId" value={entry.id} />
                        <input type="hidden" name="direction" value="up" />
                        <button className="min-h-[44px] w-full rounded-[12px] bg-[#1F2937] px-3 py-2 text-[13px] font-bold text-[#F9FAFB]">Lên</button>
                      </form>
                      <form action={moveWorkoutDayExerciseAction}>
                        <input type="hidden" name="workoutDayExerciseId" value={entry.id} />
                        <input type="hidden" name="direction" value="down" />
                        <button className="min-h-[44px] w-full rounded-[12px] bg-[#1F2937] px-3 py-2 text-[13px] font-bold text-[#F9FAFB]">Xuống</button>
                      </form>
                    </div>

                    <div className="space-y-2">
                      {entry.sets.map((set) => (
                        <div key={set.id} className="space-y-2 rounded-[14px] border border-[#374151] bg-[#1F2937] p-3">
                          <form action={updateWorkoutSetPlanAction} className="grid grid-cols-2 gap-2">
                            <input type="hidden" name="workoutDayExerciseId" value={entry.id} />
                            <input type="hidden" name="planSetId" value={set.id} />
                            <input type="hidden" name="setIndex" value={set.setIndex} />
                            <AppInput name="intensityPercent" type="number" defaultValue={set.intensityPercent ?? ""} placeholder="%" inputMode="numeric" />
                            <AppInput name="targetReps" type="number" defaultValue={set.targetReps ?? ""} placeholder="Reps" inputMode="numeric" />
                            <AppInput name="targetWeightKg" type="number" step="0.5" defaultValue={set.targetWeightKg ?? ""} placeholder="Kg" inputMode="decimal" />
                            <AppButton className="w-full bg-[#38BDF8] text-[#0B0F14] hover:bg-[#0ea5e9]">Lưu set {set.setIndex + 1}</AppButton>
                          </form>
                          <form action={removeWorkoutSetPlanAction}>
                            <input type="hidden" name="planSetId" value={set.id} />
                            <button className="min-h-[40px] w-full rounded-[12px] border border-[#EF4444]/50 px-3 py-2 text-[13px] font-bold text-[#FCA5A5]">
                              Xóa set
                            </button>
                          </form>
                        </div>
                      ))}
                      <form action={addWorkoutSetPlanAction}>
                        <input type="hidden" name="workoutDayExerciseId" value={entry.id} />
                        <button className="min-h-[44px] w-full rounded-[12px] border border-[#38BDF8]/60 px-3 py-2 text-[13px] font-bold text-[#38BDF8]">
                          Thêm set
                        </button>
                      </form>
                    </div>
                  </AppCard>
                ))}
              </div>
            </ScheduleCard>
          );
        })}
      </section>
    </AppShell>
  );
}
