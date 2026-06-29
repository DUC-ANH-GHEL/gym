import test from "node:test";
import assert from "node:assert/strict";
import { buildLastSetHint, getRestReminderPlan } from "./workout-rest.ts";

test("starts a 30 second rest after a completed set when the exercise is not done", () => {
  const plan = getRestReminderPlan({
    setWasCompleted: true,
    exerciseIsCompleted: false,
    nextExerciseName: "Bench Press",
  });

  assert.deepEqual(plan, {
    seconds: 30,
    kind: "set",
    title: "Tới set tiếp theo",
    body: "Nghỉ xong rồi. Vào tập set tiếp theo nhé.",
  });
});

test("starts a 90 second rest after the last set of an exercise", () => {
  const plan = getRestReminderPlan({
    setWasCompleted: true,
    exerciseIsCompleted: true,
    nextExerciseName: "Incline Dumbbell Press",
  });

  assert.deepEqual(plan, {
    seconds: 90,
    kind: "exercise",
    title: "Tới bài tiếp theo",
    body: "Nghỉ xong rồi. Chuyển sang Incline Dumbbell Press nhé.",
  });
});

test("does not start rest when the set is saved but not marked done", () => {
  const plan = getRestReminderPlan({
    setWasCompleted: false,
    exerciseIsCompleted: false,
    nextExerciseName: null,
  });

  assert.equal(plan, null);
});

test("formats the nearest previous set weight and reps in plain words", () => {
  assert.equal(buildLastSetHint({ actualWeightKg: 42.5, actualReps: 10 }), "Lần trước: 42.5 kg x 10 lần");
  assert.equal(buildLastSetHint({ actualWeightKg: null, actualReps: 12 }), "Lần trước: 12 lần");
  assert.equal(buildLastSetHint(null), null);
});
