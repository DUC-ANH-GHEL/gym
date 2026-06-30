type SetLike = {
  id: string;
  setIndex: number;
  isCompleted: boolean;
  actualWeightKg?: number | null;
  actualReps?: number | null;
  targetWeightKg?: number | null;
  targetReps?: number | null;
};

type ExerciseLike = {
  id: string;
  orderIndex: number;
  isCompleted: boolean;
};

type PreviousSetLike = {
  actualWeightKg: number | null;
  actualReps: number | null;
} | null;

export function getNextSetToFill<TSet extends SetLike>(setLogs: TSet[]) {
  return setLogs.find((setLog) => !setLog.isCompleted) ?? setLogs[setLogs.length - 1] ?? null;
}

export function getSetEntryDefaults(currentSet: SetLike, setLogs: SetLike[], previousSet: PreviousSetLike) {
  const previousInThisExercise =
    [...setLogs]
      .filter((setLog) => setLog.setIndex < currentSet.setIndex && setLog.isCompleted)
      .sort((a, b) => b.setIndex - a.setIndex)[0] ?? null;

  return {
    weightKg:
      currentSet.actualWeightKg ??
      previousInThisExercise?.actualWeightKg ??
      previousSet?.actualWeightKg ??
      currentSet.targetWeightKg ??
      null,
    reps: currentSet.actualReps ?? previousInThisExercise?.actualReps ?? previousSet?.actualReps ?? currentSet.targetReps ?? null,
  };
}

export function getNextExerciseAfterSetSave<TExercise extends ExerciseLike>(exercises: TExercise[], currentExercise: TExercise) {
  if (!currentExercise.isCompleted) {
    return currentExercise;
  }

  return (
    exercises
      .filter((exercise) => exercise.orderIndex > currentExercise.orderIndex && !exercise.isCompleted)
      .sort((a, b) => a.orderIndex - b.orderIndex)[0] ?? null
  );
}
