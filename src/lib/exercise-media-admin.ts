export function normalizeExerciseMediaSearch(value: string | null | undefined) {
  return value?.trim() || "";
}

export function parseMissingAnimationFilter(value: string | null | undefined) {
  if (value === "true") {
    return true;
  }

  if (value === "false") {
    return false;
  }

  return undefined;
}

export function buildExerciseMediaFilterHref({
  search,
  missingAnimation,
}: {
  search?: string | null;
  missingAnimation?: boolean;
}) {
  const params = new URLSearchParams();
  const normalizedSearch = normalizeExerciseMediaSearch(search);

  if (normalizedSearch) {
    params.set("search", normalizedSearch);
  }

  if (typeof missingAnimation === "boolean") {
    params.set("missingAnimation", String(missingAnimation));
  }

  const query = params.toString();
  return query ? `/admin/exercise-media?${query}` : "/admin/exercise-media";
}

export function hasAnimationUrl(value: string | null | undefined) {
  return Boolean(value?.trim());
}

export function buildExerciseMediaSeedCommand(slug: string, dryRun: boolean) {
  const base = `python scripts/seed_free_exercise_db_media.py --slug ${slug} --include-existing`;
  return dryRun ? `${base} --dry-run` : base;
}

export function normalizeDatasetFolderName(value: string | null | undefined) {
  return value?.trim() || "";
}

export function isAllowedDatasetFolderName(value: string) {
  return /^[A-Za-z0-9][A-Za-z0-9_.()' -]{0,119}$/.test(value);
}

export function buildFreeExerciseDbImageUrl(folderName: string, index: number) {
  const encodedFolder = encodeURIComponent(folderName).replace(/%2F/gi, "");
  return `https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/exercises/${encodedFolder}/${index}.jpg`;
}
