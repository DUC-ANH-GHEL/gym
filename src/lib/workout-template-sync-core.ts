import { randomUUID } from "crypto";

export const WORKOUT_DAY_CONFIG = [
  { dayOfWeek: 1, title: "Thứ 2" },
  { dayOfWeek: 2, title: "Thứ 3" },
  { dayOfWeek: 3, title: "Thứ 4" },
  { dayOfWeek: 4, title: "Thứ 5" },
  { dayOfWeek: 5, title: "Thứ 6" },
  { dayOfWeek: 6, title: "Thứ 7" },
  { dayOfWeek: 0, title: "Chủ nhật" },
] as const;

const DEFAULT_SET_TEMPLATE = [
  { intensityPercent: 70, targetReps: 12 },
  { intensityPercent: 80, targetReps: 10 },
  { intensityPercent: 90, targetReps: 8 },
  { intensityPercent: 90, targetReps: 8 },
] as const;

type WorkoutDayForSync = {
  id: string;
  dayOfWeek: number;
};

type TemplateSetForSync = {
  setIndex: number;
  intensityPercent: number | null;
  targetReps: number | null;
  targetWeightKg: number | null;
};

type TemplateExerciseForSync = {
  catalogItemId: string;
  note: string | null;
  catalogItem: { defaultWeightKg: number | null };
  sets: TemplateSetForSync[];
};

export type WorkoutTemplateForScheduleSync = {
  id: string;
  days: {
    dayOfWeek: number;
    title: string;
    isRestDay: boolean;
    exercises: TemplateExerciseForSync[];
  }[];
};

type WorkoutDayUpsert = {
  id: string | null;
  dayOfWeek: number;
  title: string;
  isRestDay: boolean;
};

type WorkoutDayExerciseRow = {
  id: string;
  workoutDayId: string;
  catalogItemId: string;
  orderIndex: number;
  note: string | null;
};

type WorkoutPlanSetRow = {
  id: string;
  workoutDayExerciseId: string;
  setIndex: number;
  intensityPercent: number | null;
  targetReps: number | null;
  targetWeightKg: number | null;
};

type BuildRowsInput = {
  workoutDays: WorkoutDayForSync[];
  template: WorkoutTemplateForScheduleSync;
  makeId?: () => string;
};

type BuildRowsResult = {
  dayUpserts: WorkoutDayUpsert[];
  exerciseRows: WorkoutDayExerciseRow[];
  setRows: WorkoutPlanSetRow[];
};

function buildTemplateDefaultPlanSets(weight?: number | null) {
  return DEFAULT_SET_TEMPLATE.map((plan, index) => ({
    setIndex: index,
    intensityPercent: plan.intensityPercent,
    targetReps: plan.targetReps,
    targetWeightKg: weight ?? null,
  }));
}

export function buildWorkoutTemplateScheduleRows({ workoutDays, template, makeId = randomUUID }: BuildRowsInput): BuildRowsResult {
  const workoutDayByWeek = new Map(workoutDays.map((day) => [day.dayOfWeek, day]));
  const dayUpserts: WorkoutDayUpsert[] = [];
  const exerciseRows: WorkoutDayExerciseRow[] = [];
  const setRows: WorkoutPlanSetRow[] = [];

  for (const config of WORKOUT_DAY_CONFIG) {
    const templateDay = template.days.find((day) => day.dayOfWeek === config.dayOfWeek);
    const workoutDay = workoutDayByWeek.get(config.dayOfWeek) ?? null;

    dayUpserts.push({
      id: workoutDay?.id ?? null,
      dayOfWeek: config.dayOfWeek,
      title: templateDay?.title || config.title,
      isRestDay: templateDay?.isRestDay ?? true,
    });
  }

  const resolvedWorkoutDayByWeek = new Map(dayUpserts.filter((day) => day.id).map((day) => [day.dayOfWeek, day.id as string]));

  for (const templateDay of template.days) {
    const workoutDayId = resolvedWorkoutDayByWeek.get(templateDay.dayOfWeek);

    if (!workoutDayId || templateDay.isRestDay) {
      continue;
    }

    for (const [orderIndex, templateExercise] of templateDay.exercises.entries()) {
      const workoutDayExerciseId = makeId();
      exerciseRows.push({
        id: workoutDayExerciseId,
        workoutDayId,
        catalogItemId: templateExercise.catalogItemId,
        orderIndex,
        note: templateExercise.note || null,
      });

      const sourceSets =
        templateExercise.sets.length > 0
          ? templateExercise.sets
          : buildTemplateDefaultPlanSets(templateExercise.catalogItem.defaultWeightKg ?? null);

      for (const set of sourceSets) {
        setRows.push({
          id: makeId(),
          workoutDayExerciseId,
          setIndex: set.setIndex,
          intensityPercent: set.intensityPercent,
          targetReps: set.targetReps,
          targetWeightKg: set.targetWeightKg,
        });
      }
    }
  }

  return { dayUpserts, exerciseRows, setRows };
}
