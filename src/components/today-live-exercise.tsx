"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { ExerciseMediaPreview } from "@/components/exercise-media-preview";
import { InstantRestBar } from "@/components/instant-rest-bar";
import { TodayCompleteExercise } from "@/components/today-complete-exercise";
import { TodayExerciseGuideSheet } from "@/components/today-exercise-guide-sheet";
import { TodayExercisePicker, type TodayExercisePickerRow } from "@/components/today-exercise-picker";
import { TodaySetControls } from "@/components/today-set-controls";
import { getExerciseMedia } from "@/lib/exercise-media";
import { todayOptimisticStore } from "@/lib/today-optimistic-store";
import type { WorkoutNavigationResult } from "@/lib/workout-actions";
import { buildLastSetHint, EXERCISE_REST_SECONDS, SET_REST_SECONDS } from "@/lib/workout-rest";
import { getNextSetToFill, getSetDisplayNumber, getSetEntryDefaults } from "@/lib/workout-today-flow";

const TEXT = {
  active: "Đang tập",
  noMuscleGroup: "Chưa có nhóm cơ",
  noImage: "Chưa có ảnh",
};

const SMALL_BUTTON_CLASS_NAME =
  "inline-flex min-h-[36px] shrink-0 items-center justify-center rounded-full border border-[#2A2F36] bg-[#14161A] px-3 text-[12px] font-bold leading-tight text-[#B6BBC4] active:scale-[0.98]";

export type LiveSetLog = {
  id: string;
  setIndex: number;
  targetReps: number | null;
  targetWeightKg: number | null;
  actualReps: number | null;
  actualWeightKg: number | null;
  isCompleted: boolean;
};

export type LiveExercise = {
  id: string;
  name: string;
  muscleGroup: string | null;
  imageUrl: string | null;
  animationUrl: string | null;
  note: string | null;
  setLogs: LiveSetLog[];
  previousFinalSet: { actualWeightKg: number | null; actualReps: number | null } | null;
};

type Snapshot = { activeIndex: number; setsByExercise: LiveSetLog[][]; currentSetId: string | null };

function completeSets(sets: LiveSetLog[], weightKg: number | null) {
  return sets.map((setLog) => ({
    ...setLog,
    isCompleted: true,
    actualWeightKg: weightKg ?? setLog.actualWeightKg,
  }));
}

