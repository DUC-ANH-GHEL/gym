type WorkoutDayExerciseForLog = {
  catalogItemId: string;
  catalogItem: {
    name: string;
    muscleGroup: string | null;
    imageUrl: string | null;
    animationUrl: string | null;
  };
  sets: {
    setIndex: number;
    intensityPercent: number | null;
    targetReps: number | null;
    targetWeightKg: number | null;
  }[];
};

type WorkoutExerciseLogForSync = {
  id: string;
  catalogItemId: string | null;
  orderIndex: number;
};

export function planTodayWorkoutLogSync(
  workoutDayExercises: WorkoutDayExerciseForLog[],
  exerciseLogs: WorkoutExerciseLogForSync[],
) {
  const usedLogIds = new Set<string>();
  const updateRows: { id: string; orderIndex: number }[] = [];
  const createRows: {
    catalogItemId: string;
    exerciseName: string;
    muscleGroup: string | null;
    imageUrl: string | null;
    animationUrl: string | null;
    orderIndex: number;
    setLogs: {
      create: {
        setIndex: number;
        intensityPercent: number | null;
        targetReps: number | null;
        targetWeightKg: number | null;
      }[];
    };
  }[] = [];

  for (const [orderIndex, workoutDayExercise] of workoutDayExercises.entries()) {
    const matchingLog = exerciseLogs.find((log) => !usedLogIds.has(log.id) && log.catalogItemId === workoutDayExercise.catalogItemId) ?? null;

    if (matchingLog) {
      usedLogIds.add(matchingLog.id);

      if (matchingLog.orderIndex !== orderIndex) {
        updateRows.push({ id: matchingLog.id, orderIndex });
      }

      continue;
    }

    createRows.push({
      catalogItemId: workoutDayExercise.catalogItemId,
      exerciseName: workoutDayExercise.catalogItem.name,
      muscleGroup: workoutDayExercise.catalogItem.muscleGroup,
      imageUrl: workoutDayExercise.catalogItem.imageUrl,
      animationUrl: workoutDayExercise.catalogItem.animationUrl,
      orderIndex,
      setLogs: {
        create: workoutDayExercise.sets.map((set) => ({
          setIndex: set.setIndex,
          intensityPercent: set.intensityPercent,
          targetReps: set.targetReps,
          targetWeightKg: set.targetWeightKg,
        })),
      },
    });
  }

  return { createRows, updateRows };
}
