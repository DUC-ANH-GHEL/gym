import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/auth";
import { dayLabel, getDayOfWeekInTimeZone, getDateKeyInTimeZone, todayLabel } from "@/lib/date";
import { AppCard, EmptyState, PageHeader } from "@/components/ui";
import { ExerciseCard } from "@/components/exercise-card";
import { AppShell } from "@/components/app-shell";
import { startTodayWorkoutAction } from "@/lib/workout-actions";

export default async function TodayPage() {
  const user = await requireUser();
  const profile = user.gymProfile ?? (await prisma.gymProfile.findUnique({ where: { userId: user.id } }));
  const timezone = profile?.timezone || "Asia/Bangkok";
  const today = new Date();
  const todayDayOfWeek = getDayOfWeekInTimeZone(today, timezone);
  const todayKey = getDateKeyInTimeZone(today, timezone);

  const workoutDay = await prisma.workoutDay.findUnique({
    where: { userId_dayOfWeek: { userId: user.id, dayOfWeek: todayDayOfWeek } },
    include: {
      exercises: {
        orderBy: { orderIndex: "asc" },
        include: {
          exercise: true,
          sets: { orderBy: { setIndex: "asc" } },
        },
      },
    },
  });

  const workoutLogs = await prisma.workoutLog.findMany({
    where: { userId: user.id },
    include: {
      exerciseLogs: { include: { setLogs: true } },
    },
    orderBy: { startedAt: "desc" },
  });

  const todayLog = workoutLogs.find((log) => getDateKeyInTimeZone(log.workoutDate, timezone) === todayKey) ?? null;
  const totalSets = workoutDay?.exercises.reduce((sum, item) => sum + item.sets.length, 0) ?? 0;
  const completedSets =
    todayLog?.exerciseLogs.reduce(
      (sum, exercise) => sum + exercise.setLogs.filter((setLog) => setLog.isCompleted).length,
      0,
    ) ?? 0;
  const displayName = profile?.displayName || user.name || "bạn";
  const isRestDay = Boolean(workoutDay?.isRestDay);

  return (
    <AppShell>
      <PageHeader title={`Xin chào, ${displayName}`} description={`Hôm nay: ${todayLabel(todayDayOfWeek, workoutDay?.title || dayLabel(todayDayOfWeek))}`} />

      <AppCard>
        <p className="text-[13px] font-semibold text-[#9CA3AF]">Tiến độ hôm nay</p>
        <p className="mt-1 text-[28px] font-bold text-[#F9FAFB]">{completedSets}/{totalSets} set</p>
        <p className="text-[13px] text-[#9CA3AF]">đã hoàn thành</p>
        {!isRestDay ? (
          <form action={startTodayWorkoutAction} className="mt-4">
            <button className="min-h-[52px] w-full rounded-[14px] bg-[#22C55E] px-4 py-3 text-[15px] font-bold text-white">
              {todayLog ? "Tiếp tục buổi tập" : "Bắt đầu buổi tập hôm nay"}
            </button>
          </form>
        ) : null}
      </AppCard>

      {!workoutDay ? (
        <EmptyState title="Chưa có lịch hôm nay" description="Thiết lập lịch tập để dashboard tự hiện bài đúng ngày." actionHref="/schedule" actionLabel="Thiết lập lịch tập" />
      ) : workoutDay.isRestDay ? (
        <EmptyState title="Hôm nay nghỉ, phục hồi thôi" description="Nghỉ ngơi và sẵn sàng cho buổi tập tiếp theo." />
      ) : workoutDay.exercises.length === 0 ? (
        <EmptyState title="Chưa có bài tập nào" description="Thêm bài từ thư viện vào lịch hôm nay." actionHref="/schedule" actionLabel="Thêm bài tập" />
      ) : (
        <div className="space-y-4">
          {workoutDay.exercises.map((entry) => (
            <ExerciseCard
              key={entry.id}
              href={todayLog ? `/workout/${todayLog.id}` : undefined}
              action={todayLog ? undefined : startTodayWorkoutAction}
              exercise={{
                id: entry.exercise.id,
                name: entry.exercise.name,
                muscleGroup: entry.exercise.muscleGroup,
                imageUrl: entry.exercise.imageUrl,
                currentWeightKg: entry.exercise.currentWeightKg,
                setsCount: entry.sets.length,
              }}
              ctaLabel={todayLog ? "Tiếp tục" : "Bắt đầu"}
            />
          ))}
        </div>
      )}
    </AppShell>
  );
}
