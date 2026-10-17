"use client";

import type { ReactNode } from "react";
import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { InstantRestBar } from "@/components/instant-rest-bar";
import { TodayCompleteExercise } from "@/components/today-complete-exercise";
import { TodaySetControls } from "@/components/today-set-controls";
import { todayOptimisticStore } from "@/lib/today-optimistic-store";
import { getNextSetToFill, getSetDisplayNumber, getSetEntryDefaults } from "@/lib/workout-today-flow";
import { EXERCISE_REST_SECONDS, SET_REST_SECONDS } from "@/lib/workout-rest";

export type LiveSetLog = {
  id: string;
  setIndex: number;
  targetReps: number | null;
  targetWeightKg: number | null;
  actualReps: number | null;
  actualWeightKg: number | null;
  isCompleted: boolean;
};

type Snapshot = { sets: LiveSetLog[]; currentId: string | null };

// Keeps the set controls and set dots of the exercise in progress in local state, so tapping "Xong set"
// moves to the next set at once while the server saves in the background. The page re-keys this
// component when the server answers, which swaps the guess for the real data.
export function TodayLiveExercise({
  completeAction,
  exerciseLogId,
  initialSelectedSetId,
  previousFinalSet,
  restEnabled,
  saveAction,
  serverRestDueAtMs,
  setLogs,
  trailing,
}: {
  completeAction: (formData: FormData) => Promise<void>;
  exerciseLogId: string;
  initialSelectedSetId: string;
  previousFinalSet: { actualWeightKg: number | null; actualReps: number | null } | null;
  restEnabled: boolean;
  saveAction: (formData: FormData) => Promise<void>;
  serverRestDueAtMs: number | null;
  setLogs: LiveSetLog[];
  trailing: ReactNode;
}) {
  const router = useRouter();
  const [sets, setSets] = useState(setLogs);
  const [currentId, setCurrentId] = useState<string | null>(initialSelectedSetId);
  const [localRest, setLocalRest] = useState<{ dueAtMs: number; totalSeconds: number } | null>(null);
  const snapshotRef = useRef<Snapshot | null>(null);

  const current = sets.find((setLog) => setLog.id === currentId) ?? getNextSetToFill(sets);
  const completedCount = sets.filter((setLog) => setLog.isCompleted).length;
  const isLastSet = completedCount + 1 >= sets.length;
  const defaults = current ? getSetEntryDefaults(current, sets, previousFinalSet) : { weightKg: null, reps: null };
  const restDueAtMs = Math.max(serverRestDueAtMs ?? 0, localRest?.dueAtMs ?? 0) || null;
  const visibleSets = Math.min(sets.length, 8);

  if (!current) {
    return null;
  }

  function handleOptimisticSubmit({ weightKg, reps }: { weightKg: number; reps: number }) {
    if (!current) {
      return;
    }

    snapshotRef.current = { sets, currentId };
    todayOptimisticStore.add(1);

    if (restEnabled) {
      const totalSeconds = isLastSet ? EXERCISE_REST_SECONDS : SET_REST_SECONDS;
      setLocalRest({ dueAtMs: Date.now() + totalSeconds * 1000, totalSeconds });
    }

    if (!isLastSet) {
      const nextSets = sets.map((setLog) =>
        setLog.id === current.id ? { ...setLog, isCompleted: true, actualWeightKg: weightKg, actualReps: reps } : setLog,
      );
      setSets(nextSets);
      setCurrentId(getNextSetToFill(nextSets)?.id ?? null);
    }
  }

  function handleFailed() {
    const snapshot = snapshotRef.current;
    snapshotRef.current = null;
    todayOptimisticStore.add(-1);
    setLocalRest(null);

    if (snapshot) {
      setSets(snapshot.sets);
      setCurrentId(snapshot.currentId);
    }

    router.refresh();
  }

  return (
    <>
      <TodaySetControls
        key={current.id}
        setLogId={current.id}
        setNumber={getSetDisplayNumber(sets, current)}
        defaultWeightKg={defaults.weightKg}
        defaultReps={defaults.reps}
        restDueAtMs={restDueAtMs}
        isLastSet={isLastSet}
        action={saveAction}
        onOptimisticSubmit={handleOptimisticSubmit}
        onFailed={handleFailed}
      />
      <TodayCompleteExercise
        key={`${exerciseLogId}-${current.id}`}
        action={completeAction}
        defaultWeightKg={defaults.weightKg}
        exerciseLogId={exerciseLogId}
        restDueAtMs={restDueAtMs}
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
          {trailing}
        </div>
      </div>
      {localRest ? <InstantRestBar dueAtMs={localRest.dueAtMs} totalSeconds={localRest.totalSeconds} /> : null}
    </>
  );
}
