import assert from "node:assert/strict";
import test from "node:test";
import {
  buildAdminExercisesFilterHref,
  getAdminExerciseMediaStatus,
  normalizeAdminExerciseSearch,
  parseAdminExerciseStatusFilter,
} from "./admin-exercises.ts";

test("normalizes admin exercise search by trimming whitespace", () => {
  assert.equal(normalizeAdminExerciseSearch("  bench press  "), "bench press");
  assert.equal(normalizeAdminExerciseSearch(""), "");
  assert.equal(normalizeAdminExerciseSearch(null), "");
});

test("parses supported admin exercise status filters", () => {
  assert.equal(parseAdminExerciseStatusFilter("missing-image"), "missing-image");
  assert.equal(parseAdminExerciseStatusFilter("missing-gif"), "missing-gif");
  assert.equal(parseAdminExerciseStatusFilter("hidden"), "hidden");
  assert.equal(parseAdminExerciseStatusFilter("active"), "active");
  assert.equal(parseAdminExerciseStatusFilter("bad"), undefined);
});

test("builds admin exercise filter links without empty params", () => {
  assert.equal(
    buildAdminExercisesFilterHref({ search: "  squat  ", status: "missing-gif", muscleGroup: "Chân" }),
    "/admin/exercises?search=squat&status=missing-gif&muscleGroup=Ch%C3%A2n",
  );
  assert.equal(buildAdminExercisesFilterHref({ search: "", status: undefined, muscleGroup: "" }), "/admin/exercises");
});

test("detects image and gif status for exercise metadata cards", () => {
  assert.deepEqual(getAdminExerciseMediaStatus({ imageUrl: "/bench.jpg", animationUrl: "/bench.gif" }), {
    hasImage: true,
    hasGif: true,
    label: "Đủ media",
    tone: "ready",
  });
  assert.deepEqual(getAdminExerciseMediaStatus({ imageUrl: null, animationUrl: "/bench.gif" }), {
    hasImage: false,
    hasGif: true,
    label: "Thiếu ảnh",
    tone: "warning",
  });
  assert.deepEqual(getAdminExerciseMediaStatus({ imageUrl: "/exercise-placeholder.png", animationUrl: "/bench.gif" }), {
    hasImage: false,
    hasGif: true,
    label: "Thiếu ảnh",
    tone: "warning",
  });
  assert.deepEqual(getAdminExerciseMediaStatus({ imageUrl: "/bench.jpg", animationUrl: "" }), {
    hasImage: true,
    hasGif: false,
    label: "Thiếu GIF",
    tone: "warning",
  });
  assert.deepEqual(getAdminExerciseMediaStatus({ imageUrl: null, animationUrl: null }), {
    hasImage: false,
    hasGif: false,
    label: "Thiếu ảnh và GIF",
    tone: "danger",
  });
});
