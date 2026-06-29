import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/auth";
import { dayLabel, getDateKeyInTimeZone, getDayOfWeekInTimeZone, todayLabel } from "@/lib/date";
import { AppButton, AppCard, AppInput, EmptyState } from "@/components/ui";
import { AppShell } from "@/components/app-shell";
import { ExerciseMediaPreview } from "@/components/exercise-media-preview";
import { WorkoutRestTimer } from "@/components/workout-rest-timer";
import { finishWorkoutAction, saveWorkoutSetAction, startWorkoutExerciseAction } from "@/lib/workout-actions";
import { buildLastSetHint } from "@/lib/workout-rest";
import { getExerciseMedia, type ExerciseMediaContext } from "@/lib/exercise-media";

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

function getExerciseStatus(row: ExerciseRow) {
  if (row.isCompleted) {
    return { label: "Xong", className: "border-[#22C55E]/40 bg-[#12301f] text-[#86EFAC]", cta: "Xem" };
  }

  if (row.isStarted) {
    return { label: "Đang tập", className: "border-[#38BDF8]/40 bg-[#082f49] text-[#7DD3FC]", cta: "Tiếp tục" };
  }

  return { label: "Chưa tập", className: "border-[#4B5563] bg-[#1F2937] text-[#D1D5DB]", cta: "Tập" };
}

function ExerciseImage({
  exercise,
  alt,
  size = "normal",
  context = "list",
}: {
  exercise: { imageUrl?: string | null; animationUrl?: string | null };
  alt: string;
  size?: "normal" | "large";
  context?: ExerciseMediaContext;
}) {
  const className = size === "large" ? "h-16 w-16" : "h-12 w-12";
  const media = getExerciseMedia(exercise, context);

  return (
    <ExerciseMediaPreview
      media={media}
      alt={alt}
      width={96}
      height={96}
      imageClassName={`${className} shrink-0 rounded-[14px] object-cover`}
      placeholderClassName={`${className} flex shrink-0 items-center justify-center rounded-[14px] bg-[#1F2937] text-[11px] font-bold text-[#9CA3AF]`}
      placeholderLabel="Ảnh"
      buttonClassName="shrink-0 rounded-[14px]"
      sizes="96px"
    />
  );
}

