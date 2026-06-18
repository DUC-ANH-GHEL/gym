import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/auth";
import { AppButton, AppCard, AppInput, AppSelect, PageHeader } from "@/components/ui";
import { AppShell } from "@/components/app-shell";
import { ScheduleCard } from "@/components/schedule-card";
import {
  addExerciseToDayAction,
  addWorkoutSetPlanAction,
  moveWorkoutDayExerciseAction,
  removeExerciseFromDayAction,
  removeWorkoutSetPlanAction,
  updateWorkoutDayAction,
  updateWorkoutSetPlanAction,
} from "@/lib/schedule-actions";

const days = [1, 2, 3, 4, 5, 6, 0];

export default async function SchedulePage() {
  const user = await requireUser();
  const [workoutDays, exercises] = await Promise.all([
    prisma.workoutDay.findMany({
      where: { userId: user.id },
      orderBy: { dayOfWeek: "asc" },
      include: {
        exercises: {
          orderBy: { orderIndex: "asc" },
          include: {
            exercise: true,
            sets: { orderBy: { setIndex: "asc" } },
          },
        },
      },
    }),
    prisma.exercise.findMany({ where: { userId: user.id }, orderBy: { createdAt: "desc" } }),
  ]);

  return (
    <AppShell>
      <PageHeader title="Lịch tập" description="Thiết lập từng ngày trong tuần." />
      <div className="space-y-4">
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

              {!day.isRestDay ? (
                <div className="space-y-3">
                  <form action={addExerciseToDayAction} className="space-y-2 rounded-[14px] border border-[#374151] bg-[#1F2937] p-3">
                    <input type="hidden" name="dayOfWeek" value={day.dayOfWeek} />
                    <AppSelect name="exerciseId" defaultValue="">
                      <option value="">Thêm bài từ thư viện</option>
                      {exercises.map((exercise) => (
                        <option key={exercise.id} value={exercise.id}>
                          {exercise.name}
                        </option>
                      ))}
                    </AppSelect>
                    <AppButton className="w-full">Thêm bài</AppButton>
                  </form>

                  {day.exercises.map((entry) => (
                    <AppCard key={entry.id} className="space-y-3 bg-[#111827]">
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <h3 className="truncate text-[18px] font-bold text-[#F9FAFB]">{entry.exercise.name}</h3>
                          <p className="text-[13px] text-[#9CA3AF]">{entry.exercise.muscleGroup || "Chưa có nhóm cơ"}</p>
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
                              <button className="min-h-[40px] w-full rounded-[12px] border border-[#EF4444]/50 px-3 py-2 text-[13px] font-bold text-[#FCA5A5]">Xóa set</button>
                            </form>
                          </div>
                        ))}
                        <form action={addWorkoutSetPlanAction}>
                          <input type="hidden" name="workoutDayExerciseId" value={entry.id} />
                          <button className="min-h-[44px] w-full rounded-[12px] border border-[#38BDF8]/60 px-3 py-2 text-[13px] font-bold text-[#38BDF8]">Thêm set</button>
                        </form>
                      </div>
                    </AppCard>
                  ))}
                </div>
              ) : null}
            </ScheduleCard>
          );
        })}
      </div>
      <Link href="/exercises/new" className="fixed bottom-[calc(94px+env(safe-area-inset-bottom))] right-4 rounded-full bg-[#22C55E] px-4 py-3 text-[15px] font-bold text-white shadow-lg">
        + Bài tập
      </Link>
    </AppShell>
  );
}
