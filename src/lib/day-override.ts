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

// Yesterday's override, if any, so the schedule can say "yesterday you already trained another weekday's plan".
export async function getYesterdayOverride(userId: string, now: Date, timeZone: string) {
  const yesterday = new Date(now.getTime() - 24 * 60 * 60 * 1000);
  const override = await prisma.workoutDayOverride.findUnique({
    where: { userId_dateKey: { userId, dateKey: getDateKeyInTimeZone(yesterday, timeZone) } },
    select: { sourceDayOfWeek: true },
  });

  if (!override) {
    return null;
  }

  const actualDayOfWeek = getDayOfWeekInTimeZone(yesterday, timeZone);

  return override.sourceDayOfWeek === actualDayOfWeek ? null : { actualDayOfWeek, sourceDayOfWeek: override.sourceDayOfWeek };
}
