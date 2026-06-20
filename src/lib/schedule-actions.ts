"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/auth";
import { ensureDefaultWorkoutDays } from "@/lib/setup";
import { buildDefaultPlanSets } from "@/lib/workout";
import { workoutDaySchema, workoutSetSchema } from "@/lib/validators";

const DAY_CONFIG = [
  { dayOfWeek: 1, title: "Thứ 2" },
  { dayOfWeek: 2, title: "Thứ 3" },
  { dayOfWeek: 3, title: "Thứ 4" },
  { dayOfWeek: 4, title: "Thứ 5" },
  { dayOfWeek: 5, title: "Thứ 6" },
  { dayOfWeek: 6, title: "Thứ 7" },
  { dayOfWeek: 0, title: "Chủ nhật" },
] as const;

function getSelectedCatalogItemIds(formData: FormData) {
  return Array.from(
    new Set(
      formData
        .getAll("catalogItemIds")
        .map((value) => String(value))
        .map((value) => value.trim())
        .filter(Boolean),
    ),
  );
}

function isDefined<T>(value: T | undefined): value is T {
  return value !== undefined;
}

export async function applyWorkoutTemplateAction(formData: FormData): Promise<void> {
  const user = await requireUser();
  const templateId = String(formData.get("templateId") || "");

  const template = await prisma.workoutTemplate.findFirst({
    where: { id: templateId, isActive: true },
    include: {
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
    },
  });

  if (!template) {
    redirect("/schedule");
  }

  await ensureDefaultWorkoutDays(user.id);

  await prisma.$transaction(async (tx) => {
    const workoutDays = await tx.workoutDay.findMany({
      where: { userId: user.id },
      orderBy: { dayOfWeek: "asc" },
    });

    await tx.workoutPlanSet.deleteMany({
      where: { workoutDayExercise: { workoutDay: { userId: user.id } } },
    });

    await tx.workoutDayExercise.deleteMany({
      where: { workoutDay: { userId: user.id } },
    });

    for (const config of DAY_CONFIG) {
      const templateDay = template.days.find((day) => day.dayOfWeek === config.dayOfWeek);
      const workoutDay = workoutDays.find((day) => day.dayOfWeek === config.dayOfWeek);

      const resolvedDay =
        workoutDay ??
        (await tx.workoutDay.create({
          data: {
            userId: user.id,
            dayOfWeek: config.dayOfWeek,
            title: config.title,
            isRestDay: true,
          },
        }));

      await tx.workoutDay.update({
        where: { id: resolvedDay.id },
        data: {
          title: templateDay?.title || config.title,
          isRestDay: templateDay?.isRestDay ?? true,
        },
      });

      if (!templateDay || templateDay.isRestDay) {
        continue;
      }

      for (const [orderIndex, templateExercise] of templateDay.exercises.entries()) {
        await tx.workoutDayExercise.create({
          data: {
            workoutDayId: resolvedDay.id,
            catalogItemId: templateExercise.catalogItemId,
            orderIndex,
            note: templateExercise.note || null,
            sets: {
              create:
                templateExercise.sets.length > 0
                  ? templateExercise.sets.map((set) => ({
                      setIndex: set.setIndex,
                      intensityPercent: set.intensityPercent,
                      targetReps: set.targetReps,
                      targetWeightKg: set.targetWeightKg,
                    }))
                  : buildDefaultPlanSets(templateExercise.catalogItem.defaultWeightKg ?? null),
            },
          },
        });
      }
    }

    await tx.gymProfile.upsert({
      where: { userId: user.id },
      update: {
        appliedWorkoutTemplateId: template.id,
        appliedWorkoutTemplateAt: new Date(),
      },
      create: {
        userId: user.id,
        timezone: "Asia/Bangkok",
        appliedWorkoutTemplateId: template.id,
        appliedWorkoutTemplateAt: new Date(),
      },
    });
  });

  revalidatePath("/schedule");
  revalidatePath("/today");
}

