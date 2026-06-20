"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { requireAdminUser } from "@/lib/admin";
import { buildDefaultPlanSets } from "@/lib/workout";
import { workoutDaySchema, workoutSetSchema, workoutTemplateSchema } from "@/lib/validators";

const DAY_CONFIG = [
  { dayOfWeek: 1, title: "Thứ 2" },
  { dayOfWeek: 2, title: "Thứ 3" },
  { dayOfWeek: 3, title: "Thứ 4" },
  { dayOfWeek: 4, title: "Thứ 5" },
  { dayOfWeek: 5, title: "Thứ 6" },
  { dayOfWeek: 6, title: "Thứ 7" },
  { dayOfWeek: 0, title: "Chủ nhật" },
] as const;

function countSessionsFromDays(days: { isRestDay: boolean }[]) {
  return days.filter((day) => !day.isRestDay).length;
}

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

export async function saveWorkoutTemplateAction(formData: FormData): Promise<void> {
  await requireAdminUser();
  const templateId = String(formData.get("templateId") || "");
  const parsed = workoutTemplateSchema.safeParse({
    id: templateId || undefined,
    name: formData.get("name"),
    description: formData.get("description"),
    sessionsPerWeek: formData.get("sessionsPerWeek"),
    sortOrder: formData.get("sortOrder"),
    isActive: formData.get("isActive") === "on",
  });

  if (!parsed.success) {
    redirect("/admin/templates?error=invalid");
  }

  if (templateId) {
    const existingDays = await prisma.workoutTemplateDay.findMany({
      where: { workoutTemplateId: templateId },
      select: { isRestDay: true },
    });

    await prisma.workoutTemplate.update({
      where: { id: templateId },
      data: {
        name: parsed.data.name,
        description: parsed.data.description || null,
        sessionsPerWeek: parsed.data.sessionsPerWeek ?? countSessionsFromDays(existingDays),
        sortOrder: parsed.data.sortOrder ?? 0,
        isActive: parsed.data.isActive ?? true,
      },
    });
  } else {
    await prisma.workoutTemplate.create({
      data: {
        name: parsed.data.name,
        description: parsed.data.description || null,
        sessionsPerWeek: parsed.data.sessionsPerWeek ?? 0,
        sortOrder: parsed.data.sortOrder ?? 0,
        isActive: parsed.data.isActive ?? true,
        days: {
          create: DAY_CONFIG.map((day) => ({
            dayOfWeek: day.dayOfWeek,
            title: day.title,
            isRestDay: true,
          })),
        },
      },
    });
  }

  revalidatePath("/admin/templates");
}

export async function deleteWorkoutTemplateAction(formData: FormData): Promise<void> {
  await requireAdminUser();
  const templateId = String(formData.get("templateId") || "");
  if (!templateId) {
    redirect("/admin/templates?error=invalid");
  }

  await prisma.workoutTemplate.deleteMany({ where: { id: templateId } });
  revalidatePath("/admin/templates");
}

export async function updateWorkoutTemplateDayAction(formData: FormData): Promise<void> {
  await requireAdminUser();
  const templateDayId = String(formData.get("templateDayId") || "");
  const parsed = workoutDaySchema.safeParse({
    title: formData.get("title"),
    isRestDay: formData.get("isRestDay") === "on",
  });

  if (!parsed.success || !templateDayId) {
    redirect("/admin/templates?error=invalid");
  }

  const templateDay = await prisma.workoutTemplateDay.findUnique({
    where: { id: templateDayId },
    select: { workoutTemplateId: true },
  });

  if (!templateDay) {
    redirect("/admin/templates?error=invalid");
  }

  await prisma.workoutTemplateDay.update({
    where: { id: templateDayId },
    data: {
      title: parsed.data.title,
      isRestDay: parsed.data.isRestDay,
    },
  });

  const allDays = await prisma.workoutTemplateDay.findMany({
    where: { workoutTemplateId: templateDay.workoutTemplateId },
    select: { isRestDay: true },
  });

  await prisma.workoutTemplate.update({
    where: { id: templateDay.workoutTemplateId },
    data: { sessionsPerWeek: countSessionsFromDays(allDays) },
  });

  revalidatePath("/admin/templates");
}

export async function addCatalogItemToTemplateDayAction(formData: FormData): Promise<void> {
  await requireAdminUser();
  const templateDayId = String(formData.get("templateDayId") || "");
  const catalogItemIds = getSelectedCatalogItemIds(formData);

  if (catalogItemIds.length === 0) {
    return;
  }

  const templateDay = await prisma.workoutTemplateDay.findUnique({
    where: { id: templateDayId },
    include: { exercises: { orderBy: { orderIndex: "asc" } } },
  });

  if (!templateDay) {
    redirect("/admin/templates?error=invalid");
  }

  const existingIds = new Set(templateDay.exercises.map((exercise) => exercise.catalogItemId));
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
      await tx.workoutTemplateExercise.create({
        data: {
          workoutTemplateDayId: templateDay.id,
          catalogItemId: catalogItem.id,
          orderIndex: templateDay.exercises.length + index,
          sets: {
            create: buildDefaultPlanSets(catalogItem.defaultWeightKg ?? null),
          },
        },
      });
    }
  });

  revalidatePath("/admin/templates");
}

