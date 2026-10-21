"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/auth";
import { getDateKeyInTimeZone, getDayOfWeekInTimeZone, getWorkoutLogLookupWindow } from "@/lib/date";

// Today's log is built from the schedule of the chosen weekday. It can only be swapped while nothing is logged yet.
async function dropUntouchedTodayLog(userId: string, now: Date, timeZone: string) {
  const todayKey = getDateKeyInTimeZone(now, timeZone);
  const logs = await prisma.workoutLog.findMany({
    where: { userId, workoutDate: getWorkoutLogLookupWindow(now, timeZone) },
    select: {
      id: true,
      workoutDate: true,
      exerciseLogs: { select: { setLogs: { where: { isCompleted: true }, select: { id: true }, take: 1 } } },
    },
  });
  const todayLog = logs.find((log) => getDateKeyInTimeZone(log.workoutDate, timeZone) === todayKey);

  if (!todayLog) {
    return true;
  }

  if (todayLog.exerciseLogs.some((exercise) => exercise.setLogs.length > 0)) {
    return false;
  }

  await prisma.workoutLog.delete({ where: { id: todayLog.id } });
  return true;
}

function revalidateTrainingPages() {
  revalidatePath("/today");
  revalidatePath("/schedule");
}

export async function trainScheduleDayTodayAction(formData: FormData): Promise<void> {
  const user = await requireUser();
  const timeZone = user.gymProfile?.timezone || "Asia/Bangkok";
  const sourceDayOfWeek = Number(formData.get("dayOfWeek"));

  if (!Number.isInteger(sourceDayOfWeek) || sourceDayOfWeek < 0 || sourceDayOfWeek > 6) {
    redirect("/schedule");
  }

  const now = new Date();
  const dateKey = getDateKeyInTimeZone(now, timeZone);
  const actualDayOfWeek = getDayOfWeekInTimeZone(now, timeZone);
  const sourceDay = await prisma.workoutDay.findUnique({
    where: { userId_dayOfWeek: { userId: user.id, dayOfWeek: sourceDayOfWeek } },
    select: { isRestDay: true, _count: { select: { exercises: true } } },
  });

  if (!sourceDay || sourceDay.isRestDay || sourceDay._count.exercises === 0) {
    redirect(`/schedule?day=${sourceDayOfWeek}&error=empty`);
  }

  if (!(await dropUntouchedTodayLog(user.id, now, timeZone))) {
    redirect(`/schedule?day=${sourceDayOfWeek}&error=started`);
  }

  if (sourceDayOfWeek === actualDayOfWeek) {
    await prisma.workoutDayOverride.deleteMany({ where: { userId: user.id, dateKey } });
  } else {
    await prisma.workoutDayOverride.upsert({
      where: { userId_dateKey: { userId: user.id, dateKey } },
      create: { userId: user.id, dateKey, sourceDayOfWeek },
      update: { sourceDayOfWeek },
    });
  }

  revalidateTrainingPages();
  redirect("/today");
}

export async function resetTodayScheduleAction(): Promise<void> {
  const user = await requireUser();
  const timeZone = user.gymProfile?.timezone || "Asia/Bangkok";
  const now = new Date();
  const dateKey = getDateKeyInTimeZone(now, timeZone);

  if (!(await dropUntouchedTodayLog(user.id, now, timeZone))) {
    redirect("/schedule?error=started");
  }

  await prisma.workoutDayOverride.deleteMany({ where: { userId: user.id, dateKey } });

  revalidateTrainingPages();
  redirect("/schedule");
}