function StartExerciseButton({ row, wide = false }: { row: ExerciseRow; wide?: boolean }) {
  const status = getExerciseStatus(row);
  const className = `inline-flex min-h-[44px] items-center justify-center rounded-[14px] px-4 py-2 text-[15px] font-bold transition active:scale-[0.98] ${
    row.isCompleted
      ? "border border-[#374151] bg-[#111827] text-[#F9FAFB]"
      : row.isStarted
        ? "bg-[#38BDF8] text-[#0B0F14]"
        : "bg-[#22C55E] text-white"
  } ${wide ? "w-full" : "w-[92px] shrink-0"}`;

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

function FocusExerciseCard({ row }: { row: ExerciseRow }) {
  const status = getExerciseStatus(row);
  const title = row.isStarted && !row.isCompleted ? "Đang tập" : row.isCompleted ? "Bài đã xong" : "Bài tiếp theo";

  return (
    <AppCard className="space-y-4 border-[#22C55E]/50 bg-[#0F1F18]">
      <div className="flex min-w-0 items-start gap-3">
        <ExerciseImage exercise={row} alt={row.name} size="large" context="workout" />
        <div className="min-w-0 flex-1">
          <p className="text-[14px] font-bold text-[#86EFAC]">{title}</p>
          <h2 className="mt-1 line-clamp-2 text-[22px] font-bold leading-tight text-[#F9FAFB]">{row.name}</h2>
          <p className="mt-1 text-[15px] leading-5 text-[#D1D5DB]">{row.muscleGroup || "Chưa có nhóm cơ"}</p>
        </div>
      </div>
      <div className="grid grid-cols-[1fr_auto] items-center gap-3">
        <div className="min-w-0">
          <p className="text-[15px] font-bold text-[#F9FAFB]">
            {row.completedSets}/{row.setCount} set
          </p>
          <p className="mt-1 text-[13px] text-[#9CA3AF]">
            Tạ gợi ý: {row.currentWeightKg ?? 0} kg
          </p>
        </div>
        <span className={`rounded-full border px-3 py-2 text-[13px] font-bold ${status.className}`}>{status.label}</span>
      </div>
      <StartExerciseButton row={row} wide />
    </AppCard>
  );
}

function ExerciseListRow({ row }: { row: ExerciseRow }) {
  const status = getExerciseStatus(row);

  return (
    <div className="flex min-w-0 items-center gap-3 rounded-[16px] border border-[#263241] bg-[#111827] p-3">
      <ExerciseImage exercise={row} alt={row.name} />
      <div className="min-w-0 flex-1">
        <div className="flex min-w-0 items-center gap-2">
          <h3 className="min-w-0 flex-1 truncate text-[17px] font-bold text-[#F9FAFB]">{row.name}</h3>
          <span className={`shrink-0 rounded-full border px-2.5 py-1 text-[12px] font-bold ${status.className}`}>{status.label}</span>
        </div>
        <p className="mt-1 truncate text-[14px] text-[#9CA3AF]">{row.muscleGroup || "Chưa có nhóm cơ"}</p>
        <p className="mt-1 text-[13px] font-semibold text-[#D1D5DB]">
          {row.completedSets}/{row.setCount} set
        </p>
      </div>
      <StartExerciseButton row={row} />
    </div>
  );
}

function SetPickerModal({
  exercise,
  selectedSetId,
}: {
  exercise: {
    id: string;
    exerciseName: string;
    muscleGroup: string | null;
    imageUrl: string | null;
    animationUrl: string | null;
    setLogs: Array<{
      id: string;
      setIndex: number;
      intensityPercent: number | null;
      targetReps: number | null;
      targetWeightKg: number | null;
      actualReps: number | null;
      actualWeightKg: number | null;
      note: string | null;
      isCompleted: boolean;
      lastHint?: string | null;
      lastActualReps?: number | null;
      lastActualWeightKg?: number | null;
    }>;
  };
  selectedSetId?: string;
}) {
  const selectedSetIndex = exercise.setLogs.findIndex((setLog) => setLog.id === selectedSetId);
  const selectedSet = selectedSetIndex >= 0 ? exercise.setLogs[selectedSetIndex] : null;
  const completedSets = exercise.setLogs.filter((setLog) => setLog.isCompleted).length;

  return (
    <div className="fixed inset-0 z-40 flex items-end justify-center bg-black/70 px-3 pb-[calc(12px+env(safe-area-inset-bottom))] pt-[calc(18px+env(safe-area-inset-top))] sm:items-center">
      <div className="w-full max-w-[480px] rounded-[22px] border border-[#374151] bg-[#0B0F14] shadow-2xl">
        <div className="flex min-w-0 items-start gap-3 border-b border-[#263241] p-4">
          <ExerciseImage exercise={exercise} alt={exercise.exerciseName} size="large" context="workout" />
          <div className="min-w-0 flex-1">
            <h2 className="line-clamp-2 text-[22px] font-bold leading-tight text-[#F9FAFB]">{exercise.exerciseName}</h2>
            <p className="mt-1 text-[15px] text-[#9CA3AF]">{exercise.muscleGroup || "Chưa có nhóm cơ"}</p>
            <p className="mt-2 text-[14px] font-bold text-[#86EFAC]">
              {completedSets}/{exercise.setLogs.length} set xong
            </p>
          </div>
          <Link
            href="/today"
            className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full border border-[#374151] bg-[#111827] text-[20px] font-bold text-[#F9FAFB]"
            aria-label="Đóng"
          >
            ×
          </Link>
        </div>

        <div className="max-h-[70dvh] space-y-4 overflow-y-auto p-4">
          <div className="grid grid-cols-2 gap-2">
            {exercise.setLogs.map((setLog, index) => (
              <Link
                key={setLog.id}
                href={`/today?exercise=${exercise.id}&set=${setLog.id}`}
                className={`min-h-[58px] rounded-[14px] border px-3 py-2 text-left transition active:scale-[0.98] ${
                  setLog.id === selectedSet?.id
                    ? "border-[#38BDF8] bg-[#082f49]"
                    : setLog.isCompleted
                      ? "border-[#22C55E]/50 bg-[#12301f]"
                      : "border-[#374151] bg-[#111827]"
                }`}
              >
                <span className="block text-[16px] font-bold text-[#F9FAFB]">Set {index + 1}</span>
                <span className="mt-1 block text-[13px] font-semibold text-[#D1D5DB]">
                  {setLog.isCompleted ? "Đã xong" : "Chưa nhập"}
                </span>
                {setLog.lastHint ? <span className="mt-1 block text-[12px] leading-4 text-[#86EFAC]">{setLog.lastHint}</span> : null}
              </Link>
            ))}
          </div>

          {selectedSet ? (
            <form action={saveWorkoutSetAction} className="space-y-4 rounded-[18px] border border-[#38BDF8]/50 bg-[#101B27] p-4">
              <input type="hidden" name="setLogId" value={selectedSet.id} />
              <div>
                <h3 className="text-[20px] font-bold text-[#F9FAFB]">Set {selectedSetIndex + 1}</h3>
                <p className="mt-1 text-[14px] leading-5 text-[#D1D5DB]">
                  Mục tiêu: {selectedSet.targetReps ?? 0} lần, {selectedSet.targetWeightKg ?? 0} kg
                </p>
                {selectedSet.lastHint ? <p className="mt-2 rounded-[12px] bg-[#0B0F14] p-2 text-[14px] font-bold text-[#86EFAC]">{selectedSet.lastHint}</p> : null}
              </div>
              <div className="grid grid-cols-2 gap-3">
                <label className="min-w-0 space-y-1">
                  <span className="text-[14px] font-bold text-[#D1D5DB]">Nhập tạ</span>
                  <AppInput
                    type="number"
                    step="0.5"
                    name="actualWeightKg"
                    defaultValue={selectedSet.actualWeightKg ?? ""}
                    placeholder={selectedSet.lastActualWeightKg ? String(selectedSet.lastActualWeightKg) : "40"}
                    inputMode="decimal"
                  />
                </label>
                <label className="min-w-0 space-y-1">
                  <span className="text-[14px] font-bold text-[#D1D5DB]">Số lần</span>
                  <AppInput
                    type="number"
                    name="actualReps"
                    defaultValue={selectedSet.actualReps ?? ""}
                    placeholder={selectedSet.lastActualReps ? String(selectedSet.lastActualReps) : "10"}
                    inputMode="numeric"
                  />
                </label>
              </div>
              <label className="block space-y-1">
                <span className="text-[14px] font-bold text-[#D1D5DB]">Ghi chú</span>
                <AppInput name="note" defaultValue={selectedSet.note ?? ""} placeholder="Ví dụ: hơi nặng" />
              </label>
              <label className="flex min-h-[52px] items-center gap-3 rounded-[14px] border border-[#374151] bg-[#0B0F14] px-3 text-[16px] font-bold text-[#F9FAFB]">
                <input type="checkbox" name="isCompleted" defaultChecked={selectedSet.isCompleted} className="h-6 w-6 accent-[#22C55E]" />
                Set này đã xong
              </label>
              <AppButton className="w-full bg-[#38BDF8] text-[#0B0F14] hover:bg-[#0ea5e9]">Lưu set</AppButton>
            </form>
          ) : (
            <p className="rounded-[14px] border border-[#374151] bg-[#111827] p-3 text-[15px] leading-6 text-[#D1D5DB]">
              Chọn set cần nhập. Bạn có thể nhập set nào trước cũng được.
            </p>
          )}

          <Link
            href="/today"
            className="flex min-h-[48px] w-full items-center justify-center rounded-[14px] border border-[#374151] bg-[#111827] px-4 py-3 text-[15px] font-bold text-[#F9FAFB]"
          >
            Để sau
          </Link>
        </div>
      </div>
    </div>
  );
}

export default async function TodayPage({ searchParams }: { searchParams?: Promise<SearchParams> }) {
  const params = (await searchParams) ?? {};
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
  const displayName = profile?.displayName || user.name || "bạn";
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
  const activeRow = rows.find((row) => row.isStarted && !row.isCompleted) ?? rows.find((row) => !row.isCompleted) ?? rows[0] ?? null;
  const activeExercise = todayLog?.exerciseLogs.find((exercise) => exercise.id === params.exercise) ?? null;
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

  return (
    <AppShell>
      <div className="space-y-3">
        <div className="min-w-0">
          <p className="text-[15px] font-bold text-[#86EFAC]">Xin chào, {displayName}</p>
          <h1 className="mt-1 text-[24px] font-bold leading-tight text-[#F9FAFB]">{pageTitle}</h1>
        </div>

        <AppCard className="p-3">
          <div className="flex items-center justify-between gap-3">
            <div className="min-w-0">
              <p className="text-[14px] font-bold text-[#9CA3AF]">Hôm nay</p>
              <p className="mt-1 text-[28px] font-bold text-[#F9FAFB]">
                {completedSets}/{totalSets} set
              </p>
            </div>
            {todayLog && totalSets > 0 && completedSets === totalSets ? (
              <form action={finishWorkoutAction} className="shrink-0">
                <input type="hidden" name="workoutLogId" value={todayLog.id} />
                <button className="min-h-[44px] rounded-[14px] bg-[#22C55E] px-4 py-2 text-[15px] font-bold text-white">Hoàn thành</button>
              </form>
            ) : (
              <p className="max-w-[150px] text-right text-[14px] leading-5 text-[#D1D5DB]">Chọn bài muốn tập trước</p>
            )}
          </div>
        </AppCard>
      </div>

      <WorkoutRestTimer />

      {!workoutDay ? (
        <EmptyState
          title="Chưa có lịch hôm nay"
          description="Mở lịch tập để chọn bài cho hôm nay."
          actionHref="/schedule"
          actionLabel="Mở lịch tập"
        />
      ) : isRestDay ? (
        <EmptyState title="Hôm nay nghỉ" description="Nghỉ ngơi và chuẩn bị cho buổi tập tiếp theo." />
      ) : rows.length === 0 ? (
        <EmptyState title="Chưa có bài tập" description="Mở lịch tập để thêm bài cho hôm nay." actionHref="/schedule" actionLabel="Chỉnh lịch" />
      ) : (
        <>
          {activeRow ? <FocusExerciseCard row={activeRow} /> : null}

          <section className="space-y-2">
            <div className="flex items-center justify-between">
              <h2 className="text-[18px] font-bold text-[#F9FAFB]">Các bài hôm nay</h2>
              <span className="text-[14px] font-bold text-[#9CA3AF]">
                {rows.filter((row) => row.isCompleted).length}/{rows.length} bài
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

      {activeExerciseWithHistory ? <SetPickerModal exercise={activeExerciseWithHistory} selectedSetId={params.set} /> : null}
    </AppShell>
  );
}
