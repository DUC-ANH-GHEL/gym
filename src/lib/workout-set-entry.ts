export const MAX_WORKOUT_WEIGHT_KG = 100;

export function clampWorkoutWeightKg(value: number) {
  if (!Number.isFinite(value)) {
    return 0;
  }

  return Math.min(MAX_WORKOUT_WEIGHT_KG, Math.max(0, Number(value.toFixed(1))));
}

export function formatWorkoutWeightKg(value: number | null) {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    return "";
  }

  return Number.isInteger(value) ? String(value) : String(value).replace(/\.0$/, "");
}

function normalizeWorkoutWeightText(text: string) {
  if (text.startsWith("0.") || text === "0") {
    return text;
  }

  if (/^0+\.\d*$/.test(text)) {
    return `0.${text.split(".")[1] ?? ""}`;
  }

  return text.replace(/^0+(?=\d)/, "");
}

export function updateWorkoutWeightInput(rawText: string, previousWeightKg: number) {
  const text = rawText.trim();
  if (text === "") {
    return { text, weightKg: previousWeightKg };
  }

  const normalizedText = normalizeWorkoutWeightText(text);
  const nextValue = Number(normalizedText);
  if (!Number.isFinite(nextValue)) {
    return { text: normalizedText, weightKg: previousWeightKg };
  }

  const weightKg = clampWorkoutWeightKg(nextValue);

  return {
    text: nextValue !== weightKg ? formatWorkoutWeightKg(weightKg) : normalizedText,
    weightKg,
  };
}

export function finalizeWorkoutWeightInput(text: string, currentWeightKg: number) {
  const trimmed = text.trim();
  if (trimmed === "") {
    return formatWorkoutWeightKg(currentWeightKg);
  }

  const nextValue = Number(trimmed);
  if (!Number.isFinite(nextValue)) {
    return formatWorkoutWeightKg(currentWeightKg);
  }

  return formatWorkoutWeightKg(clampWorkoutWeightKg(nextValue));
}
