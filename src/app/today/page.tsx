import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/auth";
import { dayLabel, getDateKeyInTimeZone, getDayOfWeekInTimeZone, getWorkoutLogLookupWindow, todayLabel } from "@/lib/date";
import { AppCard, EmptyState, PendingButton } from "@/components/ui";
import { AppShell } from "@/components/app-shell";
import { ExerciseMediaPreview } from "@/components/exercise-media-preview";
import { RestCountdownPill } from "@/components/rest-countdown-pill";
import { TodayExercisePicker } from "@/components/today-exercise-picker";
import { TodayExerciseGuideSheet } from "@/components/today-exercise-guide-sheet";
import { TodayExerciseAction } from "@/components/today-exercise-action";
import { TodayExerciseReviewSheet, type TodayExerciseReview } from "@/components/today-exercise-review-sheet";
import { TodaySetControls } from "@/components/today-set-controls";
import { TodayCompleteExercise } from "@/components/today-complete-exercise";
import { TodayRestScreen } from "@/components/today-rest-screen";
import { WorkoutRestTimer } from "@/components/workout-rest-timer";
import {
  completeTodayWorkoutExerciseAction,
  extendTodayRestAction,
  finishWorkoutAction,
  skipTodayRestAction,
  saveTodayWorkoutSetAction,
  startTodayWorkoutExerciseAction,
} from "@/lib/workout-actions";
import { buildLastSetHint, getRestLockFromSearchParams, isRestLocked } from "@/lib/workout-rest";
import { getExerciseMedia } from "@/lib/exercise-media";
import { getCurrentExerciseRow, getSelectedSetToFill, getSetDisplayNumber, getSetEntryDefaults } from "@/lib/workout-today-flow";
import { formatWorkoutWeightKg } from "@/lib/workout-set-entry";

const TEXT = {
  done: "Xong",
  view: "Xem",
  active: "\u0110ang t\u1eadp",
  continue: "Ti\u1ebfp",
  notStarted: "Ch\u01b0a t\u1eadp",
  start: "T\u1eadp",
  noImage: "Ch\u01b0a c\u00f3 \u1ea3nh",
  image: "\u1ea2nh",
  today: "H\u00f4m nay",
  finish: "Ho\u00e0n th\u00e0nh",
  finishing: "\u0110ang ho\u00e0n th\u00e0nh...",
  progress: "ti\u1ebfn \u0111\u1ed9",
  resting: "\u0110ang ngh\u1ec9",
  completedExercise: "B\u00e0i \u0111\u00e3 xong",
  completedSets: "\u0110\u00e3 xong",
  nextExercise: "B\u00e0i ti\u1ebfp theo",
  noMuscleGroup: "Ch\u01b0a c\u00f3 nh\u00f3m c\u01a1",
  preparing: "\u0110ang chu\u1ea9n b\u1ecb",
  reviewExercise: "Xem l\u1ea1i b\u00e0i n\u00e0y",
  fallbackName: "b\u1ea1n",
  hello: "Xin ch\u00e0o",
  noScheduleTitle: "Ch\u01b0a c\u00f3 l\u1ecbch h\u00f4m nay",
  chooseSchedule: "M\u1edf l\u1ecbch t\u1eadp \u0111\u1ec3 ch\u1ecdn b\u00e0i cho h\u00f4m nay.",
  openSchedule: "M\u1edf l\u1ecbch t\u1eadp",
  restTitle: "H\u00f4m nay ngh\u1ec9",
  restDescription: "Ngh\u1ec9 ng\u01a1i v\u00e0 chu\u1ea9n b\u1ecb cho bu\u1ed5i t\u1eadp ti\u1ebfp theo.",
  noExerciseTitle: "Ch\u01b0a c\u00f3 b\u00e0i t\u1eadp",
  addExercise: "M\u1edf l\u1ecbch t\u1eadp \u0111\u1ec3 th\u00eam b\u00e0i cho h\u00f4m nay.",
  editSchedule: "Ch\u1ec9nh l\u1ecbch",
  todayExercises: "C\u00e1c b\u00e0i h\u00f4m nay",
  exerciseUnit: "b\u00e0i",
};