export async function updateWorkoutDayAction(formData: FormData): Promise<void> {
  const user = await requireUser();
  const dayOfWeek = Number(formData.get("dayOfWeek"));
  const parsed = workoutDaySchema.safeParse({
    title: formData.get("title"),
    isRestDay: formData.get("isRestDay") === "on",
  });

  if (!parsed.success) {
    return;
  }

  await prisma.workoutDay.update({
    where: { userId_dayOfWeek: { userId: user.id, dayOfWeek } },
    data: {
      title: parsed.data.title,
      isRestDay: parsed.data.isRestDay,
    },
  });

  revalidatePath("/schedule");
  revalidatePath("/today");
}

export async function addCatalogItemToDayAction(formData: FormData): Promise<void> {
  const user = await requireUser();
  const dayOfWeek = Number(formData.get("dayOfWeek"));
  const catalogItemIds = getSelectedCatalogItemIds(formData);

  if (catalogItemIds.length === 0) {
    return;
  }

  const workoutDay = await prisma.workoutDay.findUnique({
    where: { userId_dayOfWeek: { userId: user.id, dayOfWeek } },
    include: { exercises: { orderBy: { orderIndex: "asc" } } },
  });

  if (!workoutDay) {
    redirect("/schedule");
  }

  const existingIds = new Set(workoutDay.exercises.map((exercise) => exercise.catalogItemId));
  const allowedIds = catalogItemIds.filter((id) => !existingIds.has(id));

  if (allowedIds.length === 0) {
    return;
  }

  const catalogItems = await prisma.exerciseCatalogItem.findMany({
    where: {
      id: { in: allowedIds },
      isActive: true,
    },
  });

  const catalogItemMap = new Map(catalogItems.map((item) => [item.id, item]));
  const orderedCatalogItems = allowedIds.map((id) => catalogItemMap.get(id)).filter(isDefined);

  if (orderedCatalogItems.length === 0) {
    return;
  }

  await prisma.$transaction(async (tx) => {
    for (const [index, catalogItem] of orderedCatalogItems.entries()) {
      await tx.workoutDayExercise.create({
        data: {
          workoutDayId: workoutDay.id,
          catalogItemId: catalogItem.id,
          orderIndex: workoutDay.exercises.length + index,
          sets: {
            create: buildDefaultPlanSets(catalogItem.defaultWeightKg ?? null),
          },
        },
      });
    }
  });

  revalidatePath("/schedule");
  revalidatePath("/today");
}

export async function updateWorkoutSetPlanAction(formData: FormData): Promise<void> {
  const user = await requireUser();
  const workoutDayExerciseId = String(formData.get("workoutDayExerciseId") || "");
  const parsed = workoutSetSchema.safeParse({
    setIndex: formData.get("setIndex"),
    intensityPercent: formData.get("intensityPercent"),
    targetReps: formData.get("targetReps"),
    targetWeightKg: formData.get("targetWeightKg"),
  });

  if (!parsed.success) {
    return;
  }

  const workoutDayExercise = await prisma.workoutDayExercise.findFirst({
    where: { id: workoutDayExerciseId, workoutDay: { userId: user.id } },
  });

  if (!workoutDayExercise) {
    return;
  }

  const planSetId = String(formData.get("planSetId") || "");

  if (planSetId) {
    const existingSet = await prisma.workoutPlanSet.findFirst({
      where: { id: planSetId, workoutDayExerciseId: workoutDayExercise.id },
    });

    if (!existingSet) {
      return;
    }

    await prisma.workoutPlanSet.update({
      where: { id: existingSet.id },
      data: {
        intensityPercent: parsed.data.intensityPercent ?? null,
        targetReps: parsed.data.targetReps ?? null,
        targetWeightKg: parsed.data.targetWeightKg ?? null,
      },
    });
  } else {
    await prisma.workoutPlanSet.create({
      data: {
        workoutDayExerciseId,
        setIndex: parsed.data.setIndex,
        intensityPercent: parsed.data.intensityPercent ?? null,
        targetReps: parsed.data.targetReps ?? null,
        targetWeightKg: parsed.data.targetWeightKg ?? null,
      },
    });
  }

  revalidatePath("/schedule");
}

