import type { PrismaClient } from "@prisma/client";
import { getDateKeyInTimeZone, getDayOfWeekInTimeZone } from "@/lib/date";
import { planTodayWorkoutLogSync } from "@/lib/workout-log-sync";

const DEFAULT_SET_TEMPLATE = [
  { intensityPercent: 70, targetReps: 12 },
  { intensityPercent: 80, targetReps: 10 },
  { intensityPercent: 90, targetReps: 8 },
  { intensityPercent: 90, targetReps: 8 },
] as const;

export function buildDefaultPlanSets(weight?: number | null) {
  return DEFAULT_SET_TEMPLATE.map((plan, index) => ({
    setIndex: index,
    intensityPercent: plan.intensityPercent,
    targetReps: plan.targetReps,
    targetWeightKg: weight ?? null,
  }));
}

export async function ensureTodayWorkoutLog(prisma: PrismaClient, userId: string, timeZone: string) {
  const profile = await prisma.gymProfile.findUnique({ where: { userId } });
  const actualTimeZone = profile?.timezone || timeZone;
  const todayKey = getDateKeyInTimeZone(new Date(), actualTimeZone);
  const todayDayOfWeek = getDayOfWeekInTimeZone(new Date(), actualTimeZone);
  const workoutDay = await prisma.workoutDay.findUnique({
    where: { userId_dayOfWeek: { userId, dayOfWeek: todayDayOfWeek } },
    include: {
      exercises: {
        orderBy: { orderIndex: "asc" },
        include: {
          catalogItem: true,
          sets: { orderBy: { setIndex: "asc" } },
        },
      },
    },
  });

  const existingLogs = await prisma.workoutLog.findMany({
    where: { userId },
    orderBy: { startedAt: "desc" },
    include: {
      exerciseLogs: {
        orderBy: { orderIndex: "asc" },
        include: { setLogs: { orderBy: { setIndex: "asc" } } },
      },
    },
  });

  const existingToday = existingLogs.find((log) => getDateKeyInTimeZone(log.workoutDate, actualTimeZone) === todayKey);
  if (existingToday) {
    if (!workoutDay || workoutDay.isRestDay) {
      return { log: existingToday, created: false, timezone: actualTimeZone };
    }

    const syncPlan = planTodayWorkoutLogSync(workoutDay.exercises, existingToday.exerciseLogs);

    if (syncPlan.createRows.length === 0 && syncPlan.updateRows.length === 0) {
      return { log: existingToday, created: false, timezone: actualTimeZone };
    }

    await prisma.$transaction([
      ...syncPlan.updateRows.map((row) => prisma.workoutExerciseLog.update({ where: { id: row.id }, data: { orderIndex: row.orderIndex } })),
      ...syncPlan.createRows.map((row) =>
        prisma.workoutExerciseLog.create({
          data: {
            workoutLogId: existingToday.id,
            ...row,
          },
        }),
      ),
    ]);

    const syncedLog = await prisma.workoutLog.findUnique({
      where: { id: existingToday.id },
      include: {
        exerciseLogs: {
          orderBy: { orderIndex: "asc" },
          include: { setLogs: { orderBy: { setIndex: "asc" } } },
        },
      },
    });

    return { log: syncedLog ?? existingToday, created: false, timezone: actualTimeZone };
  }

  if (!workoutDay || workoutDay.isRestDay) {
    throw new Error("TODAY_IS_REST_DAY");
  }

  const createdLog = await prisma.workoutLog.create({
    data: {
      userId,
      workoutDate: new Date(),
      dayOfWeek: todayDayOfWeek,
      title: workoutDay.title,
      exerciseLogs: {
        create: planTodayWorkoutLogSync(workoutDay.exercises, []).createRows,
      },
    },
    include: {
      exerciseLogs: {
        orderBy: { orderIndex: "asc" },
        include: { setLogs: { orderBy: { setIndex: "asc" } } },
      },
    },
  });

  return { log: createdLog, created: true, timezone: actualTimeZone };
}

export async function recalculateExerciseCompletion(prisma: PrismaClient, workoutExerciseLogId: string) {
  const setLogs = await prisma.workoutSetLog.findMany({
    where: { workoutExerciseLogId },
    select: { isCompleted: true },
  });

  const allCompleted = setLogs.length > 0 && setLogs.every((setLog) => setLog.isCompleted);
  await prisma.workoutExerciseLog.update({
    where: { id: workoutExerciseLogId },
    data: { isCompleted: allCompleted },
  });
}

export async function updateWorkoutLogCompletion(prisma: PrismaClient, workoutLogId: string) {
  const setLogs = await prisma.workoutSetLog.findMany({
    where: {
      workoutExerciseLog: {
        workoutLogId,
      },
    },
    select: { isCompleted: true },
  });

  const totalSets = setLogs.length;
  const completedSets = setLogs.filter((setLog) => setLog.isCompleted).length;

  await prisma.workoutLog.update({
    where: { id: workoutLogId },
    data: completedSets === totalSets ? { completedAt: new Date() } : { completedAt: null },
  });
}

export async function getWorkoutLogProgress(prisma: PrismaClient, workoutLogId: string) {
  const setLogs = await prisma.workoutSetLog.findMany({
    where: {
      workoutExerciseLog: {
        workoutLogId,
      },
    },
    select: { isCompleted: true },
  });

  const completed = setLogs.filter((setLog) => setLog.isCompleted).length;
  return { completed, total: setLogs.length };
}

export function parseNullableNumber(value: FormDataEntryValue | null) {
  if (value === null) {
    return undefined;
  }

  const trimmed = String(value).trim();
  if (trimmed === "") {
    return undefined;
  }

  const numberValue = Number(trimmed);
  return Number.isFinite(numberValue) ? numberValue : undefined;
}