type SearchParams = {
  exercise?: string;
  review?: string;
  set?: string;
  rest?: string;
  restTitle?: string;
  restBody?: string;
  restDueAt?: string;
};

type ExerciseRow = {
  workoutDayExerciseId: string;
  exerciseLogId: string | null;
  name: string;
  muscleGroup: string | null;
  imageUrl: string | null;
  animationUrl: string | null;
  note: string | null;
  currentWeightKg: number | null;
  setCount: number;
  completedSets: number;
  isStarted: boolean;
  isCompleted: boolean;
};

type ActiveExercise = NonNullable<Awaited<ReturnType<typeof getTodayPageData>>["activeExerciseWithHistory"]>;
type ActiveSet = ActiveExercise["setLogs"][number];
type RestLock = NonNullable<Awaited<ReturnType<typeof getTodayPageData>>["restLock"]>;

function getExerciseStatus(row: ExerciseRow) {
  if (row.isCompleted) {
    return { label: TEXT.done, className: "border-[#2A2F36] bg-[#14161A] text-[#8B919B]", cta: TEXT.view };
  }

  if (row.isStarted) {
    return { label: TEXT.active, className: "border-[#C8F31D]/50 bg-[#1B2208] text-[#C8F31D]", cta: TEXT.continue };
  }

  return { label: TEXT.notStarted, className: "border-[#2A2F36] bg-[#1B1E23] text-[#B6BBC4]", cta: TEXT.start };
}

function ExerciseMediaFrame({
  exercise,
  alt,
  variant = "row",
}: {
  exercise: { imageUrl?: string | null; animationUrl?: string | null };
  alt: string;
  variant?: "hero" | "row";
}) {
  const media = getExerciseMedia(exercise, "workout");

  if (variant === "hero") {
    return (
      <ExerciseMediaPreview
        media={media}
        alt={alt}
        width={720}
        height={420}
        imageClassName="h-full w-full object-cover"
        placeholderClassName="flex h-full w-full items-center justify-center rounded-[16px] bg-[#0A0B0D] text-[15px] font-bold text-[#8B919B]"
        placeholderLabel={TEXT.noImage}
        buttonClassName="block h-full w-full rounded-[16px] bg-black"
        sizes="(max-width: 480px) 100vw, 480px"
        priority
      />
    );
  }

  return (
    <ExerciseMediaPreview
      media={media}
      alt={alt}
      width={180}
      height={180}
      imageClassName="h-[92px] w-[92px] rounded-[16px] object-cover"
      placeholderClassName="flex h-[92px] w-[92px] shrink-0 items-center justify-center rounded-[16px] bg-[#1B1E23] text-[12px] font-bold text-[#8B919B]"
      placeholderLabel={TEXT.image}
      buttonClassName="shrink-0 rounded-[16px]"
      sizes="92px"
    />
  );
}


function StartExerciseButton({ restLock, row, wide = false }: { restLock: RestLock | null; row: ExerciseRow; wide?: boolean }) {
  const status = getExerciseStatus(row);
  const className = `inline-flex min-h-[48px] items-center justify-center rounded-[14px] px-4 py-2 text-[15px] font-black transition active:scale-[0.98] ${
    row.isCompleted
      ? "border border-[#2A2F36] bg-[#14161A] text-[#F4F5F7]"
      : row.isStarted || wide
        ? "bg-[#C8F31D] text-[#0A0B0D]"
        : "border border-[#2A2F36] bg-[#1B1E23] text-[#F4F5F7]"
  } ${wide ? "w-full" : "w-[82px] shrink-0"}`;

  return (
    <TodayExerciseAction
      action={startTodayWorkoutExerciseAction}
      className={className}
      cta={status.cta}
      exerciseLogId={row.exerciseLogId}
      isCompleted={row.isCompleted}
      isStarted={row.isStarted}
      restDueAtMs={restLock?.dueAtMs ?? null}
      wide={wide}
      workoutDayExerciseId={row.workoutDayExerciseId}
    />
  );
}

