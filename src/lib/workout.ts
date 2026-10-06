import type { PrismaClient } from "@prisma/client";
import { getDateKeyInTimeZone, getDayOfWeekInTimeZone, getWorkoutLogLookupWindow } from "@/lib/date";
import { planTodayWorkoutLogSync } from "@/lib/workout-log-sync";

const DEFAULT_SET_TEMPLATE = [
  { intensityPercent: 70, targetReps: 12 },
  { intensityPercent: 80, targetReps: 10 },
  { intensityPercent: 90, targetReps: 8 },
  { intensityPercent: 90, targetReps: 8 },
] as const;

export type PlanSetOptions = { setCount?: number | null; targetReps?: number | null };

export function parsePlanSetOptions(formData: FormData): PlanSetOptions {
  const setCount = Math.floor(Number(formData.get("setCount")));
  const targetReps = Math.floor(Number(formData.get("targetReps")));

  return {
    setCount: Number.isFinite(setCount) && setCount >= 1 ? Math.min(setCount, 10) : null,
    targetReps: Number.isFinite(targetReps) && targetReps >= 1 ? Math.min(targetReps, 100) : null,
  };
}

export function buildDefaultPlanSets(weight?: number | null, options: PlanSetOptions = {}) {
  const setCount = options.setCount ?? DEFAULT_SET_TEMPLATE.length;

  return Array.from({ length: setCount }, (_, index) => {
    const plan = DEFAULT_SET_TEMPLATE[Math.min(index, DEFAULT_SET_TEMPLATE.length - 1)];

    return {
      setIndex: index,
      intensityPercent: plan.intensityPercent,
      targetReps: options.targetReps ?? plan.targetReps,
      targetWeightKg: weight ?? null,
    };
  });
}

type WorkoutDayForTodayLog = {
  id: string;
  title: string;
  isRestDay: boolean;
  exercises: Parameters<typeof planTodayWorkoutLogSync>[0];
};

type EnsureTodayWorkoutLogOptions = {
  now?: Date;
  workoutDay?: WorkoutDayForTodayLog | null;
};

export async function ensureTodayWorkoutLog(
  prisma: PrismaClient,
  userId: string,
  timeZone: string,
  { now = new Date(), workoutDay: suppliedWorkoutDay }: EnsureTodayWorkoutLogOptions = {},
) {
  const actualTimeZone = timeZone;
  const todayKey = getDateKeyInTimeZone(now, actualTimeZone);
  const todayDayOfWeek = getDayOfWeekInTimeZone(now, actualTimeZone);
  const workoutDay =
    suppliedWorkoutDay ??
    (await prisma.workoutDay.findUnique({
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
    }));

  const existingLogs = await prisma.workoutLog.findMany({
    where: { userId, workoutDate: getWorkoutLogLookupWindow(now, actualTimeZone) },
    orderBy: { startedAt: "desc" },
    select: {
      id: true,
      workoutDate: true,
      exerciseLogs: {
        orderBy: { orderIndex: "asc" },
        select: {
          id: true,
          catalogItemId: true,
          orderIndex: true,
          startedAt: true,
        },
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
      select: {
        id: true,
        workoutDate: true,
        exerciseLogs: {
          orderBy: { orderIndex: "asc" },
          select: {
            id: true,
            catalogItemId: true,
            orderIndex: true,
            startedAt: true,
          },
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
      workoutDate: now,
      dayOfWeek: todayDayOfWeek,
      title: workoutDay.title,
      exerciseLogs: {
        create: planTodayWorkoutLogSync(workoutDay.exercises, []).createRows,
      },
    },
    select: {
      id: true,
      workoutDate: true,
      exerciseLogs: {
        orderBy: { orderIndex: "asc" },
        select: {
          id: true,
          catalogItemId: true,
          orderIndex: true,
          startedAt: true,
        },
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
