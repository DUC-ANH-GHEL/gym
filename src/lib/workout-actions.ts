"use server";

import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { ensureTodayWorkoutLog, parseNullableNumber, recalculateExerciseCompletion, updateWorkoutLogCompletion } from "@/lib/workout";
import { requireUser } from "@/lib/auth";
import { getDayOfWeekInTimeZone } from "@/lib/date";
import { getRestReminderPlan } from "@/lib/workout-rest";
import { ensureWorkoutReminderCronJob } from "@/lib/workout-cron-job-org";
import { getNextExerciseAfterSetSave, getNextSetToFill } from "@/lib/workout-today-flow";
import { clampWorkoutWeightKg } from "@/lib/workout-set-entry";

async function redirectIfRestIsActive(userId: string): Promise<void> {
  const reminder = await prisma.workoutRestReminder.findFirst({
    where: {
      userId,
      sentAt: null,
      dueAt: { gt: new Date() },
    },
    orderBy: { dueAt: "desc" },
    select: {
      dueAt: true,
      kind: true,
      title: true,
      body: true,
      url: true,
    },
  });

  if (!reminder) {
    return;
  }

  const params = new URLSearchParams({
    rest: String(Math.max(1, Math.ceil((reminder.dueAt.getTime() - Date.now()) / 1000))),
    restKind: reminder.kind,
    restTitle: reminder.title,
    restBody: reminder.body,
    restDueAt: String(reminder.dueAt.getTime()),
  });
  const targetUrl = reminder.url || "/today";
  const separator = targetUrl.includes("?") ? "&" : "?";

  redirect(`${targetUrl}${separator}${params.toString()}`);
}

export async function startWorkoutExerciseAction(formData: FormData) {
  const user = await requireUser();
  await redirectIfRestIsActive(user.id);
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
  await redirectIfRestIsActive(user.id);
  const setLogId = String(formData.get("setLogId") || "");
  const isCompleted = formData.get("isCompleted") === "on";

  const setLog = await prisma.workoutSetLog.findFirst({
    where: { id: setLogId, workoutExerciseLog: { workoutLog: { userId: user.id } } },
    include: { workoutExerciseLog: true },
  });

  if (!setLog) {
    return;
  }

  const actualWeightKg = parseNullableNumber(formData.get("actualWeightKg"));

  await prisma.workoutSetLog.update({
    where: { id: setLogId },
    data: {
      actualReps: parseNullableNumber(formData.get("actualReps")) ?? null,
      actualWeightKg: typeof actualWeightKg === "number" ? clampWorkoutWeightKg(actualWeightKg) : null,
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
      setLogs: {
        orderBy: { setIndex: "asc" },
        select: {
          id: true,
          setIndex: true,
          isCompleted: true,
        },
      },
    },
  });

  const workoutExercises = updatedExercise
    ? await prisma.workoutExerciseLog.findMany({
        where: { workoutLogId: updatedExercise.workoutLogId },
        orderBy: { orderIndex: "asc" },
        select: {
          id: true,
          exerciseName: true,
          orderIndex: true,
          isCompleted: true,
          startedAt: true,
        },
      })
    : [];
  const currentExerciseForFlow = workoutExercises.find((exercise) => exercise.id === updatedExercise?.id) ?? null;
  const nextExercise = currentExerciseForFlow ? getNextExerciseAfterSetSave(workoutExercises, currentExerciseForFlow) : null;
  const nextSet = updatedExercise ? getNextSetToFill(updatedExercise.setLogs) : null;

  if (nextExercise && !nextExercise.startedAt) {
    await prisma.workoutExerciseLog.update({
      where: { id: nextExercise.id },
      data: { startedAt: new Date() },
    });
  }

  const restPlan = getRestReminderPlan({
    setWasCompleted: isCompleted,
    exerciseIsCompleted: Boolean(updatedExercise?.isCompleted),
      nextExerciseName: updatedExercise?.isCompleted ? nextExercise?.exerciseName ?? null : null,
  });

  if (restPlan && updatedExercise) {
    const dueAt = new Date(Date.now() + restPlan.seconds * 1000);
    const targetExerciseId = updatedExercise?.isCompleted ? nextExercise?.id : setLog.workoutExerciseLogId;
    const reminderUrl = targetExerciseId ? `/today?exercise=${targetExerciseId}` : "/today";

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
    await ensureWorkoutReminderCronJob().catch(() => undefined);

    const params = new URLSearchParams({
      rest: String(restPlan.seconds),
      restKind: restPlan.kind,
      restTitle: restPlan.title,
      restBody: restPlan.body,
      restDueAt: String(dueAt.getTime()),
    });

    if (targetExerciseId) {
      params.set("exercise", targetExerciseId);
    }

    if (!updatedExercise?.isCompleted && nextSet) {
      params.set("set", nextSet.id);
    }

    redirect(`/today?${params.toString()}`);
  }

  const targetExerciseId = updatedExercise?.isCompleted ? nextExercise?.id : setLog.workoutExerciseLogId;
  const params = new URLSearchParams();

  if (targetExerciseId) {
    params.set("exercise", targetExerciseId);
  }

  if (!updatedExercise?.isCompleted && nextSet) {
    params.set("set", nextSet.id);
  }

  redirect(params.size > 0 ? `/today?${params.toString()}` : "/today");
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