function SegmentedProgress({ completed, total }: { completed: number; total: number }) {
  const segments = Math.min(total, 40);
  const filled = total > 0 ? Math.round((completed / total) * segments) : 0;

  return (
    <div className="flex gap-[3px]" aria-hidden="true">
      {Array.from({ length: segments }, (_, index) => (
        <span key={index} className={`h-[5px] flex-1 rounded-full ${index < filled ? "bg-[#C8F31D]" : "bg-[#23262B]"}`} />
      ))}
    </div>
  );
}

function ProgressStrip({
  completedSets,
  restLock,
  totalSets,
  todayLogId,
}: {
  completedSets: number;
  restLock: RestLock | null;
  totalSets: number;
  todayLogId: string | null;
}) {
  const allDone = Boolean(todayLogId) && totalSets > 0 && completedSets === totalSets;

  return (
    <div className="space-y-2">
      {totalSets > 0 ? <SegmentedProgress completed={completedSets} total={totalSets} /> : null}
      {restLock ? (
        <div className="flex items-center justify-between rounded-[14px] border border-[#1F2329] bg-[#14161A] px-3 py-2">
          <p className="text-[13px] font-black text-[#C8F31D]">{TEXT.resting}</p>
          <RestCountdownPill dueAtMs={restLock.dueAtMs} />
        </div>
      ) : allDone ? (
        <form action={finishWorkoutAction}>
          <input type="hidden" name="workoutLogId" value={todayLogId ?? ""} />
          <PendingButton
            className="min-h-[50px] w-full rounded-[16px] bg-[#C8F31D] px-5 py-2 text-[16px] font-black text-[#0A0B0D] active:scale-[0.98]"
            pendingLabel={TEXT.finishing}
          >
            {TEXT.finish}
          </PendingButton>
        </form>
      ) : null}
    </div>
  );
}

