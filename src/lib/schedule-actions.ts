"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/auth";
import { workoutDaySchema, workoutSetSchema } from "@/lib/validators";
import { buildDefaultPlanSets } from "@/lib/workout";

export async function updateWorkoutDayAction(formData: FormData) {
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
}

export async function addExerciseToDayAction(formData: FormData) {
  const user = await requireUser();
  const dayOfWeek = Number(formData.get("dayOfWeek"));
  const exerciseId = String(formData.get("exerciseId") || "");

  const workoutDay = await prisma.workoutDay.findUnique({
    where: { userId_dayOfWeek: { userId: user.id, dayOfWeek } },
    include: { exercises: { orderBy: { orderIndex: "asc" } } },
  });

  if (!workoutDay) {
    redirect("/schedule");
  }

  const exercise = await prisma.exercise.findFirst({ where: { id: exerciseId, userId: user.id } });
  if (!exercise) {
    return;
  }

  const created = await prisma.workoutDayExercise.create({
    data: {
      workoutDayId: workoutDay.id,
      exerciseId: exercise.id,
      orderIndex: workoutDay.exercises.length,
      sets: {
        create: buildDefaultPlanSets(exercise.currentWeightKg ?? null),
      },
    },
  });

  void created;
  revalidatePath("/schedule");
}

export async function updateWorkoutSetPlanAction(formData: FormData) {
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
    await prisma.workoutPlanSet.update({
      where: { id: planSetId },
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

export async function addWorkoutSetPlanAction(formData: FormData) {
  const user = await requireUser();
  const workoutDayExerciseId = String(formData.get("workoutDayExerciseId") || "");

  const workoutDayExercise = await prisma.workoutDayExercise.findFirst({
    where: { id: workoutDayExerciseId, workoutDay: { userId: user.id } },
    include: {
      exercise: true,
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
      targetWeightKg: workoutDayExercise.exercise.currentWeightKg ?? null,
    },
  });

  revalidatePath("/schedule");
}

export async function removeWorkoutSetPlanAction(formData: FormData) {
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

export async function removeExerciseFromDayAction(formData: FormData) {
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
}

export async function moveWorkoutDayExerciseAction(formData: FormData) {
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
