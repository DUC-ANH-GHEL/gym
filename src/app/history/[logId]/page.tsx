import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/auth";
import { AppCard, PageHeader } from "@/components/ui";
import { AppShell } from "@/components/app-shell";

export default async function HistoryDetailPage({ params }: { params: Promise<{ logId: string }> }) {
  const { logId } = await params;
  const user = await requireUser();
  const workoutLog = await prisma.workoutLog.findFirst({
    where: { id: logId, userId: user.id },
    include: {
      exerciseLogs: {
        include: { setLogs: { orderBy: { setIndex: "asc" } } },
        orderBy: { orderIndex: "asc" },
      },
    },
  });

  if (!workoutLog) {
    notFound();
  }

  return (
    <AppShell>
      <PageHeader title={workoutLog.title || "Chi tiết lịch sử"} description="Xem lại buổi tập cũ." />
      <div className="space-y-4">
        {workoutLog.exerciseLogs.map((exercise) => (
          <AppCard key={exercise.id} className="space-y-3">
            <div>
              <h2 className="text-[18px] font-bold text-[#F9FAFB]">{exercise.exerciseName}</h2>
              <p className="text-[13px] text-[#9CA3AF]">{exercise.muscleGroup || ""}</p>
            </div>
            <div className="space-y-2">
              {exercise.setLogs.map((setLog) => (
                <div key={setLog.id} className="rounded-[14px] border border-[#374151] bg-[#1F2937] p-3 text-[15px] text-[#F9FAFB]">
                  Set {setLog.setIndex + 1}: {setLog.actualWeightKg ?? setLog.targetWeightKg ?? 0}kg · {setLog.actualReps ?? setLog.targetReps ?? 0} reps
                </div>
              ))}
            </div>
          </AppCard>
        ))}
      </div>
    </AppShell>
  );
}
