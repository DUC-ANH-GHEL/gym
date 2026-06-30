import test from "node:test";
import assert from "node:assert/strict";
import { getExerciseMedia, getExerciseMediaViewerTarget, isAllowedExerciseAnimationUrl } from "./exercise-media.ts";

test("uses animation first for list media so every visible exercise can show motion", () => {
  const media = getExerciseMedia(
    {
      imageUrl: "https://res.cloudinary.com/demo/image/upload/photo.jpg",
      animationUrl: "https://res.cloudinary.com/demo/image/upload/move.gif",
    },
    "list",
  );

  assert.equal(media.src, "https://res.cloudinary.com/demo/image/upload/move.gif");
  assert.equal(media.kind, "animation");
  assert.equal(media.isPlaceholder, false);
});

test("marks matching list media as animation when animation is present", () => {
  const media = getExerciseMedia(
    {
      imageUrl: "/exercise-placeholder.png",
      animationUrl: "/exercise-placeholder.png",
    },
    "list",
  );

  assert.equal(media.src, "/exercise-placeholder.png");
  assert.equal(media.kind, "animation");
});

test("uses animation first for workout and detail media", () => {
  const exercise = {
    imageUrl: "https://res.cloudinary.com/demo/image/upload/photo.jpg",
    animationUrl: "https://res.cloudinary.com/demo/image/upload/move.gif",
  };

  assert.equal(getExerciseMedia(exercise, "detail").src, exercise.animationUrl);
  assert.equal(getExerciseMedia(exercise, "workout").src, exercise.animationUrl);
});

test("falls back through image animation and placeholder", () => {
  assert.equal(getExerciseMedia({ imageUrl: null, animationUrl: "/move.gif" }, "list").src, "/move.gif");
  assert.deepEqual(getExerciseMedia({ imageUrl: null, animationUrl: null }, "workout"), {
    src: "/exercise-placeholder.png",
    kind: "placeholder",
    isPlaceholder: true,
  });
});

test("allows Cloudinary GIF or image URLs for animation metadata", () => {
  assert.equal(isAllowedExerciseAnimationUrl("https://res.cloudinary.com/demo/image/upload/move.gif"), true);
  assert.equal(isAllowedExerciseAnimationUrl("https://res.cloudinary.com/demo/video/upload/move.gif"), true);
  assert.equal(isAllowedExerciseAnimationUrl("/exercise-placeholder.png"), true);
  assert.equal(isAllowedExerciseAnimationUrl("https://example.com/move.gif"), false);
});

test("opens viewer only for real exercise media", () => {
  const realMedia = getExerciseMedia({ imageUrl: "/bench.jpg", animationUrl: null }, "list");
  const placeholderMedia = getExerciseMedia({ imageUrl: null, animationUrl: null }, "list");

  assert.deepEqual(getExerciseMediaViewerTarget(realMedia, "Bench Press"), {
    src: "/bench.jpg",
    alt: "Bench Press",
    kind: "image",
  });
  assert.equal(getExerciseMediaViewerTarget(placeholderMedia, "Bench Press"), null);
});
