"use server";

import { redirect } from "next/navigation";
import { after } from "next/server";
import { prisma } from "@/lib/prisma";
import { ensureTodayWorkoutLog, parseNullableNumber } from "@/lib/workout";
import { getSessionUserId, requireUser } from "@/lib/auth";
import { getDayOfWeekInTimeZone } from "@/lib/date";
import { getRestReminderPlan } from "@/lib/workout-rest";
import { scheduleWorkoutRestReminder } from "@/lib/workout-qstash";
import { getNextExerciseAfterSetSave, getNextSetToFill } from "@/lib/workout-today-flow";
import { clampWorkoutWeightKg } from "@/lib/workout-set-entry";

// lastError doubles as a diagnostic trail: "qstash_scheduled:<id>" means QStash accepted the
// message, so a reminder that stays unsent after that failed at delivery, not at scheduling.
async function scheduleAndRecordReminder(reminderId: string, dueAt: Date) {
  let note: string;
  try {
    const { messageId } = await scheduleWorkoutRestReminder({ reminderId, dueAt });
    note = `qstash_scheduled:${messageId ?? "unknown"}`;
  } catch (error) {
    console.error("[workout-reminder] schedule failed", reminderId, error);
    note = error instanceof Error ? error.message.slice(0, 500) : "qstash_schedule_failed";
  }

  await prisma.workoutRestReminder
    .update({ where: { id: reminderId }, data: { lastError: note } })
    .catch((error) => console.error("[workout-reminder] could not record schedule result", reminderId, error));
}

export type WorkoutNavigationResult = { nextUrl: string };

async function getRestRedirectUrl(userId: string): Promise<string | null> {
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
    return null;
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

  return `${targetUrl}${separator}${params.toString()}`;
}

async function startWorkoutExercise(formData: FormData): Promise<WorkoutNavigationResult> {
  const user = await requireUser();
  const timezone = user.gymProfile?.timezone || "Asia/Bangkok";
  const workoutDayExerciseId = String(formData.get("workoutDayExerciseId") || "");
  const now = new Date();
  const todayDayOfWeek = getDayOfWeekInTimeZone(now, timezone);

  const [restRedirectUrl, workoutDay] = await Promise.all([
    getRestRedirectUrl(user.id),
    prisma.workoutDay.findUnique({
      where: { userId_dayOfWeek: { userId: user.id, dayOfWeek: todayDayOfWeek } },
      include: {
        exercises: {
          orderBy: { orderIndex: "asc" },
          include: {
            catalogItem: true,
            sets: { orderBy: { setIndex: "asc" } },
          },
        },
      },
    }),
  ]);

  if (restRedirectUrl) {
    return { nextUrl: restRedirectUrl };
  }

  if (!workoutDay || workoutDay.isRestDay) {
    return { nextUrl: "/today" };
  }

  const selectedIndex = workoutDay.exercises.findIndex((exercise) => exercise.id === workoutDayExerciseId);
  const selectedExercise = selectedIndex >= 0 ? workoutDay.exercises[selectedIndex] : null;

  if (!selectedExercise) {
    return { nextUrl: "/today" };
  }

  const { log } = await ensureTodayWorkoutLog(prisma, user.id, timezone, { now, workoutDay });
  const exerciseLog = log.exerciseLogs.find(
    (exercise) => exercise.catalogItemId === selectedExercise.catalogItemId && exercise.orderIndex === selectedIndex,
  );

  if (!exerciseLog) {
    return { nextUrl: "/today" };
  }

  if (!exerciseLog.startedAt) {
    await prisma.workoutExerciseLog.update({
      where: { id: exerciseLog.id },
      data: { startedAt: new Date() },
    });
  }

  return { nextUrl: `/today?exercise=${exerciseLog.id}` };
}

export async function startWorkoutExerciseAction(formData: FormData) {
  redirect((await startWorkoutExercise(formData)).nextUrl);
}

export async function startTodayWorkoutExerciseAction(formData: FormData) {
  return startWorkoutExercise(formData);
}

async function requireSessionUserId() {
  const userId = await getSessionUserId();
  if (!userId) {
    redirect("/login");
  }

  return userId;
}

