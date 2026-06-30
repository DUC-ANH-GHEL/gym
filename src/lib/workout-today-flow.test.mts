import test from "node:test";
import assert from "node:assert/strict";
import { getNextExerciseAfterSetSave, getNextSetToFill, getSetEntryDefaults } from "./workout-today-flow.ts";

test("selects the first unfinished set for one tap entry", () => {
  const setLogs = [
    { id: "set-1", setIndex: 0, isCompleted: true },
    { id: "set-2", setIndex: 1, isCompleted: false },
    { id: "set-3", setIndex: 2, isCompleted: false },
  ];

  assert.equal(getNextSetToFill(setLogs)?.id, "set-2");
});

test("reuses the latest completed set values before falling back to history and target", () => {
  const setLogs = [
    { id: "set-1", setIndex: 0, isCompleted: true, actualWeightKg: 42.5, actualReps: 9, targetWeightKg: 40, targetReps: 10 },
    { id: "set-2", setIndex: 1, isCompleted: false, actualWeightKg: null, actualReps: null, targetWeightKg: 40, targetReps: 10 },
  ];

  assert.deepEqual(getSetEntryDefaults(setLogs[1], setLogs, { actualWeightKg: 35, actualReps: 12 }), {
    weightKg: 42.5,
    reps: 9,
  });
  assert.deepEqual(getSetEntryDefaults(setLogs[1], [setLogs[1]], { actualWeightKg: 35, actualReps: 12 }), {
    weightKg: 35,
    reps: 12,
  });
  assert.deepEqual(getSetEntryDefaults(setLogs[1], [setLogs[1]], null), {
    weightKg: 40,
    reps: 10,
  });
});

test("auto jumps to next exercise after the current exercise is done", () => {
  const exercises = [
    { id: "ex-1", orderIndex: 0, isCompleted: true },
    { id: "ex-2", orderIndex: 1, isCompleted: false },
    { id: "ex-3", orderIndex: 2, isCompleted: false },
  ];

  assert.equal(getNextExerciseAfterSetSave(exercises, exercises[0])?.id, "ex-2");
  assert.equal(getNextExerciseAfterSetSave(exercises, exercises[1])?.id, "ex-2");
});
