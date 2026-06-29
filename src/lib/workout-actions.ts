"use server";

import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { ensureTodayWorkoutLog, parseNullableNumber, recalculateExerciseCompletion, updateWorkoutLogCompletion } from "@/lib/workout";
import { requireUser } from "@/lib/auth";
import { getDayOfWeekInTimeZone } from "@/lib/date";

export async function startWorkoutExerciseAction(formData: FormData) {
  const user = await requireUser();
  const profile = user.gymProfile ?? (await prisma.gymProfile.findUnique({ where: { userId: user.id } }));
  const timezone = profile?.timezone || "Asia/Bangkok";
  const workoutDayExerciseId = String(formData.get("workoutDayExerciseId") || "");
  const todayDayOfWeek = getDayOfWeekInTimeZone(new Date(), timezone);

  const workoutDay = await prisma.workoutDay.findUnique({
    where: { userId_dayOfWeek: { userId: user.id, dayOfWeek: todayDayOfWeek } },
    include: {
      exercises: {
        orderBy: { orderIndex: "asc" },
        include: { catalogItem: true },
      },
    },
  });

  if (!workoutDay || workoutDay.isRestDay) {
    redirect("/today");
  }

  const selectedIndex = workoutDay.exercises.findIndex((exercise) => exercise.id === workoutDayExerciseId);
  const selectedExercise = selectedIndex >= 0 ? workoutDay.exercises[selectedIndex] : null;

  if (!selectedExercise) {
    redirect("/today");
  }

  const { log } = await ensureTodayWorkoutLog(prisma, user.id, timezone);
  const exerciseLog = log.exerciseLogs.find(
    (exercise) => exercise.catalogItemId === selectedExercise.catalogItemId && exercise.orderIndex === selectedIndex,
  );

  if (!exerciseLog) {
    redirect("/today");
  }

  if (!exerciseLog.startedAt) {
    await prisma.workoutExerciseLog.update({
      where: { id: exerciseLog.id },
      data: { startedAt: new Date() },
    });
  }

  redirect(`/today?exercise=${exerciseLog.id}`);
}

export async function saveWorkoutSetAction(formData: FormData) {
  const user = await requireUser();
  const setLogId = String(formData.get("setLogId") || "");
  const isCompleted = formData.get("isCompleted") === "on";

  const setLog = await prisma.workoutSetLog.findFirst({
    where: { id: setLogId, workoutExerciseLog: { workoutLog: { userId: user.id } } },
    include: { workoutExerciseLog: true },
  });

  if (!setLog) {
    return;
  }

  await prisma.workoutSetLog.update({
    where: { id: setLogId },
    data: {
      actualReps: parseNullableNumber(formData.get("actualReps")) ?? null,
      actualWeightKg: parseNullableNumber(formData.get("actualWeightKg")) ?? null,
      note: String(formData.get("note") || "").trim() || null,
      isCompleted,
      completedAt: isCompleted ? new Date() : null,
    },
  });

  await recalculateExerciseCompletion(prisma, setLog.workoutExerciseLogId);
  await updateWorkoutLogCompletion(prisma, setLog.workoutExerciseLog.workoutLogId);
  redirect(`/today?exercise=${setLog.workoutExerciseLogId}`);
}

export async function finishWorkoutAction(formData: FormData) {
  const user = await requireUser();
  const workoutLogId = String(formData.get("workoutLogId") || "");

  const workoutLog = await prisma.workoutLog.findFirst({
    where: { id: workoutLogId, userId: user.id },
  });

  if (!workoutLog) {
    redirect("/today");
  }

  await prisma.workoutLog.update({
    where: { id: workoutLogId },
    data: { completedAt: new Date() },
  });

  redirect("/history");
}