async function saveWorkoutSet(formData: FormData): Promise<WorkoutNavigationResult> {
  const userId = await requireSessionUserId();
  const setLogId = String(formData.get("setLogId") || "");
  const isCompleted = formData.get("isCompleted") === "on";

  const [restRedirectUrl, setLog] = await Promise.all([
    getRestRedirectUrl(userId),
    prisma.workoutSetLog.findFirst({
      where: { id: setLogId, workoutExerciseLog: { workoutLog: { userId } } },
      select: {
        workoutExerciseLogId: true,
        workoutExerciseLog: { select: { workoutLogId: true } },
      },
    }),
  ]);

  if (restRedirectUrl) {
    return { nextUrl: restRedirectUrl };
  }

  if (!setLog) {
    return { nextUrl: "/today" };
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

  const workoutLogId = setLog.workoutExerciseLog.workoutLogId;
  const workoutExercises = await prisma.workoutExerciseLog.findMany({
    where: { workoutLogId },
    orderBy: { orderIndex: "asc" },
    select: {
      id: true,
      exerciseName: true,
      orderIndex: true,
      isCompleted: true,
      startedAt: true,
      setLogs: {
        orderBy: { setIndex: "asc" },
        select: { id: true, setIndex: true, isCompleted: true },
      },
    },
  });
  const updatedExercise = workoutExercises.find((exercise) => exercise.id === setLog.workoutExerciseLogId) ?? null;
  const exerciseIsCompleted = Boolean(
    updatedExercise && updatedExercise.setLogs.length > 0 && updatedExercise.setLogs.every((item) => item.isCompleted),
  );
  const allSetLogs = workoutExercises.flatMap((exercise) => exercise.setLogs);
  const workoutIsCompleted = allSetLogs.length > 0 && allSetLogs.every((item) => item.isCompleted);
  const nextExercise = updatedExercise
    ? getNextExerciseAfterSetSave(workoutExercises, { ...updatedExercise, isCompleted: exerciseIsCompleted })
    : null;
  const nextSet = updatedExercise ? getNextSetToFill(updatedExercise.setLogs) : null;

  const restPlan = getRestReminderPlan({
    setWasCompleted: isCompleted,
    exerciseIsCompleted,
    nextExerciseName: exerciseIsCompleted ? nextExercise?.exerciseName ?? null : null,
  });
  const targetExerciseId = exerciseIsCompleted ? nextExercise?.id : setLog.workoutExerciseLogId;
  const dueAt = restPlan ? new Date(Date.now() + restPlan.seconds * 1000) : null;

  const [, , reminder] = await Promise.all([
    prisma.workoutExerciseLog.update({
      where: { id: setLog.workoutExerciseLogId },
      data: { isCompleted: exerciseIsCompleted },
    }),
    prisma.workoutLog.update({
      where: { id: workoutLogId },
      data: { completedAt: workoutIsCompleted ? new Date() : null },
    }),
    restPlan && dueAt && updatedExercise
      ? prisma.workoutRestReminder.create({
          data: {
            userId,
            workoutSetLogId: setLogId,
            workoutExerciseLogId: setLog.workoutExerciseLogId,
            kind: restPlan.kind,
            title: restPlan.title,
            body: restPlan.body,
            url: targetExerciseId ? `/today?exercise=${targetExerciseId}` : "/today",
            dueAt,
          },
        })
      : Promise.resolve(null),
    nextExercise && !nextExercise.startedAt
      ? prisma.workoutExerciseLog.update({ where: { id: nextExercise.id }, data: { startedAt: new Date() } })
      : Promise.resolve(null),
  ]);

  const params = new URLSearchParams();

  if (reminder && restPlan && dueAt) {
    after(() => scheduleAndRecordReminder(reminder.id, dueAt));

    params.set("rest", String(restPlan.seconds));
    params.set("restKind", restPlan.kind);
    params.set("restTitle", restPlan.title);
    params.set("restBody", restPlan.body);
    params.set("restDueAt", String(dueAt.getTime()));
  }

  if (targetExerciseId) {
    params.set("exercise", targetExerciseId);
  }

  if (!exerciseIsCompleted && nextSet) {
    params.set("set", nextSet.id);
  }

  return { nextUrl: params.size > 0 ? `/today?${params.toString()}` : "/today" };
}

export async function saveWorkoutSetAction(formData: FormData) {
  redirect((await saveWorkoutSet(formData)).nextUrl);
}

// Redirecting from the action lets Next send the next /today payload in the same
// response, instead of the client making a second request after the action.
export async function saveTodayWorkoutSetAction(formData: FormData) {
  redirect((await saveWorkoutSet(formData)).nextUrl);
}

async function completeWorkoutExercise(formData: FormData): Promise<WorkoutNavigationResult> {
  const userId = await requireSessionUserId();
  const exerciseLogId = String(formData.get("exerciseLogId") || "");
  const [restRedirectUrl, exercise] = await Promise.all([
    getRestRedirectUrl(userId),
    prisma.workoutExerciseLog.findFirst({
      where: { id: exerciseLogId, workoutLog: { userId } },
      select: { id: true, workoutLogId: true, startedAt: true, isCompleted: true },
    }),
  ]);
  if (restRedirectUrl) {
    return { nextUrl: restRedirectUrl };
  }

  const rawWeightKg = parseNullableNumber(formData.get("actualWeightKg"));
  if (typeof rawWeightKg !== "number") {
    return { nextUrl: exerciseLogId ? `/today?exercise=${encodeURIComponent(exerciseLogId)}` : "/today" };
  }

  const completedAt = new Date();
  const actualWeightKg = clampWorkoutWeightKg(rawWeightKg);

  if (!exercise || !exercise.startedAt || exercise.isCompleted) {
    return { nextUrl: "/today" };
  }

  const lastSetLog = await prisma.workoutSetLog.findFirst({
    where: { workoutExerciseLogId: exercise.id },
    orderBy: { setIndex: "desc" },
    select: { id: true },
  });
  const lastSetLogId = lastSetLog?.id ?? null;

  if (!lastSetLogId) {
    return { nextUrl: `/today?exercise=${exercise.id}` };
  }

  await prisma.$transaction([
    prisma.workoutSetLog.updateMany({ where: { workoutExerciseLogId: exercise.id }, data: { actualWeightKg } }),
    prisma.workoutSetLog.updateMany({
      where: { workoutExerciseLogId: exercise.id, isCompleted: false },
      data: { isCompleted: true, completedAt },
    }),
    prisma.workoutExerciseLog.update({ where: { id: exercise.id }, data: { isCompleted: true } }),
  ]);

  const [workoutExercises, remainingSet] = await Promise.all([
    prisma.workoutExerciseLog.findMany({
      where: { workoutLogId: exercise.workoutLogId },
      orderBy: { orderIndex: "asc" },
      select: { id: true, exerciseName: true, orderIndex: true, isCompleted: true, startedAt: true },
    }),
    prisma.workoutSetLog.findFirst({
      where: { workoutExerciseLog: { workoutLogId: exercise.workoutLogId }, isCompleted: false },
      select: { id: true },
    }),
  ]);
  const workoutIsCompleted = !remainingSet;
  const completedExercise = workoutExercises.find((item) => item.id === exercise.id) ?? null;
  const nextExercise = completedExercise ? getNextExerciseAfterSetSave(workoutExercises, completedExercise) : null;
  const updateWorkoutCompletion = prisma.workoutLog.update({
    where: { id: exercise.workoutLogId },
    data: { completedAt: workoutIsCompleted ? completedAt : null },
  });

  const startNextExercise =
    nextExercise && !nextExercise.startedAt
      ? prisma.workoutExerciseLog.update({ where: { id: nextExercise.id }, data: { startedAt: completedAt } })
      : null;

  const restPlan = getRestReminderPlan({
    setWasCompleted: true,
    exerciseIsCompleted: true,
    nextExerciseName: nextExercise?.exerciseName ?? null,
  });

  if (restPlan && lastSetLogId) {
    const dueAt = new Date(Date.now() + restPlan.seconds * 1000);
    const targetExerciseId = nextExercise?.id ?? null;
    const [reminder] = await Promise.all([
      prisma.workoutRestReminder.create({
      data: {
        userId,
        workoutSetLogId: lastSetLogId,
        workoutExerciseLogId: exercise.id,
        kind: restPlan.kind,
        title: restPlan.title,
        body: restPlan.body,
        url: targetExerciseId ? `/today?exercise=${targetExerciseId}` : "/today",
        dueAt,
      },
      }),
      startNextExercise,
      updateWorkoutCompletion,
    ]);
    after(() => scheduleAndRecordReminder(reminder.id, dueAt));

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
    return { nextUrl: `/today?${params.toString()}` };
  }

  await Promise.all([startNextExercise, updateWorkoutCompletion]);

  if (nextExercise) {
    return { nextUrl: `/today?exercise=${nextExercise.id}` };
  }

  return { nextUrl: workoutIsCompleted ? "/today" : `/today?exercise=${exercise.id}` };
}

export async function completeTodayWorkoutExerciseAction(formData: FormData) {
  redirect((await completeWorkoutExercise(formData)).nextUrl);
}

const REST_EXTEND_SECONDS = 15;

async function findActiveRestReminder(userId: string) {
  return prisma.workoutRestReminder.findFirst({
    where: { userId, sentAt: null, dueAt: { gt: new Date() } },
    orderBy: { dueAt: "desc" },
    select: { id: true, dueAt: true, url: true },
  });
}

export async function extendTodayRestAction() {
  const userId = await requireSessionUserId();
  const reminder = await findActiveRestReminder(userId);

  if (reminder) {
    const dueAt = new Date(reminder.dueAt.getTime() + REST_EXTEND_SECONDS * 1000);
    await prisma.workoutRestReminder.update({ where: { id: reminder.id }, data: { dueAt } });
    // The original QStash message fires early and is ignored as "not due"; this one delivers.
    after(() => scheduleAndRecordReminder(reminder.id, dueAt));
  }

  redirect((await getRestRedirectUrl(userId)) ?? "/today");
}

function isSafeTodayUrl(value: string) {
  return /^\/today(\?\S*)?$/.test(value);
}

export async function skipTodayRestAction(formData: FormData) {
  const userId = await requireSessionUserId();
  const reminder = await findActiveRestReminder(userId);
  const requestedUrl = String(formData.get("continueUrl") || "");

  if (reminder) {
    await prisma.workoutRestReminder.update({
      where: { id: reminder.id },
      data: { sentAt: new Date(), lastError: "skipped" },
    });
  }

  const fallbackUrl = reminder?.url && isSafeTodayUrl(reminder.url) ? reminder.url : "/today";
  redirect(isSafeTodayUrl(requestedUrl) ? requestedUrl : fallbackUrl);
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
