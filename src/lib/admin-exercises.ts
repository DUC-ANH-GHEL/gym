export type AdminExerciseStatusFilter = "missing-image" | "missing-gif" | "hidden" | "active";

const STATUS_FILTERS = new Set<AdminExerciseStatusFilter>(["missing-image", "missing-gif", "hidden", "active"]);

export function normalizeAdminExerciseSearch(value: string | null | undefined) {
  return value?.trim() || "";
}

export function parseAdminExerciseStatusFilter(value: string | null | undefined) {
  const normalized = value?.trim() as AdminExerciseStatusFilter | undefined;
  return normalized && STATUS_FILTERS.has(normalized) ? normalized : undefined;
}

export function buildAdminExercisesFilterHref({
  search,
  status,
  muscleGroup,
}: {
  search?: string | null;
  status?: AdminExerciseStatusFilter;
  muscleGroup?: string | null;
}) {
  const params = new URLSearchParams();
  const normalizedSearch = normalizeAdminExerciseSearch(search);
  const normalizedGroup = muscleGroup?.trim() || "";

  if (normalizedSearch) {
    params.set("search", normalizedSearch);
  }

  if (status) {
    params.set("status", status);
  }

  if (normalizedGroup) {
    params.set("muscleGroup", normalizedGroup);
  }

  const query = params.toString();
  return query ? `/admin/exercises?${query}` : "/admin/exercises";
}

export function getAdminExerciseMediaStatus(item: { imageUrl?: string | null; animationUrl?: string | null }) {
  const imageUrl = item.imageUrl?.trim() || "";
  const hasImage = Boolean(imageUrl && imageUrl !== "/exercise-placeholder.png");
  const hasGif = Boolean(item.animationUrl?.trim());

  if (hasImage && hasGif) {
    return { hasImage, hasGif, label: "Đủ media", tone: "ready" as const };
  }

  if (!hasImage && !hasGif) {
    return { hasImage, hasGif, label: "Thiếu ảnh và GIF", tone: "danger" as const };
  }

  return {
    hasImage,
    hasGif,
    label: hasImage ? "Thiếu GIF" : "Thiếu ảnh",
    tone: "warning" as const,
  };
}
