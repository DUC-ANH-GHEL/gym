export const EXERCISE_PLACEHOLDER_SRC = "/exercise-placeholder.png";

export type ExerciseMediaContext = "list" | "detail" | "workout";

export type ExerciseMediaInput = {
  imageUrl?: string | null;
  animationUrl?: string | null;
};

export function getExerciseMedia(exercise: ExerciseMediaInput, context: ExerciseMediaContext) {
  const imageUrl = exercise.imageUrl?.trim() || null;
  const animationUrl = exercise.animationUrl?.trim() || null;
  const selected =
    context === "list"
      ? imageUrl
        ? { src: imageUrl, kind: "image" as const }
        : animationUrl
          ? { src: animationUrl, kind: "animation" as const }
          : null
      : animationUrl
        ? { src: animationUrl, kind: "animation" as const }
        : imageUrl
          ? { src: imageUrl, kind: "image" as const }
          : null;

  if (!selected) {
    return {
      src: EXERCISE_PLACEHOLDER_SRC,
      kind: "placeholder" as const,
      isPlaceholder: true,
    };
  }

  return {
    src: selected.src,
    kind: selected.kind,
    isPlaceholder: false,
  };
}

export function isAllowedExerciseAnimationUrl(value: string) {
  const trimmed = value.trim();

  if (!trimmed) {
    return true;
  }

  if (trimmed.startsWith("/")) {
    return true;
  }

  try {
    const parsed = new URL(trimmed);
    return parsed.protocol === "https:" && parsed.hostname === "res.cloudinary.com";
  } catch {
    return false;
  }
}