export async function moveWorkoutTemplateExerciseAction(formData: FormData): Promise<void> {
  await requireAdminUser();
  const templateExerciseId = String(formData.get("templateExerciseId") || "");
  const direction = String(formData.get("direction") || "");

  const current = await prisma.workoutTemplateExercise.findUnique({
    where: { id: templateExerciseId },
  });

  if (!current) {
    return;
  }

  const sibling = await prisma.workoutTemplateExercise.findFirst({
    where: {
      workoutTemplateDayId: current.workoutTemplateDayId,
      orderIndex: direction === "up" ? current.orderIndex - 1 : current.orderIndex + 1,
    },
  });

  if (!sibling) {
    return;
  }

  await prisma.$transaction([
    prisma.workoutTemplateExercise.update({ where: { id: current.id }, data: { orderIndex: sibling.orderIndex } }),
    prisma.workoutTemplateExercise.update({ where: { id: sibling.id }, data: { orderIndex: current.orderIndex } }),
  ]);

  revalidatePath("/admin/templates");
}

export async function removeWorkoutTemplateExerciseAction(formData: FormData): Promise<void> {
  await requireAdminUser();
  const templateExerciseId = String(formData.get("templateExerciseId") || "");

  const templateExercise = await prisma.workoutTemplateExercise.findUnique({
    where: { id: templateExerciseId },
  });

  if (!templateExercise) {
    return;
  }

  await prisma.workoutTemplateExercise.delete({ where: { id: templateExerciseId } });
  revalidatePath("/admin/templates");
}

export async function updateWorkoutTemplateSetAction(formData: FormData): Promise<void> {
  await requireAdminUser();
  const templateExerciseId = String(formData.get("templateExerciseId") || "");
  const parsed = workoutSetSchema.safeParse({
    setIndex: formData.get("setIndex"),
    intensityPercent: formData.get("intensityPercent"),
    targetReps: formData.get("targetReps"),
    targetWeightKg: formData.get("targetWeightKg"),
  });

  if (!parsed.success) {
    return;
  }

  const templateExercise = await prisma.workoutTemplateExercise.findUnique({
    where: { id: templateExerciseId },
  });

  if (!templateExercise) {
    return;
  }

  const templateSetId = String(formData.get("templateSetId") || "");

  if (templateSetId) {
    const existingSet = await prisma.workoutTemplateSet.findFirst({
      where: { id: templateSetId, workoutTemplateExerciseId: templateExercise.id },
    });

    if (!existingSet) {
      return;
    }

    await prisma.workoutTemplateSet.update({
      where: { id: existingSet.id },
      data: {
        intensityPercent: parsed.data.intensityPercent ?? null,
        targetReps: parsed.data.targetReps ?? null,
        targetWeightKg: parsed.data.targetWeightKg ?? null,
      },
    });
  } else {
    await prisma.workoutTemplateSet.create({
      data: {
        workoutTemplateExerciseId: templateExercise.id,
        setIndex: parsed.data.setIndex,
        intensityPercent: parsed.data.intensityPercent ?? null,
        targetReps: parsed.data.targetReps ?? null,
        targetWeightKg: parsed.data.targetWeightKg ?? null,
      },
    });
  }

  revalidatePath("/admin/templates");
}

export async function addWorkoutTemplateSetAction(formData: FormData): Promise<void> {
  await requireAdminUser();
  const templateExerciseId = String(formData.get("templateExerciseId") || "");

  const templateExercise = await prisma.workoutTemplateExercise.findUnique({
    where: { id: templateExerciseId },
    include: {
      catalogItem: true,
      sets: { orderBy: { setIndex: "asc" } },
    },
  });

  if (!templateExercise) {
    return;
  }

  await prisma.workoutTemplateSet.create({
    data: {
      workoutTemplateExerciseId: templateExercise.id,
      setIndex: templateExercise.sets.length,
      intensityPercent: 90,
      targetReps: 8,
      targetWeightKg: templateExercise.catalogItem.defaultWeightKg ?? null,
    },
  });

  revalidatePath("/admin/templates");
}

export async function removeWorkoutTemplateSetAction(formData: FormData): Promise<void> {
  await requireAdminUser();
  const templateSetId = String(formData.get("templateSetId") || "");

  const templateSet = await prisma.workoutTemplateSet.findUnique({
    where: { id: templateSetId },
  });

  if (!templateSet) {
    return;
  }

  await prisma.workoutTemplateSet.delete({ where: { id: templateSet.id } });

  const remainingSets = await prisma.workoutTemplateSet.findMany({
    where: { workoutTemplateExerciseId: templateSet.workoutTemplateExerciseId },
    orderBy: { setIndex: "asc" },
  });

  if (remainingSets.length > 0) {
    await prisma.$transaction(
      remainingSets.map((set, index) =>
        prisma.workoutTemplateSet.update({
          where: { id: set.id },
          data: { setIndex: index },
        }),
      ),
    );
  }

  revalidatePath("/admin/templates");
}
