import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import {
  buildWorkoutTemplateScheduleRows,
  WORKOUT_DAY_CONFIG,
  type WorkoutTemplateForScheduleSync,
} from "@/lib/workout-template-sync-core";

const templateInclude = {
  days: {
    orderBy: { dayOfWeek: "asc" },
    include: {
      exercises: {
        orderBy: { orderIndex: "asc" },
        include: {
          catalogItem: true,
          sets: { orderBy: { setIndex: "asc" } },
        },
      },
    },
  },
} satisfies Prisma.WorkoutTemplateInclude;

export async function syncWorkoutTemplateToUserSchedule(
  tx: Prisma.TransactionClient,
  userId: string,
  template: WorkoutTemplateForScheduleSync,
  appliedAt = new Date(),
) {
  await tx.workoutDay.createMany({
    data: WORKOUT_DAY_CONFIG.map((day) => ({
      userId,
      dayOfWeek: day.dayOfWeek,
      title: day.title,
      isRestDay: true,
    })),
    skipDuplicates: true,
  });

  const workoutDays = await tx.workoutDay.findMany({
    where: { userId },
    orderBy: { dayOfWeek: "asc" },
    select: { id: true, dayOfWeek: true },
  });

  await tx.workoutPlanSet.deleteMany({
    where: { workoutDayExercise: { workoutDay: { userId } } },
  });

  await tx.workoutDayExercise.deleteMany({
    where: { workoutDay: { userId } },
  });

  const { dayUpserts, exerciseRows, setRows } = buildWorkoutTemplateScheduleRows({ workoutDays, template });

  for (const day of dayUpserts) {
    if (!day.id) {
      continue;
    }

    await tx.workoutDay.update({
      where: { id: day.id },
      data: {
        title: day.title,
        isRestDay: day.isRestDay,
      },
    });
  }

  if (exerciseRows.length > 0) {
    await tx.workoutDayExercise.createMany({ data: exerciseRows });
  }

  if (setRows.length > 0) {
    await tx.workoutPlanSet.createMany({ data: setRows });
  }

  await tx.gymProfile.upsert({
    where: { userId },
    update: {
      appliedWorkoutTemplateId: template.id,
      appliedWorkoutTemplateAt: appliedAt,
    },
    create: {
      userId,
      timezone: "Asia/Bangkok",
      appliedWorkoutTemplateId: template.id,
      appliedWorkoutTemplateAt: appliedAt,
    },
  });
}

export async function getWorkoutTemplateForScheduleSync(templateId: string, onlyActive = false) {
  return prisma.workoutTemplate.findFirst({
    where: { id: templateId, ...(onlyActive ? { isActive: true } : {}) },
    include: templateInclude,
  });
}

export async function syncUsersAppliedToWorkoutTemplate(templateId: string) {
  const [template, profiles] = await Promise.all([
    getWorkoutTemplateForScheduleSync(templateId),
    prisma.gymProfile.findMany({
      where: { appliedWorkoutTemplateId: templateId },
      select: { userId: true },
    }),
  ]);

  if (!template || profiles.length === 0) {
    return { syncedUsers: 0 };
  }

  const appliedAt = new Date();

  for (const profile of profiles) {
    await prisma.$transaction((tx) => syncWorkoutTemplateToUserSchedule(tx, profile.userId, template, appliedAt), { timeout: 30_000 });
  }

  return { syncedUsers: profiles.length };
}
