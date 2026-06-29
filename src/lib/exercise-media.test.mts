import test from "node:test";
import assert from "node:assert/strict";
import { getExerciseMedia, isAllowedExerciseAnimationUrl } from "./exercise-media.ts";

test("uses image first for list media to avoid loading many GIFs", () => {
  const media = getExerciseMedia(
    {
      imageUrl: "https://res.cloudinary.com/demo/image/upload/photo.jpg",
      animationUrl: "https://res.cloudinary.com/demo/image/upload/move.gif",
    },
    "list",
  );

  assert.equal(media.src, "https://res.cloudinary.com/demo/image/upload/photo.jpg");
  assert.equal(media.kind, "image");
  assert.equal(media.isPlaceholder, false);
});

test("marks list media as image when image and animation URLs match", () => {
  const media = getExerciseMedia(
    {
      imageUrl: "/exercise-placeholder.png",
      animationUrl: "/exercise-placeholder.png",
    },
    "list",
  );

  assert.equal(media.src, "/exercise-placeholder.png");
  assert.equal(media.kind, "image");
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
