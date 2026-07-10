import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/auth";
import { dayLabel, getDateKeyInTimeZone, getDayOfWeekInTimeZone, todayLabel } from "@/lib/date";
import { AppCard, EmptyState } from "@/components/ui";
import { AppShell } from "@/components/app-shell";
import { ExerciseMediaPreview } from "@/components/exercise-media-preview";
import { RestCountdownPill } from "@/components/rest-countdown-pill";
import { TodayExercisePicker } from "@/components/today-exercise-picker";
import { TodayExerciseGuideSheet } from "@/components/today-exercise-guide-sheet";
import { TodayExerciseAction } from "@/components/today-exercise-action";
import { TodayExerciseReviewSheet, type TodayExerciseReview } from "@/components/today-exercise-review-sheet";
import { TodaySetControls } from "@/components/today-set-controls";
import { WorkoutRestTimer } from "@/components/workout-rest-timer";
import { finishWorkoutAction, saveWorkoutSetAction, startWorkoutExerciseAction } from "@/lib/workout-actions";
import { buildLastSetHint, getRestLockFromSearchParams, isRestLocked } from "@/lib/workout-rest";
import { getExerciseMedia } from "@/lib/exercise-media";
import { getCurrentExerciseRow, getSelectedSetToFill, getSetDisplayNumber, getSetEntryDefaults } from "@/lib/workout-today-flow";

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
    return { label: TEXT.done, className: "border-[#22C55E]/40 bg-[#12301f] text-[#86EFAC]", cta: TEXT.view };
  }

  if (row.isStarted) {
    return { label: TEXT.active, className: "border-[#38BDF8]/40 bg-[#082f49] text-[#7DD3FC]", cta: TEXT.continue };
  }

  return { label: TEXT.notStarted, className: "border-[#4B5563] bg-[#1F2937] text-[#D1D5DB]", cta: TEXT.start };
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
        placeholderClassName="flex h-full w-full items-center justify-center rounded-[16px] bg-[#0B0F14] text-[15px] font-bold text-[#9CA3AF]"
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
      placeholderClassName="flex h-[92px] w-[92px] shrink-0 items-center justify-center rounded-[16px] bg-[#1F2937] text-[12px] font-bold text-[#9CA3AF]"
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
      ? "border border-[#374151] bg-[#111827] text-[#F9FAFB]"
      : row.isStarted
        ? "bg-[#38BDF8] text-[#0B0F14]"
        : "bg-[#22C55E] text-white"
  } ${wide ? "w-full" : "w-[82px] shrink-0"}`;

  return (
    <TodayExerciseAction
      action={startWorkoutExerciseAction}
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

function ProgressCard({
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
  const percent = totalSets > 0 ? Math.round((completedSets / totalSets) * 100) : 0;

  return (
    <AppCard className="rounded-[16px] border-[#263241] bg-[#111827] p-2">
      <div className="flex items-center justify-between gap-3">
        <div className="min-w-0">
          <p className="text-[11px] font-black text-[#86EFAC]">{restLock ? TEXT.resting : TEXT.today}</p>
          <p className="text-[23px] font-black leading-none text-[#F9FAFB]">
            {completedSets}/{totalSets} set
          </p>
        </div>
        {restLock ? (
          <RestCountdownPill dueAtMs={restLock.dueAtMs} />
        ) : todayLogId && totalSets > 0 && completedSets === totalSets ? (
          <form action={finishWorkoutAction} className="shrink-0">
            <input type="hidden" name="workoutLogId" value={todayLogId} />
            <button className="min-h-[50px] rounded-[16px] bg-[#22C55E] px-5 py-2 text-[15px] font-black text-white active:scale-[0.98]">
              {TEXT.finish}
            </button>
          </form>
        ) : (
          <div className="shrink-0 rounded-[14px] border border-[#263241] bg-[#0B0F14] px-3 py-1.5 text-right">
            <p className="text-[20px] font-black leading-none text-[#38BDF8]">{percent}%</p>
            <p className="text-[11px] font-bold text-[#9CA3AF]">{TEXT.progress}</p>
          </div>
        )}
      </div>
    </AppCard>
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

  return (
    <section className="flex min-h-0 flex-1 flex-col overflow-hidden rounded-[20px] border border-[#263241] bg-[#111827] shadow-[0_18px_40px_rgba(0,0,0,0.24)]">
      <div className="shrink-0 p-1.5 pb-0">
        <div className="h-[clamp(150px,24svh,190px)] overflow-hidden rounded-[15px] border border-[#263241] bg-black [@media(min-height:760px)]:h-[clamp(190px,29svh,250px)] [@media(min-height:860px)]:h-[clamp(230px,32svh,310px)]">
          <ExerciseMediaFrame exercise={row} alt={row.name} variant="hero" />
        </div>
      </div>

      <div className="flex min-h-0 flex-1 flex-col gap-1.5 overflow-y-auto overscroll-contain px-3 pb-2 pt-1.5">
        <div className="flex min-w-0 items-start gap-2">
          <div className="min-w-0 flex-1">
            <p className="text-[12px] font-black leading-4 text-[#86EFAC]">
              {row.isCompleted ? TEXT.completedExercise : row.isStarted ? TEXT.active : TEXT.nextExercise}
            </p>
            <h2 className="break-words text-[20px] font-black leading-[1.02] text-[#F9FAFB]">{row.name}</h2>
            <p className="break-words text-[13px] font-semibold leading-4 text-[#D1D5DB]">{row.muscleGroup || TEXT.noMuscleGroup}</p>
            {lastHint ? <p className="mt-0.5 break-words text-[12px] font-black leading-4 text-[#86EFAC]">{lastHint}</p> : null}
          </div>
          <div className="flex shrink-0 flex-wrap justify-end gap-2">
            <TodayExerciseGuideSheet exerciseName={row.name} muscleGroup={row.muscleGroup} note={row.note} />
            <TodayExercisePicker action={startWorkoutExerciseAction} restDueAtMs={restLock?.dueAtMs ?? null} rows={rows} />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-2">
          <div className="rounded-[13px] border border-[#263241] bg-[#0B0F14] px-3 py-1.5">
            <p className="text-[11px] font-bold text-[#9CA3AF]">{TEXT.completedSets}</p>
            <p className="text-[17px] font-black leading-none text-[#F9FAFB]">
              {row.completedSets}/{row.setCount} set
            </p>
          </div>
          <div className="rounded-[13px] border border-[#263241] bg-[#0B0F14] px-3 py-1.5">
            <p className="text-[11px] font-bold text-[#9CA3AF]">{TEXT.preparing}</p>
            <p className="text-[17px] font-black leading-none text-[#F9FAFB]">Set {setNumber}</p>
          </div>
        </div>

        <div className="pb-[92px]">
          {canSubmitSet && selectedSet ? (
            <TodaySetControls
              key={selectedSet.id}
              setLogId={selectedSet.id}
              setNumber={setNumber}
              defaultWeightKg={setDefaults.weightKg}
              defaultReps={setDefaults.reps}
              restDueAtMs={restLock?.dueAtMs ?? null}
              action={saveWorkoutSetAction}
            />
          ) : row.isCompleted && reviewExercise ? (
            <TodayExerciseReviewSheet
              key={`${reviewExercise.id}-${reviewDefaultOpen ? "open" : "closed"}`}
              defaultOpen={reviewDefaultOpen}
              exercise={reviewExercise}
              triggerClassName="flex min-h-[50px] w-full items-center justify-center rounded-[16px] border border-[#374151] bg-[#0B0F14] px-4 py-2.5 text-[17px] font-black text-[#F9FAFB]"
              triggerLabel={TEXT.reviewExercise}
            />
          ) : (
            <StartExerciseButton row={row} restLock={restLock} wide />
          )}
        </div>
      </div>
    </section>
  );
}

async function getTodayPageData(params: SearchParams) {
  const user = await requireUser();
  const profile = user.gymProfile ?? (await prisma.gymProfile.findUnique({ where: { userId: user.id } }));
  const timezone = profile?.timezone || "Asia/Bangkok";
  const today = new Date();
  const nowMs = today.getTime();
  const todayDayOfWeek = getDayOfWeekInTimeZone(today, timezone);
  const todayKey = getDateKeyInTimeZone(today, timezone);

  const workoutDay = await prisma.workoutDay.findUnique({
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
  });

  const workoutLogs = await prisma.workoutLog.findMany({
    where: { userId: user.id },
    include: {
      exerciseLogs: {
        orderBy: { orderIndex: "asc" },
        include: { setLogs: { orderBy: { setIndex: "asc" } } },
      },
    },
    orderBy: { startedAt: "desc" },
  });

  const todayLog = workoutLogs.find((log) => getDateKeyInTimeZone(log.workoutDate, timezone) === todayKey) ?? null;
  const displayName = profile?.displayName || user.name || TEXT.fallbackName;
  const pageTitle = todayLabel(todayDayOfWeek, workoutDay?.title || dayLabel(todayDayOfWeek));
  const isRestDay = Boolean(workoutDay?.isRestDay);

  const rows: ExerciseRow[] =
    workoutDay?.exercises.map((entry, index) => {
      const exerciseLog =
        todayLog?.exerciseLogs.find((log) => log.catalogItemId === entry.catalogItemId && log.orderIndex === index) ?? null;
      const completedSets = exerciseLog?.setLogs.filter((setLog) => setLog.isCompleted).length ?? 0;
      const setCount = exerciseLog?.setLogs.length ?? entry.sets.length;
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
  const previousExerciseLog = activeExercise
    ? await prisma.workoutExerciseLog.findFirst({
        where: {
          id: { not: activeExercise.id },
          workoutLog: { userId: user.id },
          ...(activeExercise.catalogItemId ? { catalogItemId: activeExercise.catalogItemId } : { exerciseName: activeExercise.exerciseName }),
          setLogs: { some: { OR: [{ actualReps: { not: null } }, { actualWeightKg: { not: null } }] } },
        },
        orderBy: [{ workoutLog: { workoutDate: "desc" } }, { updatedAt: "desc" }],
        select: {
          setLogs: {
            where: { OR: [{ actualReps: { not: null } }, { actualWeightKg: { not: null } }] },
            orderBy: { setIndex: "desc" },
            select: {
              actualReps: true,
              actualWeightKg: true,
            },
            take: 1,
          },
        },
      })
    : null;
  const previousFinalSet = previousExerciseLog?.setLogs[0] ?? null;

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
  const activeRestReminder = await prisma.workoutRestReminder.findFirst({
    where: {
      userId: user.id,
      sentAt: null,
      dueAt: { gt: today },
    },
    orderBy: { dueAt: "desc" },
    select: {
      dueAt: true,
      title: true,
      body: true,
    },
  });
  const dbRestLock =
    activeRestReminder && isRestLocked(activeRestReminder.dueAt.getTime(), nowMs)
      ? {
          dueAtMs: activeRestReminder.dueAt.getTime(),
          restSeconds: Math.ceil((activeRestReminder.dueAt.getTime() - nowMs) / 1000),
          title: activeRestReminder.title,
          body: activeRestReminder.body,
        }
      : null;
  const restLock = dbRestLock && (!urlRestLock || dbRestLock.dueAtMs >= urlRestLock.dueAtMs) ? dbRestLock : urlRestLock;
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
      <div className="shrink-0 space-y-1.5">
        <div className="flex min-w-0 items-start justify-between gap-3">
          <div className="min-w-0 flex-1">
            <p className="text-[12px] font-black leading-4 text-[#86EFAC]">
              {TEXT.hello}, {displayName}
            </p>
            <h1 className="break-words text-[16px] font-black leading-[1.08] text-[#F9FAFB]">{pageTitle}</h1>
          </div>
          <div className="shrink-0 rounded-[13px] border border-[#263241] bg-[#111827] px-3 py-1 text-right">
            <p className="text-[17px] font-black leading-none text-[#F9FAFB]">
              {completedSets}/{totalSets}
            </p>
            <p className="mt-0.5 text-[10px] font-bold text-[#9CA3AF]">set</p>
          </div>
        </div>

        <ProgressCard completedSets={completedSets} restLock={restLock} totalSets={totalSets} todayLogId={todayLogId} />
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
            body={restLock?.body ?? null}
            dueAtMs={restLock?.dueAtMs ?? null}
            restSeconds={restLock?.restSeconds ?? null}
            title={restLock?.title ?? null}
            showPrompt={false}
          />
        </>
      )}
    </AppShell>
  );
}
