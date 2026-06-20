import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/auth";
import { AppButton, AppCard, AppInput, PageHeader } from "@/components/ui";
import { AppShell } from "@/components/app-shell";
import { ScheduleDayCard } from "@/components/schedule-day-card";
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
      <PageHeader title="Lịch tập" description="Áp mẫu sẵn rồi chỉnh từng buổi theo đúng nhịp tập của bạn." />

      <section className="space-y-3">
        <div>
          <h2 className="text-[18px] font-bold text-[#F8FAFC]">Mẫu lịch từ admin</h2>
          <p className="mt-1 text-[13px] leading-5 text-[#94A3B8]">
            Chọn một mẫu sẽ ghi đè toàn bộ lịch hiện tại.
            {profile?.appliedWorkoutTemplate ? ` Đang dùng: ${profile.appliedWorkoutTemplate.name}.` : ""}
          </p>
        </div>

        <div className="space-y-3">
          {templates.map((template) => {
            const activeDays = template.days.filter((day) => !day.isRestDay).length;
            const exerciseCount = template.days.reduce((sum, day) => sum + day.exercises.length, 0);

            return (
              <AppCard key={template.id} className="space-y-3 border-[#243041] bg-[#121A2B]">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <h3 className="text-[18px] font-bold text-[#F8FAFC]">{template.name}</h3>
                    <p className="mt-1 text-[13px] text-[#94A3B8]">
                      {template.sessionsPerWeek || activeDays} buổi/tuần · {exerciseCount} bài trong mẫu
                    </p>
                  </div>
                  {profile?.appliedWorkoutTemplateId === template.id ? (
                    <span className="rounded-full border border-[#0EA5E9]/30 bg-[#0EA5E9]/10 px-3 py-1 text-[12px] font-semibold text-[#7DD3FC]">
                      Đang áp dụng
                    </span>
                  ) : null}
                </div>

                {template.description ? <p className="text-[14px] leading-6 text-[#CBD5E1]">{template.description}</p> : null}

                <form action={applyWorkoutTemplateAction}>
                  <input type="hidden" name="templateId" value={template.id} />
                  <AppButton className="w-full bg-[#0EA5E9] text-[#082F49] hover:bg-[#38BDF8]">Áp mẫu này</AppButton>
                </form>
              </AppCard>
            );
          })}
        </div>
      </section>

      <section className="space-y-4">
        <div>
          <h2 className="text-[18px] font-bold text-[#F8FAFC]">Lịch của tôi</h2>
          <p className="mt-1 text-[13px] leading-5 text-[#94A3B8]">
            Bỏ tick ngày nghỉ là vùng chọn bài hiện ra ngay. Không cần lưu trước chỉ để thấy UI.
          </p>
        </div>

        {days.map((dayOfWeek) => {
          const day = workoutDays.find((item) => item.dayOfWeek === dayOfWeek);
          if (!day) {
            return null;
          }

          return (
            <ScheduleDayCard
              key={day.id}
              day={day}
              catalogItems={catalogItems}
              updateAction={updateWorkoutDayAction}
              addAction={addCatalogItemToDayAction}
              exercisesNode={
                <div className="space-y-3">
                  {day.exercises.map((entry, exerciseIndex) => (
                    <AppCard key={entry.id} className="space-y-3 border-[#243041] bg-[#0F172A]">
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="rounded-full bg-[#0EA5E9]/12 px-2.5 py-1 text-[11px] font-semibold text-[#7DD3FC]">#{exerciseIndex + 1}</span>
                            <p className="truncate text-[18px] font-bold text-[#F8FAFC]">{entry.catalogItem.name}</p>
                          </div>
                          <p className="mt-2 text-[13px] text-[#94A3B8]">{entry.catalogItem.muscleGroup || "Chưa phân nhóm cơ"}</p>
                        </div>
                        <form action={removeExerciseFromDayAction}>
                          <input type="hidden" name="workoutDayExerciseId" value={entry.id} />
                          <button className="min-h-[40px] rounded-[14px] border border-[#7F1D1D] bg-[#3B0C0C] px-3 py-2 text-[13px] font-semibold text-[#FCA5A5]">
                            Xóa
                          </button>
                        </form>
                      </div>

                      <div className="grid grid-cols-2 gap-2">
                        <form action={moveWorkoutDayExerciseAction}>
                          <input type="hidden" name="workoutDayExerciseId" value={entry.id} />
                          <input type="hidden" name="direction" value="up" />
                          <button className="min-h-[44px] w-full rounded-[14px] border border-[#243041] bg-[#111827] px-3 py-2 text-[13px] font-semibold text-[#E2E8F0]">
                            Đưa lên
                          </button>
                        </form>
                        <form action={moveWorkoutDayExerciseAction}>
                          <input type="hidden" name="workoutDayExerciseId" value={entry.id} />
                          <input type="hidden" name="direction" value="down" />
                          <button className="min-h-[44px] w-full rounded-[14px] border border-[#243041] bg-[#111827] px-3 py-2 text-[13px] font-semibold text-[#E2E8F0]">
                            Đưa xuống
                          </button>
                        </form>
                      </div>

                      <div className="space-y-2">
                        {entry.sets.map((set) => (
                          <div key={set.id} className="space-y-2 rounded-[16px] border border-[#243041] bg-[#111827] p-3">
                            <p className="text-[13px] font-semibold text-[#CBD5E1]">Set {set.setIndex + 1}</p>
                            <form action={updateWorkoutSetPlanAction} className="grid grid-cols-2 gap-2">
                              <input type="hidden" name="workoutDayExerciseId" value={entry.id} />
                              <input type="hidden" name="planSetId" value={set.id} />
                              <input type="hidden" name="setIndex" value={set.setIndex} />
                              <AppInput name="intensityPercent" type="number" defaultValue={set.intensityPercent ?? ""} placeholder="% nặng" inputMode="numeric" className="border-[#314155] bg-[#0F172A]" />
                              <AppInput name="targetReps" type="number" defaultValue={set.targetReps ?? ""} placeholder="Reps" inputMode="numeric" className="border-[#314155] bg-[#0F172A]" />
                              <AppInput name="targetWeightKg" type="number" step="0.5" defaultValue={set.targetWeightKg ?? ""} placeholder="Kg" inputMode="decimal" className="border-[#314155] bg-[#0F172A]" />
                              <AppButton className="w-full bg-[#0EA5E9] text-[#082F49] hover:bg-[#38BDF8]">Lưu set</AppButton>
                            </form>
                            <form action={removeWorkoutSetPlanAction}>
                              <input type="hidden" name="planSetId" value={set.id} />
                              <button className="min-h-[40px] w-full rounded-[14px] border border-[#7F1D1D] bg-[#3B0C0C] px-3 py-2 text-[13px] font-semibold text-[#FCA5A5]">
                                Xóa set
                              </button>
                            </form>
                          </div>
                        ))}
                        <form action={addWorkoutSetPlanAction}>
                          <input type="hidden" name="workoutDayExerciseId" value={entry.id} />
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
          );
        })}
      </section>
    </AppShell>
  );
}