function CurrentExerciseCard({
  row,
  exercise,
  restLock,
  reviewDefaultOpen,
  reviewExercise,
  rows,
  selectedSet,
  setDefaults,
}: {
  row: ExerciseRow;
  exercise: ActiveExercise | null;
  restLock: RestLock | null;
  reviewDefaultOpen: boolean;
  reviewExercise: TodayExerciseReview | null;
  rows: ExerciseRow[];
  selectedSet: ActiveSet | null;
  setDefaults: { weightKg: number | null; reps: number | null };
}) {
  const setNumber =
    selectedSet && exercise ? getSetDisplayNumber(exercise.setLogs, selectedSet) : Math.min(row.completedSets + 1, row.setCount || 1);
  const canSubmitSet = Boolean(exercise?.startedAt && selectedSet && !row.isCompleted);
  const lastHint = selectedSet?.lastHint;
  const smallButtonClassName =
    "inline-flex min-h-[36px] shrink-0 items-center justify-center rounded-full border border-[#2A2F36] bg-[#14161A] px-3 text-[12px] font-bold leading-tight text-[#B6BBC4] active:scale-[0.98]";
  const visibleSets = Math.min(row.setCount, 8);
  const setProgressSummary = (
    <div className="flex items-center gap-1.5">
      <span className="mr-0.5 text-[12px] font-bold text-[#8B919B]">Set</span>
      {Array.from({ length: visibleSets }, (_, index) => {
        const done = index < row.completedSets;
        const current = !row.isCompleted && index === row.completedSets;

        return (
          <span
            key={index}
            className={`flex h-7 min-w-[28px] items-center justify-center rounded-full border px-2 text-[12px] font-black ${
              done
                ? "border-[#C8F31D] bg-[#C8F31D] text-[#0A0B0D]"
                : current
                  ? "border-[#C8F31D] text-[#C8F31D]"
                  : "border-[#2A2F36] text-[#8B919B]"
            }`}
          >
            {index + 1}
          </span>
        );
      })}
      <div className="ml-auto flex shrink-0 items-center gap-1.5">
        <TodayExerciseGuideSheet
          exerciseName={row.name}
          muscleGroup={row.muscleGroup}
          note={row.note}
          triggerClassName={smallButtonClassName}
        />
        <TodayExercisePicker
          action={startTodayWorkoutExerciseAction}
          restDueAtMs={restLock?.dueAtMs ?? null}
          rows={rows}
          triggerClassName={smallButtonClassName}
        />
      </div>
    </div>
  );

  return (
    <section className="flex min-h-0 flex-1 flex-col overflow-hidden rounded-[20px] border border-[#1F2329] bg-[#14161A] ">
      <div className="shrink-0 p-1.5 pb-0">
        <div className="h-[clamp(150px,24svh,190px)] overflow-hidden rounded-[15px] border border-[#1F2329] bg-black [@media(min-height:760px)]:h-[clamp(190px,29svh,250px)] [@media(min-height:860px)]:h-[clamp(230px,32svh,310px)]">
          <ExerciseMediaFrame exercise={row} alt={row.name} variant="hero" />
        </div>
      </div>

      <div className="flex min-h-0 flex-1 flex-col gap-1.5 overflow-y-auto overscroll-contain px-3 pb-2 pt-1.5">
        <div className="flex min-w-0 items-start gap-2">
          <div className="min-w-0 flex-1">
            <p className="text-[12px] font-black leading-4 text-[#C8F31D]">
              {row.isCompleted ? TEXT.completedExercise : row.isStarted ? TEXT.active : TEXT.nextExercise}
            </p>
            <h2 className="break-words text-[20px] font-black leading-[1.02] text-[#F9FAFB]">{row.name}</h2>
            <p className="break-words text-[13px] font-semibold leading-4 text-[#D1D5DB]">{row.muscleGroup || TEXT.noMuscleGroup}</p>
            {lastHint ? <p className="mt-0.5 break-words text-[12px] font-black leading-4 text-[#C8F31D]">{lastHint}</p> : null}
          </div>
        </div>

        {canSubmitSet && selectedSet ? (
          <>
            <TodaySetControls
              key={selectedSet.id}
              setLogId={selectedSet.id}
              setNumber={setNumber}
              defaultWeightKg={setDefaults.weightKg}
              defaultReps={setDefaults.reps}
              restDueAtMs={restLock?.dueAtMs ?? null}
              isLastSet={row.completedSets + 1 >= row.setCount}
              action={saveTodayWorkoutSetAction}
            />
            <TodayCompleteExercise
              key={`${exercise?.id ?? "exercise"}-${selectedSet.id}`}
              action={completeTodayWorkoutExerciseAction}
              defaultWeightKg={setDefaults.weightKg}
              exerciseLogId={exercise?.id ?? ""}
              restDueAtMs={restLock?.dueAtMs ?? null}
            />
            <div className="pb-[92px]">{setProgressSummary}</div>
          </>
        ) : (
          <>
            {setProgressSummary}
            <div className="pb-[92px]">
              {row.isCompleted && reviewExercise ? (
                <TodayExerciseReviewSheet
                  key={`${reviewExercise.id}-${reviewDefaultOpen ? "open" : "closed"}`}
                  defaultOpen={reviewDefaultOpen}
                  exercise={reviewExercise}
                  triggerClassName="flex min-h-[50px] w-full items-center justify-center rounded-[16px] border border-[#2A2F36] bg-[#0A0B0D] px-4 py-2.5 text-[17px] font-black text-[#F9FAFB]"
                  triggerLabel={TEXT.reviewExercise}
                />
              ) : (
                <StartExerciseButton row={row} restLock={restLock} wide />
              )}
            </div>
          </>
        )}
      </div>
    </section>
  );
}

type ExerciseIdentity = { id: string; catalogItemId: string | null; exerciseName: string };

async function findPreviousFinalSet(userId: string, exercise: ExerciseIdentity) {
  const previousExerciseLog = await prisma.workoutExerciseLog.findFirst({
    where: {
      id: { not: exercise.id },
      workoutLog: { userId },
      ...(exercise.catalogItemId ? { catalogItemId: exercise.catalogItemId } : { exerciseName: exercise.exerciseName }),
      setLogs: { some: { OR: [{ actualReps: { not: null } }, { actualWeightKg: { not: null } }] } },
    },
    orderBy: [{ workoutLog: { workoutDate: "desc" } }, { updatedAt: "desc" }],
    select: {
      setLogs: {
        where: { OR: [{ actualReps: { not: null } }, { actualWeightKg: { not: null } }] },
        orderBy: { setIndex: "desc" },
        select: { actualReps: true, actualWeightKg: true },
        take: 1,
      },
    },
  });

  return previousExerciseLog?.setLogs[0] ?? null;
}

