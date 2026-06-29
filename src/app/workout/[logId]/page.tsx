import Image from "next/image";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/auth";
import { AppButton, AppCard, PageHeader } from "@/components/ui";
import { AppShell } from "@/components/app-shell";
import { WorkoutProgressBar } from "@/components/workout-progress-bar";
import { WorkoutSetRow } from "@/components/workout-set-row";
import { finishWorkoutAction, saveWorkoutSetAction } from "@/lib/workout-actions";
import { getExerciseMedia } from "@/lib/exercise-media";

export default async function WorkoutPage({ params }: { params: Promise<{ logId: string }> }) {
  const { logId } = await params;
  const user = await requireUser();

  const workoutLog = await prisma.workoutLog.findFirst({
    where: { id: logId, userId: user.id },
    include: {
      exerciseLogs: {
        orderBy: { orderIndex: "asc" },
        include: {
          setLogs: { orderBy: { setIndex: "asc" } },
        },
      },
    },
  });

  if (!workoutLog) {
    notFound();
  }

  const totalSets = workoutLog.exerciseLogs.reduce((sum, exercise) => sum + exercise.setLogs.length, 0);
  const completedSets = workoutLog.exerciseLogs.reduce(
    (sum, exercise) => sum + exercise.setLogs.filter((setLog) => setLog.isCompleted).length,
    0,
  );

  return (
    <AppShell>
      <PageHeader title={workoutLog.title || "Buổi tập"} description="Tick set, nhập tạ, lưu nhanh." />
      <WorkoutProgressBar completed={completedSets} total={totalSets} />
      {workoutLog.exerciseLogs.map((exercise) => {
        const media = getExerciseMedia(exercise, "workout");

        return (
        <AppCard key={exercise.id} className="space-y-3">
          <div className="flex items-start gap-3">
            {!media.isPlaceholder ? (
              <Image
                src={media.src}
                alt={exercise.exerciseName}
                width={160}
                height={160}
                className="h-20 w-20 rounded-[14px] object-cover"
                unoptimized={media.kind === "animation"}
              />
            ) : (
              <div className="flex h-20 w-20 shrink-0 items-center justify-center rounded-[14px] bg-[#1F2937] text-[11px] text-[#9CA3AF]">
                Ảnh
              </div>
            )}
            <div className="min-w-0 flex-1">
              <h2 className="truncate text-[18px] font-bold text-[#F9FAFB]">{exercise.exerciseName}</h2>
              <p className="text-[13px] text-[#9CA3AF]">{exercise.muscleGroup || "Chưa có nhóm cơ"}</p>
              <p className="mt-1 text-[13px] font-semibold text-[#22C55E]">
                {exercise.isCompleted ? "Hoàn thành" : "Đang tập"}
              </p>
            </div>
          </div>
          <div className="space-y-3">
            {exercise.setLogs.map((setLog, index) => (
              <WorkoutSetRow key={setLog.id} setLog={setLog} displayIndex={index + 1} action={saveWorkoutSetAction} />
            ))}
          </div>
        </AppCard>
        );
      })}
      <form action={finishWorkoutAction}>
        <input type="hidden" name="workoutLogId" value={workoutLog.id} />
        <AppButton className="w-full">Hoàn thành buổi tập</AppButton>
      </form>
    </AppShell>
  );
}
