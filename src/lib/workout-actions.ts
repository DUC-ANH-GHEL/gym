"use server";

import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { ensureTodayWorkoutLog, parseNullableNumber, recalculateExerciseCompletion, updateWorkoutLogCompletion } from "@/lib/workout";
import { requireUser } from "@/lib/auth";
import { getDayOfWeekInTimeZone } from "@/lib/date";
import { getRestReminderPlan } from "@/lib/workout-rest";

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

  const updatedExercise = await prisma.workoutExerciseLog.findUnique({
    where: { id: setLog.workoutExerciseLogId },
    select: {
      id: true,
      isCompleted: true,
      orderIndex: true,
      workoutLogId: true,
    },
  });

  const nextExercise = updatedExercise?.isCompleted
    ? await prisma.workoutExerciseLog.findFirst({
        where: {
          workoutLogId: updatedExercise.workoutLogId,
          orderIndex: { gt: updatedExercise.orderIndex },
          isCompleted: false,
        },
        orderBy: { orderIndex: "asc" },
        select: { exerciseName: true },
      })
    : null;

  const restPlan = getRestReminderPlan({
    setWasCompleted: isCompleted,
    exerciseIsCompleted: Boolean(updatedExercise?.isCompleted),
    nextExerciseName: nextExercise?.exerciseName ?? null,
  });

  if (restPlan && updatedExercise) {
    const dueAt = new Date(Date.now() + restPlan.seconds * 1000);
    const reminderUrl = restPlan.kind === "exercise" ? "/today" : `/today?exercise=${setLog.workoutExerciseLogId}`;

    await prisma.workoutRestReminder.create({
      data: {
        userId: user.id,
        workoutSetLogId: setLogId,
        workoutExerciseLogId: setLog.workoutExerciseLogId,
        kind: restPlan.kind,
        title: restPlan.title,
        body: restPlan.body,
        url: reminderUrl,
        dueAt,
      },
    });

    const params = new URLSearchParams({
      rest: String(restPlan.seconds),
      restKind: restPlan.kind,
      restTitle: restPlan.title,
      restBody: restPlan.body,
      restDueAt: String(dueAt.getTime()),
    });

    if (restPlan.kind === "set") {
      params.set("exercise", setLog.workoutExerciseLogId);
    }

    redirect(`/today?${params.toString()}`);
  }

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