// The whole in-progress exercise card lives in local state, so "Xong set" / "Xong cả bài" move on to the next
// set or the next exercise at once while the server saves in the background. The page re-keys this component
// when the server answers, which swaps the guess for the real data.
export function TodayLiveExercise({
  completeAction,
  exercises,
  initialSelectedSetId,
  pickerRows,
  restEnabled,
  saveAction,
  serverRestDueAtMs,
  startAction,
}: {
  completeAction: (formData: FormData) => Promise<void>;
  exercises: LiveExercise[];
  initialSelectedSetId: string;
  pickerRows: TodayExercisePickerRow[];
  restEnabled: boolean;
  saveAction: (formData: FormData) => Promise<void>;
  serverRestDueAtMs: number | null;
  startAction: (formData: FormData) => Promise<WorkoutNavigationResult>;
}) {
  const router = useRouter();
  const [activeIndex, setActiveIndex] = useState(0);
  const [setsByExercise, setSetsByExercise] = useState(() => exercises.map((exercise) => exercise.setLogs));
  const [currentSetId, setCurrentSetId] = useState<string | null>(initialSelectedSetId);
  const [localRest, setLocalRest] = useState<{ dueAtMs: number; totalSeconds: number } | null>(null);
  const snapshotRef = useRef<Snapshot | null>(null);

  const exercise = exercises[activeIndex];
  const sets = setsByExercise[activeIndex];
  const nextExercise = exercises[activeIndex + 1] ?? null;
  const current = sets.find((setLog) => setLog.id === currentSetId) ?? getNextSetToFill(sets);
  const completedCount = sets.filter((setLog) => setLog.isCompleted).length;
  const isLastSet = completedCount + 1 >= sets.length;
  const defaults = current ? getSetEntryDefaults(current, sets, exercise.previousFinalSet) : { weightKg: null, reps: null };
  const restDueAtMs = Math.max(serverRestDueAtMs ?? 0, localRest?.dueAtMs ?? 0) || null;
  const visibleSets = Math.min(sets.length, 8);
  const lastHint = buildLastSetHint(exercise.previousFinalSet);
  const media = getExerciseMedia(exercise, "workout");

  if (!current) {
    return null;
  }

  function startRest(totalSeconds: number) {
    if (restEnabled) {
      setLocalRest({ dueAtMs: Date.now() + totalSeconds * 1000, totalSeconds });
    }
  }

  function moveToNextExercise(nextSets: LiveSetLog[][]) {
    if (!nextExercise) {
      return;
    }

    setSetsByExercise(nextSets);
    setActiveIndex(activeIndex + 1);
    setCurrentSetId(getNextSetToFill(nextSets[activeIndex + 1])?.id ?? null);
  }

  function remember() {
    snapshotRef.current = { activeIndex, setsByExercise, currentSetId };
  }

  function handleSetSubmit({ weightKg, reps }: { weightKg: number; reps: number }) {
    if (!current) {
      return;
    }

    remember();
    todayOptimisticStore.add(1);
    startRest(isLastSet ? EXERCISE_REST_SECONDS : SET_REST_SECONDS);

    const nextSets = setsByExercise.map((exerciseSets, index) =>
      index === activeIndex
        ? exerciseSets.map((setLog) =>
            setLog.id === current.id ? { ...setLog, isCompleted: true, actualWeightKg: weightKg, actualReps: reps } : setLog,
          )
        : exerciseSets,
    );

    if (!isLastSet) {
      setSetsByExercise(nextSets);
      setCurrentSetId(getNextSetToFill(nextSets[activeIndex])?.id ?? null);
      return;
    }

    moveToNextExercise(nextSets);
  }

  function handleCompleteSubmit({ weightKg }: { weightKg: number }) {
    remember();
    todayOptimisticStore.add(sets.length - completedCount);
    startRest(EXERCISE_REST_SECONDS);
    moveToNextExercise(
      setsByExercise.map((exerciseSets, index) => (index === activeIndex ? completeSets(exerciseSets, weightKg) : exerciseSets)),
    );
  }

  function handleFailed() {
    const snapshot = snapshotRef.current;
    snapshotRef.current = null;
    setLocalRest(null);

    if (snapshot) {
      todayOptimisticStore.reset();
      setActiveIndex(snapshot.activeIndex);
      setSetsByExercise(snapshot.setsByExercise);
      setCurrentSetId(snapshot.currentSetId);
    }

    router.refresh();
  }

  return (
    <section className="flex min-h-0 flex-1 flex-col overflow-hidden rounded-[20px] border border-[#1F2329] bg-[#14161A] ">
      <div className="shrink-0 p-1.5 pb-0">
        <div className="h-[clamp(150px,24svh,190px)] overflow-hidden rounded-[15px] border border-[#1F2329] bg-black [@media(min-height:760px)]:h-[clamp(190px,29svh,250px)] [@media(min-height:860px)]:h-[clamp(230px,32svh,310px)]">
          <ExerciseMediaPreview
            key={exercise.id}
            media={media}
            alt={exercise.name}
            width={720}
            height={420}
            imageClassName="h-full w-full object-cover"
            placeholderClassName="flex h-full w-full items-center justify-center rounded-[16px] bg-[#0A0B0D] text-[15px] font-bold text-[#8B919B]"
            placeholderLabel={TEXT.noImage}
            buttonClassName="block h-full w-full rounded-[16px] bg-black"
            sizes="(max-width: 480px) 100vw, 480px"
            priority
          />
        </div>
      </div>

      <div className="flex min-h-0 flex-1 flex-col gap-1.5 overflow-y-auto overscroll-contain px-3 pb-2 pt-1.5">
        <div className="flex min-w-0 items-start gap-2">
          <div className="min-w-0 flex-1">
            <p className="text-[12px] font-black leading-4 text-[#C8F31D]">{TEXT.active}</p>
            <h2 className="break-words text-[20px] font-black leading-[1.02] text-[#F9FAFB]">{exercise.name}</h2>
            <p className="break-words text-[13px] font-semibold leading-4 text-[#D1D5DB]">{exercise.muscleGroup || TEXT.noMuscleGroup}</p>
            {lastHint ? <p className="mt-0.5 break-words text-[12px] font-black leading-4 text-[#C8F31D]">{lastHint}</p> : null}
          </div>
        </div>

        <TodaySetControls
          key={current.id}
          setLogId={current.id}
          setNumber={getSetDisplayNumber(sets, current)}
          defaultWeightKg={defaults.weightKg}
          defaultReps={defaults.reps}
          restDueAtMs={restDueAtMs}
          isLastSet={isLastSet}
          action={saveAction}
          onOptimisticSubmit={handleSetSubmit}
          onFailed={handleFailed}
        />
        <TodayCompleteExercise
          key={`${exercise.id}-${current.id}`}
          action={completeAction}
          defaultWeightKg={defaults.weightKg}
          exerciseLogId={exercise.id}
          restDueAtMs={restDueAtMs}
          onOptimisticSubmit={handleCompleteSubmit}
          onFailed={handleFailed}
        />
        <div className="pb-[92px]">
          <div className="flex items-center gap-1.5">
            <span className="mr-0.5 text-[12px] font-bold text-[#8B919B]">Set</span>
            {Array.from({ length: visibleSets }, (_, index) => {
              const done = index < completedCount;
              const isCurrent = index === completedCount;

              return (
                <span
                  key={index}
                  className={`flex h-7 min-w-[28px] items-center justify-center rounded-full border px-2 text-[12px] font-black ${
                    done
                      ? "border-[#C8F31D] bg-[#C8F31D] text-[#0A0B0D]"
                      : isCurrent
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
                exerciseName={exercise.name}
                muscleGroup={exercise.muscleGroup}
                note={exercise.note}
                triggerClassName={SMALL_BUTTON_CLASS_NAME}
              />
              <TodayExercisePicker
                action={startAction}
                restDueAtMs={restDueAtMs}
                rows={pickerRows}
                triggerClassName={SMALL_BUTTON_CLASS_NAME}
              />
            </div>
          </div>
        </div>
      </div>
      {localRest ? <InstantRestBar dueAtMs={localRest.dueAtMs} totalSeconds={localRest.totalSeconds} /> : null}
    </section>
  );
}