function getRestContinueUrl(exerciseLogId: string | null, setLogId: string | null) {
  if (!exerciseLogId) {
    return "/today";
  }

  const params = new URLSearchParams({ exercise: exerciseLogId });
  if (setLogId) {
    params.set("set", setLogId);
  }

  return `/today?${params.toString()}`;
}

function getRestNextDetail(
  row: ExerciseRow,
  exercise: ActiveExercise | null,
  selectedSet: ActiveSet | null,
  setDefaults: { weightKg: number | null; reps: number | null },
) {
  if (row.isCompleted) {
    return `${row.completedSets}/${row.setCount} set`;
  }

  const setNumber =
    selectedSet && exercise ? getSetDisplayNumber(exercise.setLogs, selectedSet) : Math.min(row.completedSets + 1, row.setCount || 1);
  const parts = [`Set ${setNumber}`];
  if (typeof setDefaults.weightKg === "number") {
    parts.push(`${formatWorkoutWeightKg(setDefaults.weightKg)} kg`);
  }
  if (typeof setDefaults.reps === "number" && setDefaults.reps > 0) {
    parts.push(`${setDefaults.reps} l\u1ea7n`);
  }

  return parts.join(" \u00b7 ");
}

async function getTodayPageData(params: SearchParams) {
  const user = await requireUser();
  const profile = user.gymProfile ?? (await prisma.gymProfile.findUnique({ where: { userId: user.id } }));
  const timezone = profile?.timezone || "Asia/Bangkok";
  const today = new Date();
  const nowMs = today.getTime();
  const todayDayOfWeek = getDayOfWeekInTimeZone(today, timezone);
  const todayKey = getDateKeyInTimeZone(today, timezone);

  // When the URL names the exercise, look up its history alongside the main queries
  // instead of waiting for them to finish first.
  const earlyPreviousFinalSet = params.exercise
    ? prisma.workoutExerciseLog
        .findFirst({
          where: { id: params.exercise, workoutLog: { userId: user.id } },
          select: { id: true, catalogItemId: true, exerciseName: true },
        })
        .then((exercise) => (exercise ? findPreviousFinalSet(user.id, exercise) : null))
    : null;

  const [workoutDay, workoutLogs, activeRestReminder] = await Promise.all([
    prisma.workoutDay.findUnique({
      where: { userId_dayOfWeek: { userId: user.id, dayOfWeek: todayDayOfWeek } },
      select: {
        id: true,
        title: true,
        isRestDay: true,
        exercises: {
          orderBy: { orderIndex: "asc" },
          select: {
            id: true,
            catalogItemId: true,
            catalogItem: {
              select: {
                name: true,
                muscleGroup: true,
                imageUrl: true,
                animationUrl: true,
                note: true,
                defaultWeightKg: true,
              },
            },
            _count: { select: { sets: true } },
          },
        },
      },
    }),
    prisma.workoutLog.findMany({
      where: { userId: user.id, workoutDate: getWorkoutLogLookupWindow(today, timezone) },
      select: {
        id: true,
        workoutDate: true,
        exerciseLogs: {
          orderBy: { orderIndex: "asc" },
          select: {
            id: true,
            catalogItemId: true,
            exerciseName: true,
            muscleGroup: true,
            imageUrl: true,
            animationUrl: true,
            orderIndex: true,
            startedAt: true,
            isCompleted: true,
            setLogs: {
              orderBy: { setIndex: "asc" },
              select: {
                id: true,
                setIndex: true,
                targetReps: true,
                targetWeightKg: true,
                actualReps: true,
                actualWeightKg: true,
                note: true,
                isCompleted: true,
              },
            },
          },
        },
      },
      orderBy: { startedAt: "desc" },
    }),
    prisma.workoutRestReminder.findFirst({
      where: {
        userId: user.id,
        sentAt: null,
        dueAt: { gt: new Date(nowMs) },
      },
      orderBy: { dueAt: "desc" },
      select: {
        dueAt: true,
        title: true,
        body: true,
      },
    }),
  ]);

  const todayLog = workoutLogs.find((log) => getDateKeyInTimeZone(log.workoutDate, timezone) === todayKey) ?? null;
  const displayName = profile?.displayName || user.name || TEXT.fallbackName;
  const pageTitle = todayLabel(todayDayOfWeek, workoutDay?.title || dayLabel(todayDayOfWeek));
  const isRestDay = Boolean(workoutDay?.isRestDay);

  const rows: ExerciseRow[] =
    workoutDay?.exercises.map((entry, index) => {
      const exerciseLog =
        todayLog?.exerciseLogs.find((log) => log.catalogItemId === entry.catalogItemId && log.orderIndex === index) ?? null;
      const completedSets = exerciseLog?.setLogs.filter((setLog) => setLog.isCompleted).length ?? 0;
      const setCount = exerciseLog?.setLogs.length ?? entry._count.sets;
      const isStarted = Boolean(exerciseLog?.startedAt || completedSets > 0);
      const isCompleted = setCount > 0 && completedSets === setCount;

      return {
        workoutDayExerciseId: entry.id,
        exerciseLogId: exerciseLog?.id ?? null,
        name: entry.catalogItem.name,
        muscleGroup: entry.catalogItem.muscleGroup,
        imageUrl: entry.catalogItem.imageUrl,
        animationUrl: entry.catalogItem.animationUrl,
        note: entry.catalogItem.note,
        currentWeightKg: entry.catalogItem.defaultWeightKg,
        setCount,
        completedSets,
        isStarted,
        isCompleted,
      };
    }) ?? [];

  const totalSets = rows.reduce((sum, row) => sum + row.setCount, 0);
  const completedSets = rows.reduce((sum, row) => sum + row.completedSets, 0);
  const activeRow = getCurrentExerciseRow(rows, params.exercise);
  const activeExerciseId = params.exercise ?? activeRow?.exerciseLogId ?? null;
  const activeExercise = activeExerciseId ? todayLog?.exerciseLogs.find((exercise) => exercise.id === activeExerciseId) ?? null : null;
  const previousFinalSet = earlyPreviousFinalSet
    ? await earlyPreviousFinalSet
    : activeExercise
      ? await findPreviousFinalSet(user.id, activeExercise)
      : null;

  const activeExerciseWithHistory = activeExercise
    ? {
        ...activeExercise,
        setLogs: activeExercise.setLogs.map((setLog) => ({
          ...setLog,
          lastHint: buildLastSetHint(previousFinalSet),
          lastActualReps: previousFinalSet?.actualReps ?? null,
          lastActualWeightKg: previousFinalSet?.actualWeightKg ?? null,
        })),
      }
    : null;

  const urlRestLock = getRestLockFromSearchParams(params, nowMs);
  const dbRestLock =
    activeRestReminder && isRestLocked(activeRestReminder.dueAt.getTime(), nowMs)
      ? {
          dueAtMs: activeRestReminder.dueAt.getTime(),
          restSeconds: Math.ceil((activeRestReminder.dueAt.getTime() - nowMs) / 1000),
          title: activeRestReminder.title,
          body: activeRestReminder.body,
        }
      : null;
  const activeRestLock = dbRestLock && (!urlRestLock || dbRestLock.dueAtMs >= urlRestLock.dueAtMs) ? dbRestLock : urlRestLock;
  const restLock = user.restTimerEnabled ? activeRestLock : null;
  const selectedSet = activeExerciseWithHistory ? getSelectedSetToFill(activeExerciseWithHistory.setLogs, params.set) : null;
  const setDefaults = selectedSet ? getSetEntryDefaults(selectedSet, activeExerciseWithHistory?.setLogs ?? [], previousFinalSet) : { weightKg: null, reps: null };
  const reviewExercise: TodayExerciseReview | null = activeExerciseWithHistory
    ? {
        id: activeExerciseWithHistory.id,
        name: activeExerciseWithHistory.exerciseName,
        muscleGroup: activeExerciseWithHistory.muscleGroup,
        imageUrl: activeExerciseWithHistory.imageUrl,
        animationUrl: activeExerciseWithHistory.animationUrl,
        completedSets: activeExerciseWithHistory.setLogs.filter((setLog) => setLog.isCompleted).length,
        setCount: activeExerciseWithHistory.setLogs.length,
        setLogs: activeExerciseWithHistory.setLogs.map((setLog, index) => ({
          id: setLog.id,
          setNumber: index + 1,
          targetReps: setLog.targetReps,
          targetWeightKg: setLog.targetWeightKg,
          actualReps: setLog.actualReps,
          actualWeightKg: setLog.actualWeightKg,
          note: setLog.note,
          isCompleted: setLog.isCompleted,
        })),
      }
    : null;

  return {
    activeExerciseWithHistory,
    activeRow,
    completedSets,
    displayName,
    isRestDay,
    pageTitle,
    rows,
    restLock,
    reviewExercise,
    selectedSet,
    setDefaults,
    todayLogId: todayLog?.id ?? null,
    totalSets,
    workoutDay,
  };
}

