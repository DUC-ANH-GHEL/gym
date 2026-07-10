import test from "node:test";
import assert from "node:assert/strict";
import {
  buildLastSetHint,
  getRestCountdownParts,
  getRestLockFromSearchParams,
  getRestReminderPlan,
  isRestLocked,
} from "./workout-rest.ts";

test("starts a 30 second rest after a completed set when the exercise is not done", () => {
  const plan = getRestReminderPlan({
    setWasCompleted: true,
    exerciseIsCompleted: false,
    nextExerciseName: "Bench Press",
  });

  assert.deepEqual(plan, {
    seconds: 30,
    kind: "set",
    title: "T\u1edbi set ti\u1ebfp theo",
    body: "Ngh\u1ec9 xong r\u1ed3i. V\u00e0o t\u1eadp set ti\u1ebfp theo nh\u00e9.",
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
    title: "T\u1edbi b\u00e0i ti\u1ebfp theo",
    body: "Ngh\u1ec9 xong r\u1ed3i. Chuy\u1ec3n sang Incline Dumbbell Press nh\u00e9.",
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
  assert.equal(buildLastSetHint({ actualWeightKg: 42.5, actualReps: 10 }), "L\u1ea7n tr\u01b0\u1edbc: 42.5 kg x 10 l\u1ea7n");
  assert.equal(buildLastSetHint({ actualWeightKg: null, actualReps: 12 }), "L\u1ea7n tr\u01b0\u1edbc: 12 l\u1ea7n");
  assert.equal(buildLastSetHint(null), null);
});

test("locks workout actions while the rest timer is still running", () => {
  assert.equal(isRestLocked(Date.parse("2026-06-30T09:00:30.000Z"), Date.parse("2026-06-30T09:00:00.000Z")), true);
  assert.equal(isRestLocked(Date.parse("2026-06-30T09:00:00.000Z"), Date.parse("2026-06-30T09:00:00.000Z")), false);
});

test("reads an active rest lock from search params", () => {
  const lock = getRestLockFromSearchParams(
    {
      rest: "30",
      restTitle: "T\u1edbi set ti\u1ebfp theo",
      restBody: "Ngh\u1ec9 xong r\u1ed3i. V\u00e0o t\u1eadp set ti\u1ebfp theo nh\u00e9.",
      restDueAt: String(Date.parse("2026-06-30T09:00:30.000Z")),
    },
    Date.parse("2026-06-30T09:00:00.000Z"),
  );

  assert.deepEqual(lock, {
    dueAtMs: Date.parse("2026-06-30T09:00:30.000Z"),
    restSeconds: 30,
    title: "T\u1edbi set ti\u1ebfp theo",
    body: "Ngh\u1ec9 xong r\u1ed3i. V\u00e0o t\u1eadp set ti\u1ebfp theo nh\u00e9.",
  });
});

test("formats a rest countdown for the progress card", () => {
  assert.deepEqual(getRestCountdownParts(Date.parse("2026-06-30T09:00:05.000Z"), Date.parse("2026-06-30T09:00:00.000Z")), {
    minutes: 0,
    seconds: 5,
    label: "0:05",
  });
  assert.deepEqual(getRestCountdownParts(Date.parse("2026-06-30T09:01:30.000Z"), Date.parse("2026-06-30T09:00:00.000Z")), {
    minutes: 1,
    seconds: 30,
    label: "1:30",
  });
});
