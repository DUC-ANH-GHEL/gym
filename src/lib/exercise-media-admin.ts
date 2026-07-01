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

export function hasAnimationUrl(value: string | null | undefined) {
  return Boolean(value?.trim());
}

export function buildExerciseMediaSeedCommand(slug: string, dryRun: boolean) {
  const base = `python scripts/seed_free_exercise_db_media.py --slug ${slug} --include-existing`;
  return dryRun ? `${base} --dry-run` : base;
}
