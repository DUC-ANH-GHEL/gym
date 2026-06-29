export const SET_REST_SECONDS = 30;
export const EXERCISE_REST_SECONDS = 90;

export type RestReminderPlan = {
  seconds: number;
  kind: "set" | "exercise";
  title: string;
  body: string;
};

export function getRestReminderPlan({
  setWasCompleted,
  exerciseIsCompleted,
  nextExerciseName,
}: {
  setWasCompleted: boolean;
  exerciseIsCompleted: boolean;
  nextExerciseName: string | null;
}): RestReminderPlan | null {
  if (!setWasCompleted) {
    return null;
  }

  if (exerciseIsCompleted) {
    return {
      seconds: EXERCISE_REST_SECONDS,
      kind: "exercise",
      title: "Tới bài tiếp theo",
      body: nextExerciseName ? `Nghỉ xong rồi. Chuyển sang ${nextExerciseName} nhé.` : "Nghỉ xong rồi. Chọn bài tiếp theo nhé.",
    };
  }

  return {
    seconds: SET_REST_SECONDS,
    kind: "set",
    title: "Tới set tiếp theo",
    body: "Nghỉ xong rồi. Vào tập set tiếp theo nhé.",
  };
}

export function buildLastSetHint(
  lastSet: {
    actualWeightKg: number | null;
    actualReps: number | null;
  } | null,
) {
  if (!lastSet) {
    return null;
  }

  const hasWeight = typeof lastSet.actualWeightKg === "number";
  const hasReps = typeof lastSet.actualReps === "number";

  if (hasWeight && hasReps) {
    return `Lần trước: ${lastSet.actualWeightKg} kg x ${lastSet.actualReps} lần`;
  }

  if (hasWeight) {
    return `Lần trước: ${lastSet.actualWeightKg} kg`;
  }

  if (hasReps) {
    return `Lần trước: ${lastSet.actualReps} lần`;
  }

  return null;
}
