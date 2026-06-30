import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/auth";
import { dayLabel, getDateKeyInTimeZone, getDayOfWeekInTimeZone, todayLabel } from "@/lib/date";
import { AppCard, EmptyState } from "@/components/ui";
import { AppShell } from "@/components/app-shell";
import { ExerciseMediaPreview } from "@/components/exercise-media-preview";
import { TodaySetControls } from "@/components/today-set-controls";
import { WorkoutRestTimer } from "@/components/workout-rest-timer";
import { finishWorkoutAction, saveWorkoutSetAction, startWorkoutExerciseAction } from "@/lib/workout-actions";
import { buildLastSetHint } from "@/lib/workout-rest";
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
  completedExercise: "B\u00e0i \u0111\u00e3 xong",
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
  set?: string;
};

type ExerciseRow = {
  workoutDayExerciseId: string;
  exerciseLogId: string | null;
  name: string;
  muscleGroup: string | null;
  imageUrl: string | null;
  animationUrl: string | null;
  currentWeightKg: number | null;
  setCount: number;
  completedSets: number;
  isStarted: boolean;
  isCompleted: boolean;
};

type ActiveExercise = NonNullable<Awaited<ReturnType<typeof getTodayPageData>>["activeExerciseWithHistory"]>;
type ActiveSet = ActiveExercise["setLogs"][number];

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
        placeholderClassName="flex aspect-video w-full items-center justify-center rounded-[18px] bg-[#0B0F14] text-[15px] font-bold text-[#9CA3AF]"
        placeholderLabel={TEXT.noImage}
        buttonClassName="block aspect-video w-full rounded-[18px] bg-black"
        sizes="(max-width: 480px) 100vw, 480px"
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

function StartExerciseButton({ row, wide = false }: { row: ExerciseRow; wide?: boolean }) {
  const status = getExerciseStatus(row);
  const className = `inline-flex min-h-[48px] items-center justify-center rounded-[14px] px-4 py-2 text-[15px] font-black transition active:scale-[0.98] ${
    row.isCompleted
      ? "border border-[#374151] bg-[#111827] text-[#F9FAFB]"
      : row.isStarted
        ? "bg-[#38BDF8] text-[#0B0F14]"
        : "bg-[#22C55E] text-white"
  } ${wide ? "w-full" : "w-[82px] shrink-0"}`;

  if (row.exerciseLogId && (row.isStarted || row.isCompleted)) {
    return (
      <Link href={`/today?exercise=${row.exerciseLogId}`} className={className}>
        {status.cta}
      </Link>
    );
  }

  return (
    <form action={startWorkoutExerciseAction} className={wide ? "w-full" : "shrink-0"}>
      <input type="hidden" name="workoutDayExerciseId" value={row.workoutDayExerciseId} />
      <button className={className}>{status.cta}</button>
    </form>
  );
}

