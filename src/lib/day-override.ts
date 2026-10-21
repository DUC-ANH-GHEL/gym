import { prisma } from "@/lib/prisma";
import { getDateKeyInTimeZone, getDayOfWeekInTimeZone } from "@/lib/date";

// Which weekday's schedule the user trains on a given date: the real weekday unless they picked another one.
export async function getEffectiveTrainingDay(userId: string, now: Date, timeZone: string) {
  const dateKey = getDateKeyInTimeZone(now, timeZone);
  const actualDayOfWeek = getDayOfWeekInTimeZone(now, timeZone);
  const override = await prisma.workoutDayOverride.findUnique({
    where: { userId_dateKey: { userId, dateKey } },
    select: { sourceDayOfWeek: true },
  });
  const dayOfWeek = override?.sourceDayOfWeek ?? actualDayOfWeek;

  return { dateKey, actualDayOfWeek, dayOfWeek, isOverride: dayOfWeek !== actualDayOfWeek };
}
