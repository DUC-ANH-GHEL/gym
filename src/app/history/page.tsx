import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/auth";
import { getDateKeyInTimeZone, formatWorkoutDate } from "@/lib/date";
import { AppCard, PageHeader } from "@/components/ui";
import { AppShell } from "@/components/app-shell";

export default async function HistoryPage() {
  const user = await requireUser();
  const profile = user.gymProfile ?? (await prisma.gymProfile.findUnique({ where: { userId: user.id } }));
  const timezone = profile?.timezone || "Asia/Bangkok";
  const logs = await prisma.workoutLog.findMany({
    where: { userId: user.id },
    include: { exerciseLogs: { include: { setLogs: true } } },
    orderBy: { startedAt: "desc" },
  });

  return (
    <AppShell>
      <PageHeader title="Lịch sử" description="Xem lại các buổi tập đã lưu." />
      <div className="space-y-3">
        {logs.map((log) => {
          const totalSets = log.exerciseLogs.reduce((sum, exercise) => sum + exercise.setLogs.length, 0);
          const completedSets = log.exerciseLogs.reduce((sum, exercise) => sum + exercise.setLogs.filter((setLog) => setLog.isCompleted).length, 0);
          return (
            <Link key={log.id} href={`/history/${log.id}`}>
              <AppCard>
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <h3 className="text-[18px] font-bold text-[#F9FAFB]">{log.title || formatWorkoutDate(log.workoutDate, timezone)}</h3>
                    <p className="text-[13px] text-[#9CA3AF]">{getDateKeyInTimeZone(log.workoutDate, timezone)}</p>
                  </div>
                  <div className="text-right text-[13px] text-[#9CA3AF]">
                    <p>{completedSets}/{totalSets} set</p>
                    <p className={log.completedAt ? "text-[#22C55E]" : "text-[#F59E0B]"}>{log.completedAt ? "Đã xong" : "Đang dở"}</p>
                  </div>
                </div>
              </AppCard>
            </Link>
          );
        })}
      </div>
    </AppShell>
  );
}