export default async function TodayPage({ searchParams }: { searchParams?: Promise<SearchParams> }) {
  const params = (await searchParams) ?? {};
  const {
    activeExerciseWithHistory,
    activeRow,
    completedSets,
    displayName,
    isRestDay,
    pageTitle,
    rows,
    restLock,
    reviewExercise,
    selectedSet,
    setDefaults,
    todayLogId,
    totalSets,
    workoutDay,
  } = await getTodayPageData(params);

  return (
    <AppShell todayFit>
      <div className="shrink-0 space-y-2">
        <div className="flex min-w-0 items-end justify-between gap-3">
          <div className="min-w-0 flex-1">
            <p className="truncate text-[12px] font-semibold leading-4 text-[#8B919B]">{pageTitle}</p>
            <h1 className="text-[22px] font-black leading-[1.1] text-[#F4F5F7]">{TEXT.today}</h1>
          </div>
          <div className="shrink-0 text-right">
            <p className="text-[24px] font-black leading-none tabular-nums text-[#F4F5F7]">
              {completedSets}
              <span className="text-[14px] font-bold text-[#8B919B]">/{totalSets}</span>
            </p>
            <p className="mt-0.5 text-[11px] font-bold text-[#8B919B]">set</p>
          </div>
        </div>

        <ProgressStrip completedSets={completedSets} restLock={activeRow ? null : restLock} totalSets={totalSets} todayLogId={todayLogId} />
      </div>

      {!workoutDay ? (
        <div className="min-h-0 flex-1 overflow-hidden">
          <EmptyState
            title={TEXT.noScheduleTitle}
            description={TEXT.chooseSchedule}
            actionHref="/schedule"
            actionLabel={TEXT.openSchedule}
          />
        </div>
      ) : isRestDay ? (
        <div className="min-h-0 flex-1 overflow-hidden">
          <EmptyState title={TEXT.restTitle} description={TEXT.restDescription} />
        </div>
      ) : rows.length === 0 ? (
        <div className="min-h-0 flex-1 overflow-hidden">
          <EmptyState title={TEXT.noExerciseTitle} description={TEXT.addExercise} actionHref="/schedule" actionLabel={TEXT.editSchedule} />
        </div>
      ) : (
        <>
          {activeRow && restLock ? (
            <TodayRestScreen
              key={restLock.dueAtMs}
              continueUrl={getRestContinueUrl(activeExerciseWithHistory?.id ?? null, selectedSet?.id ?? null)}
              detail={getRestNextDetail(activeRow, activeExerciseWithHistory, selectedSet, setDefaults)}
              dueAtMs={restLock.dueAtMs}
              extendAction={extendTodayRestAction}
              skipAction={skipTodayRestAction}
              title={activeRow.isCompleted ? TEXT.completedExercise : activeRow.name}
              totalSeconds={restLock.restSeconds}
            />
          ) : null}

          {activeRow ? (
            <CurrentExerciseCard
              row={activeRow}
              exercise={activeExerciseWithHistory}
              restLock={restLock}
              reviewDefaultOpen={params.review === "1"}
              reviewExercise={reviewExercise}
              rows={rows}
              selectedSet={selectedSet}
              setDefaults={setDefaults}
            />
          ) : null}

          <WorkoutRestTimer
            dueAtMs={restLock?.dueAtMs ?? null}
            restSeconds={restLock?.restSeconds ?? null}
            showPrompt={false}
          />
        </>
      )}
    </AppShell>
  );
}
