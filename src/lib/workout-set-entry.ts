export const MAX_WORKOUT_WEIGHT_KG = 100;

export function clampWorkoutWeightKg(value: number) {
  if (!Number.isFinite(value)) {
    return 0;
  }

  return Math.min(MAX_WORKOUT_WEIGHT_KG, Math.max(0, Number(value.toFixed(1))));
}
