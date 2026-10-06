import type { Prisma } from "@prisma/client";

type SetDefaults = { defaultSets: number | null; defaultReps: number | null };

type SetShape = { setIndex: number; intensityPercent: number | null; targetReps: number | null; targetWeightKg: number | null };

// Missing sets copy the last one so intensity/weight carry over.
function buildMissingSets(existing: SetShape[], count: number, reps: number | null): SetShape[] {
  const last = existing[existing.length - 1];

  return Array.from({ length: Math.max(0, count - existing.length) }, (_, offset) => ({
    setIndex: existing.length + offset,
    intensityPercent: last?.intensityPercent ?? null,
    targetReps: reps ?? last?.targetReps ?? null,
    targetWeightKg: last?.targetWeightKg ?? null,
  }));
}

/**
 * Pushes a catalog item's default set count / reps onto plans and templates that already use it,
 * and onto today's untouched workout logs. Per-set intensity and target weight are kept.
 */
export async function applyCatalogDefaultsToExisting(tx: Prisma.TransactionClient, catalogItemId: string, defaults: SetDefaults) {
  const { defaultSets, defaultReps } = defaults;

  if (!defaultSets && !defaultReps) {
    return;
  }

  const planExercises = await tx.workoutDayExercise.findMany({
    where: { catalogItemId },
    select: { id: true, sets: { orderBy: { setIndex: "asc" } } },
  });

  for (const exercise of planExercises) {
    if (defaultSets) {
      await tx.workoutPlanSet.deleteMany({ where: { workoutDayExerciseId: exercise.id, setIndex: { gte: defaultSets } } });
    }
    if (defaultReps) {
      await tx.workoutPlanSet.updateMany({ where: { workoutDayExerciseId: exercise.id }, data: { targetReps: defaultReps } });
    }
    if (defaultSets) {
      const kept = exercise.sets.slice(0, defaultSets);
      const missing = buildMissingSets(kept, defaultSets, defaultReps);
      if (missing.length > 0) {
        await tx.workoutPlanSet.createMany({ data: missing.map((set) => ({ ...set, workoutDayExerciseId: exercise.id })) });
      }
    }
  }

  const templateExercises = await tx.workoutTemplateExercise.findMany({
    where: { catalogItemId },
    select: { id: true, sets: { orderBy: { setIndex: "asc" } } },
  });

  for (const exercise of templateExercises) {
    if (defaultSets) {
      await tx.workoutTemplateSet.deleteMany({ where: { workoutTemplateExerciseId: exercise.id, setIndex: { gte: defaultSets } } });
    }
    if (defaultReps) {
      await tx.workoutTemplateSet.updateMany({ where: { workoutTemplateExerciseId: exercise.id }, data: { targetReps: defaultReps } });
    }
    if (defaultSets) {
      const kept = exercise.sets.slice(0, defaultSets);
      const missing = buildMissingSets(kept, defaultSets, defaultReps);
      if (missing.length > 0) {
        await tx.workoutTemplateSet.createMany({ data: missing.map((set) => ({ ...set, workoutTemplateExerciseId: exercise.id })) });
      }
    }
  }

  // Today's logs of unfinished workouts, only where no set has been done yet.
  const exerciseLogs = await tx.workoutExerciseLog.findMany({
    where: {
      catalogItemId,
      workoutLog: { completedAt: null },
      setLogs: { none: { isCompleted: true } },
    },
    select: { id: true, setLogs: { orderBy: { setIndex: "asc" } } },
  });

  for (const log of exerciseLogs) {
    if (defaultSets) {
      await tx.workoutSetLog.deleteMany({ where: { workoutExerciseLogId: log.id, setIndex: { gte: defaultSets } } });
    }
    if (defaultReps) {
      await tx.workoutSetLog.updateMany({ where: { workoutExerciseLogId: log.id }, data: { targetReps: defaultReps } });
    }
    if (defaultSets) {
      const kept = log.setLogs.slice(0, defaultSets);
      const missing = buildMissingSets(kept, defaultSets, defaultReps);
      if (missing.length > 0) {
        await tx.workoutSetLog.createMany({ data: missing.map((set) => ({ ...set, workoutExerciseLogId: log.id })) });
      }
    }
  }
}