export async function addWorkoutSetPlanAction(formData: FormData): Promise<void> {
  const user = await requireUser();
  const workoutDayExerciseId = String(formData.get("workoutDayExerciseId") || "");

  const workoutDayExercise = await prisma.workoutDayExercise.findFirst({
    where: { id: workoutDayExerciseId, workoutDay: { userId: user.id } },
    include: {
      catalogItem: true,
      sets: { orderBy: { setIndex: "asc" } },
    },
  });

  if (!workoutDayExercise) {
    return;
  }

  const nextSetIndex = workoutDayExercise.sets.length;
  await prisma.workoutPlanSet.create({
    data: {
      workoutDayExerciseId,
      setIndex: nextSetIndex,
      intensityPercent: 90,
      targetReps: 8,
      targetWeightKg: workoutDayExercise.catalogItem.defaultWeightKg ?? null,
    },
  });

  revalidatePath("/schedule");
}

export async function removeWorkoutSetPlanAction(formData: FormData): Promise<void> {
  const user = await requireUser();
  const planSetId = String(formData.get("planSetId") || "");

  const planSet = await prisma.workoutPlanSet.findFirst({
    where: { id: planSetId, workoutDayExercise: { workoutDay: { userId: user.id } } },
    include: { workoutDayExercise: true },
  });

  if (!planSet) {
    return;
  }

  await prisma.workoutPlanSet.delete({ where: { id: planSet.id } });

  const remainingSets = await prisma.workoutPlanSet.findMany({
    where: { workoutDayExerciseId: planSet.workoutDayExerciseId },
    orderBy: { setIndex: "asc" },
  });

  if (remainingSets.length > 0) {
    await prisma.$transaction(
      remainingSets.map((set, index) =>
        prisma.workoutPlanSet.update({
          where: { id: set.id },
          data: { setIndex: index },
        }),
      ),
    );
  }

  revalidatePath("/schedule");
}

export async function removeExerciseFromDayAction(formData: FormData): Promise<void> {
  const user = await requireUser();
  const workoutDayExerciseId = String(formData.get("workoutDayExerciseId") || "");

  const workoutDayExercise = await prisma.workoutDayExercise.findFirst({
    where: { id: workoutDayExerciseId, workoutDay: { userId: user.id } },
  });

  if (!workoutDayExercise) {
    return;
  }

  await prisma.workoutDayExercise.delete({ where: { id: workoutDayExerciseId } });
  revalidatePath("/schedule");
  revalidatePath("/today");
}

export async function moveWorkoutDayExerciseAction(formData: FormData): Promise<void> {
  const user = await requireUser();
  const workoutDayExerciseId = String(formData.get("workoutDayExerciseId") || "");
  const direction = String(formData.get("direction") || "");

  const current = await prisma.workoutDayExercise.findFirst({
    where: { id: workoutDayExerciseId, workoutDay: { userId: user.id } },
  });

  if (!current) {
    return;
  }

  const sibling = await prisma.workoutDayExercise.findFirst({
    where: {
      workoutDayId: current.workoutDayId,
      orderIndex: direction === "up" ? current.orderIndex - 1 : current.orderIndex + 1,
    },
  });

  if (!sibling) {
    return;
  }

  await prisma.$transaction([
    prisma.workoutDayExercise.update({ where: { id: current.id }, data: { orderIndex: sibling.orderIndex } }),
    prisma.workoutDayExercise.update({ where: { id: sibling.id }, data: { orderIndex: current.orderIndex } }),
  ]);

  revalidatePath("/schedule");
}
