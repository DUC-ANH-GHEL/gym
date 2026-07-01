import test from "node:test";
import assert from "node:assert/strict";
import {
  clampWorkoutWeightKg,
  finalizeWorkoutWeightInput,
  formatWorkoutWeightKg,
  updateWorkoutWeightInput,
} from "./workout-set-entry.ts";

test("clamps workout weight entry between 0 and 100kg", () => {
  assert.equal(clampWorkoutWeightKg(102.5), 100);
  assert.equal(clampWorkoutWeightKg(-2.5), 0);
  assert.equal(clampWorkoutWeightKg(42.5), 42.5);
});

test("rounds workout weight entry to one decimal place", () => {
  assert.equal(clampWorkoutWeightKg(42.56), 42.6);
});

test("keeps the previous workout weight while the user clears the input to edit", () => {
  assert.deepEqual(updateWorkoutWeightInput("", 42.5), {
    text: "",
    weightKg: 42.5,
  });
});

test("updates workout weight from typed text without forcing empty text to zero", () => {
  assert.deepEqual(updateWorkoutWeightInput("45", 42.5), {
    text: "45",
    weightKg: 45,
  });
  assert.deepEqual(updateWorkoutWeightInput("150", 42.5), {
    text: "100",
    weightKg: 100,
  });
});

test("finalizes workout weight input for display after editing", () => {
  assert.equal(finalizeWorkoutWeightInput("", 42.5), "42.5");
  assert.equal(finalizeWorkoutWeightInput("150", 42.5), "100");
  assert.equal(finalizeWorkoutWeightInput("42.0", 0), "42");
});

test("formats workout weight without trailing decimal noise", () => {
  assert.equal(formatWorkoutWeightKg(42), "42");
  assert.equal(formatWorkoutWeightKg(42.5), "42.5");
  assert.equal(formatWorkoutWeightKg(null), "");
});
