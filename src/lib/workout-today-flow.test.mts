import test from "node:test";
import assert from "node:assert/strict";
import {
  getCurrentExerciseRow,
  getNextExerciseAfterSetSave,
  getNextSetToFill,
  getSelectedSetToFill,
  getSetDisplayNumber,
  getSetEntryDefaults,
  getTodayExerciseHref,
} from "./workout-today-flow.ts";

test("selects the first unfinished set for one tap entry", () => {
  const setLogs = [
    { id: "set-1", setIndex: 0, isCompleted: true },
    { id: "set-2", setIndex: 1, isCompleted: false },
    { id: "set-3", setIndex: 2, isCompleted: false },
  ];

  assert.equal(getNextSetToFill(setLogs)?.id, "set-2");
});

test("does not let a stale set URL skip earlier unfinished sets", () => {
  const setLogs = [
    { id: "set-1", setIndex: 0, isCompleted: false },
    { id: "set-2", setIndex: 1, isCompleted: false },
    { id: "set-3", setIndex: 2, isCompleted: false },
  ];

  assert.equal(getSelectedSetToFill(setLogs, "set-2")?.id, "set-1");
  assert.equal(getSelectedSetToFill([{ ...setLogs[0], isCompleted: true }, setLogs[1], setLogs[2]], "set-2")?.id, "set-2");
});

test("shows the first set as set 1 even when stored setIndex starts at 1", () => {
  const setLogs = [
    { id: "set-1", setIndex: 1, isCompleted: false },
    { id: "set-2", setIndex: 2, isCompleted: false },
    { id: "set-3", setIndex: 3, isCompleted: false },
  ];

  assert.equal(getSetDisplayNumber(setLogs, setLogs[0]), 1);
  assert.equal(getSetDisplayNumber(setLogs, setLogs[1]), 2);
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

test("uses the exercise selected in the URL as the main current exercise", () => {
  const rows = [
    { exerciseLogId: "pull-up-log", isStarted: true, isCompleted: false },
    { exerciseLogId: "barbell-row-log", isStarted: true, isCompleted: false },
    { exerciseLogId: null, isStarted: false, isCompleted: false },
  ];

  assert.equal(getCurrentExerciseRow(rows, "barbell-row-log")?.exerciseLogId, "barbell-row-log");
  assert.equal(getCurrentExerciseRow(rows, undefined)?.exerciseLogId, "pull-up-log");
});

test("uses a completed exercise selected in the URL for review without changing the active exercise", () => {
  const rows = [
    { exerciseLogId: "done-log", isStarted: true, isCompleted: true },
    { exerciseLogId: "active-log", isStarted: true, isCompleted: false },
  ];

  assert.equal(getCurrentExerciseRow(rows, "done-log")?.exerciseLogId, "done-log");
  assert.equal(getCurrentExerciseRow(rows, undefined)?.exerciseLogId, "active-log");
});

test("routes completed exercises directly into review mode", () => {
  assert.equal(
    getTodayExerciseHref({ exerciseLogId: "done-log", isCompleted: true, isStarted: true }),
    "/today?exercise=done-log&review=1",
  );
  assert.equal(
    getTodayExerciseHref({ exerciseLogId: "active-log", isCompleted: false, isStarted: true }),
    "/today?exercise=active-log",
  );
  assert.equal(getTodayExerciseHref({ exerciseLogId: null, isCompleted: false, isStarted: false }), null);
});
