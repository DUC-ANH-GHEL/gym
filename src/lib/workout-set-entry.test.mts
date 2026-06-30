import test from "node:test";
import assert from "node:assert/strict";
import { clampWorkoutWeightKg } from "./workout-set-entry.ts";

test("clamps workout weight entry between 0 and 100kg", () => {
  assert.equal(clampWorkoutWeightKg(102.5), 100);
  assert.equal(clampWorkoutWeightKg(-2.5), 0);
  assert.equal(clampWorkoutWeightKg(42.5), 42.5);
});

test("rounds workout weight entry to one decimal place", () => {
  assert.equal(clampWorkoutWeightKg(42.56), 42.6);
});
