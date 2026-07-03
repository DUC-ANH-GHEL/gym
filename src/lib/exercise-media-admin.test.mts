import test from "node:test";
import assert from "node:assert/strict";
import {
  buildFreeExerciseDbImageUrl,
  buildExerciseMediaFilterHref,
  buildExerciseMediaSeedCommand,
  hasAnimationUrl,
  isAllowedDatasetFolderName,
  normalizeExerciseMediaSearch,
  normalizeDatasetFolderName,
  parseMissingAnimationFilter,
} from "./exercise-media-admin.ts";

test("normalizes media admin search term by trimming whitespace", () => {
  assert.equal(normalizeExerciseMediaSearch("  romanian-deadlift  "), "romanian-deadlift");
  assert.equal(normalizeExerciseMediaSearch(""), "");
  assert.equal(normalizeExerciseMediaSearch(null), "");
});

test("parses missing animation filter from supported query values", () => {
  assert.equal(parseMissingAnimationFilter("true"), true);
  assert.equal(parseMissingAnimationFilter("false"), false);
  assert.equal(parseMissingAnimationFilter("all"), undefined);
  assert.equal(parseMissingAnimationFilter(undefined), undefined);
});

test("builds media admin filter links with search and missing gif state", () => {
  assert.equal(buildExerciseMediaFilterHref({ search: "  squat  ", missingAnimation: true }), "/admin/exercise-media?search=squat&missingAnimation=true");
  assert.equal(buildExerciseMediaFilterHref({ search: "bench press", missingAnimation: undefined }), "/admin/exercise-media?search=bench+press");
  assert.equal(buildExerciseMediaFilterHref({ search: "", missingAnimation: false }), "/admin/exercise-media?missingAnimation=false");
});

test("detects whether an animation URL is present after trimming", () => {
  assert.equal(hasAnimationUrl("https://res.cloudinary.com/demo/image/upload/move.gif"), true);
  assert.equal(hasAnimationUrl("   "), false);
  assert.equal(hasAnimationUrl(null), false);
});

test("builds dry-run and apply commands for a single exercise slug", () => {
  assert.equal(
    buildExerciseMediaSeedCommand("romanian-deadlift", true),
    "python scripts/seed_free_exercise_db_media.py --slug romanian-deadlift --include-existing --dry-run",
  );
  assert.equal(
    buildExerciseMediaSeedCommand("romanian-deadlift", false),
    "python scripts/seed_free_exercise_db_media.py --slug romanian-deadlift --include-existing",
  );
});

test("normalizes and validates dataset folder names", () => {
  assert.equal(normalizeDatasetFolderName("  Romanian_Deadlift  "), "Romanian_Deadlift");
  assert.equal(isAllowedDatasetFolderName("Romanian_Deadlift"), true);
  assert.equal(isAllowedDatasetFolderName("../secret"), false);
  assert.equal(isAllowedDatasetFolderName("bad/folder"), false);
});

test("builds GitHub raw image URLs for free-exercise-db folders", () => {
  assert.equal(
    buildFreeExerciseDbImageUrl("Romanian_Deadlift", 1),
    "https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/exercises/Romanian_Deadlift/1.jpg",
  );
  assert.equal(
    buildFreeExerciseDbImageUrl("Bench Press", 0),
    "https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/exercises/Bench%20Press/0.jpg",
  );
});