function ProgressCard({
  completedSets,
  totalSets,
  todayLogId,
}: {
  completedSets: number;
  totalSets: number;
  todayLogId: string | null;
}) {
  const percent = totalSets > 0 ? Math.round((completedSets / totalSets) * 100) : 0;

  return (
    <AppCard className="border-[#263241] bg-[#111827] p-3">
      <div className="flex items-center justify-between gap-3">
        <div className="min-w-0">
          <p className="text-[13px] font-bold text-[#9CA3AF]">{TEXT.today}</p>
          <p className="mt-1 text-[32px] font-black leading-none text-[#F9FAFB]">
            {completedSets}/{totalSets} set
          </p>
        </div>
        {todayLogId && totalSets > 0 && completedSets === totalSets ? (
          <form action={finishWorkoutAction} className="shrink-0">
            <input type="hidden" name="workoutLogId" value={todayLogId} />
            <button className="min-h-[50px] rounded-[16px] bg-[#22C55E] px-5 py-2 text-[15px] font-black text-white active:scale-[0.98]">
              {TEXT.finish}
            </button>
          </form>
        ) : (
          <div className="shrink-0 rounded-[16px] border border-[#263241] bg-[#0B0F14] px-3 py-2 text-right">
            <p className="text-[22px] font-black text-[#38BDF8]">{percent}%</p>
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
  selectedSet,
  setDefaults,
}: {
  row: ExerciseRow;
  exercise: ActiveExercise | null;
  selectedSet: ActiveSet | null;
  setDefaults: { weightKg: number | null; reps: number | null };
}) {
  const status = getExerciseStatus(row);
  const setNumber =
    selectedSet && exercise ? getSetDisplayNumber(exercise.setLogs, selectedSet) : Math.min(row.completedSets + 1, row.setCount || 1);
  const canSubmitSet = Boolean(exercise?.startedAt && selectedSet && !row.isCompleted);

  return (
    <section className="overflow-hidden rounded-[22px] border border-[#263241] bg-[#111827] shadow-[0_18px_40px_rgba(0,0,0,0.24)]">
      <div className="p-3">
        <div className="overflow-hidden rounded-[18px] border border-[#263241] bg-black">
          <ExerciseMediaFrame exercise={row} alt={row.name} variant="hero" />
        </div>
      </div>

      <div className="space-y-3 px-4 pb-4">
        <div className="flex min-w-0 items-start gap-3">
          <div className="min-w-0 flex-1">
            <p className="text-[14px] font-black text-[#86EFAC]">
              {row.isCompleted ? TEXT.completedExercise : row.isStarted ? TEXT.active : TEXT.nextExercise}
            </p>
            <h2 className="mt-1 break-words text-[24px] font-black leading-tight text-[#F9FAFB]">{row.name}</h2>
            <p className="mt-1 break-words text-[15px] font-semibold leading-5 text-[#D1D5DB]">{row.muscleGroup || TEXT.noMuscleGroup}</p>
          </div>
          <span className={`shrink-0 rounded-full border px-3 py-2 text-[13px] font-black ${status.className}`}>{status.label}</span>
        </div>

        <div className="grid grid-cols-2 gap-2">
          <div className="rounded-[16px] border border-[#263241] bg-[#0B0F14] px-3 py-2">
            <p className="text-[12px] font-bold text-[#9CA3AF]">Set</p>
            <p className="mt-1 text-[19px] font-black text-[#F9FAFB]">
              {row.completedSets}/{row.setCount}
            </p>
          </div>
          <div className="rounded-[16px] border border-[#263241] bg-[#0B0F14] px-3 py-2">
            <p className="text-[12px] font-bold text-[#9CA3AF]">{TEXT.preparing}</p>
            <p className="mt-1 text-[19px] font-black text-[#F9FAFB]">Set {setNumber}</p>
          </div>
        </div>

        {selectedSet?.lastHint ? <p className="rounded-[14px] bg-[#0B0F14] px-3 py-2 text-[14px] font-bold leading-5 text-[#86EFAC]">{selectedSet.lastHint}</p> : null}

        {canSubmitSet && selectedSet ? (
          <TodaySetControls
            setLogId={selectedSet.id}
            setNumber={setNumber}
            defaultWeightKg={setDefaults.weightKg}
            defaultReps={setDefaults.reps}
            action={saveWorkoutSetAction}
          />
        ) : row.isCompleted ? (
          <Link
            href={row.exerciseLogId ? `/today?exercise=${row.exerciseLogId}` : "/today"}
            className="flex min-h-[54px] w-full items-center justify-center rounded-[16px] border border-[#374151] bg-[#0B0F14] px-4 py-3 text-[17px] font-black text-[#F9FAFB]"
          >
            {TEXT.reviewExercise}
          </Link>
        ) : (
          <StartExerciseButton row={row} wide />
        )}
      </div>
    </section>
  );
}

function ExerciseListRow({ row }: { row: ExerciseRow }) {
  const status = getExerciseStatus(row);

  return (
    <div className="grid min-w-0 grid-cols-[92px_1fr_auto] items-center gap-3 rounded-[18px] border border-[#263241] bg-[#111827] p-3">
      <ExerciseMediaFrame exercise={row} alt={row.name} />
      <div className="min-w-0">
        <div className="flex min-w-0 flex-wrap items-center gap-2">
          <h3 className="min-w-0 break-words text-[17px] font-black leading-5 text-[#F9FAFB]">{row.name}</h3>
          <span className={`shrink-0 rounded-full border px-2.5 py-1 text-[12px] font-black ${status.className}`}>{status.label}</span>
        </div>
        <p className="mt-1 break-words text-[14px] font-semibold leading-5 text-[#9CA3AF]">{row.muscleGroup || TEXT.noMuscleGroup}</p>
        <p className="mt-1 text-[13px] font-bold text-[#D1D5DB]">
          {row.completedSets}/{row.setCount} set
        </p>
      </div>
      <StartExerciseButton row={row} />
    </div>
  );
}

async function getTodayPageData(params: SearchParams) {
  const user = await requireUser();
  const profile = user.gymProfile ?? (await prisma.gymProfile.findUnique({ where: { userId: user.id } }));
  const timezone = profile?.timezone || "Asia/Bangkok";
  const today = new Date();
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
  const previousSetLogs = activeExercise
    ? await prisma.workoutSetLog.findMany({
        where: {
          workoutExerciseLogId: { not: activeExercise.id },
          OR: [{ actualReps: { not: null } }, { actualWeightKg: { not: null } }],
          workoutExerciseLog: {
            workoutLog: { userId: user.id },
            ...(activeExercise.catalogItemId ? { catalogItemId: activeExercise.catalogItemId } : { exerciseName: activeExercise.exerciseName }),
          },
        },
        orderBy: [{ completedAt: "desc" }, { updatedAt: "desc" }],
        select: {
          setIndex: true,
          actualReps: true,
          actualWeightKg: true,
        },
        take: 50,
      })
    : [];
  const lastSetByIndex = new Map<number, (typeof previousSetLogs)[number]>();

  for (const previousSet of previousSetLogs) {
    if (!lastSetByIndex.has(previousSet.setIndex)) {
      lastSetByIndex.set(previousSet.setIndex, previousSet);
    }
  }

  const activeExerciseWithHistory = activeExercise
    ? {
        ...activeExercise,
        setLogs: activeExercise.setLogs.map((setLog) => {
          const lastSet = lastSetByIndex.get(setLog.setIndex) ?? null;

          return {
            ...setLog,
            lastHint: buildLastSetHint(lastSet),
            lastActualReps: lastSet?.actualReps ?? null,
            lastActualWeightKg: lastSet?.actualWeightKg ?? null,
          };
        }),
      }
    : null;

  const selectedSet = activeExerciseWithHistory ? getSelectedSetToFill(activeExerciseWithHistory.setLogs, params.set) : null;
  const selectedPreviousSet = selectedSet ? lastSetByIndex.get(selectedSet.setIndex) ?? null : null;
  const setDefaults = selectedSet ? getSetEntryDefaults(selectedSet, activeExerciseWithHistory?.setLogs ?? [], selectedPreviousSet) : { weightKg: null, reps: null };

  return {
    activeExerciseWithHistory,
    activeRow,
    completedSets,
    displayName,
    isRestDay,
    pageTitle,
    rows,
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
    selectedSet,
    setDefaults,
    todayLogId,
    totalSets,
    workoutDay,
  } = await getTodayPageData(params);

  return (
    <AppShell>
      <div className="space-y-3">
        <div className="min-w-0">
          <p className="text-[15px] font-black text-[#86EFAC]">
            {TEXT.hello}, {displayName}
          </p>
          <h1 className="mt-1 break-words text-[25px] font-black leading-tight text-[#F9FAFB]">{pageTitle}</h1>
        </div>

        <ProgressCard completedSets={completedSets} totalSets={totalSets} todayLogId={todayLogId} />
      </div>

      {!workoutDay ? (
        <EmptyState
          title={TEXT.noScheduleTitle}
          description={TEXT.chooseSchedule}
          actionHref="/schedule"
          actionLabel={TEXT.openSchedule}
        />
      ) : isRestDay ? (
        <EmptyState title={TEXT.restTitle} description={TEXT.restDescription} />
      ) : rows.length === 0 ? (
        <EmptyState title={TEXT.noExerciseTitle} description={TEXT.addExercise} actionHref="/schedule" actionLabel={TEXT.editSchedule} />
      ) : (
        <>
          {activeRow ? (
            <CurrentExerciseCard
              row={activeRow}
              exercise={activeExerciseWithHistory}
              selectedSet={selectedSet}
              setDefaults={setDefaults}
            />
          ) : null}

          <WorkoutRestTimer />

          <section className="space-y-2">
            <div className="flex items-center justify-between gap-3">
              <h2 className="text-[19px] font-black text-[#F9FAFB]">{TEXT.todayExercises}</h2>
              <span className="shrink-0 text-[14px] font-black text-[#9CA3AF]">
                {rows.filter((row) => row.isCompleted).length}/{rows.length} {TEXT.exerciseUnit}
              </span>
            </div>
            <div className="space-y-2">
              {rows.map((row) => (
                <ExerciseListRow key={row.workoutDayExerciseId} row={row} />
              ))}
            </div>
          </section>
        </>
      )}
    </AppShell>
  );
}
