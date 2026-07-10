import test from "node:test";
import assert from "node:assert/strict";
import { planTodayWorkoutLogSync } from "./workout-log-sync.ts";

function exercise(catalogItemId: string, name = catalogItemId) {
  return {
    catalogItemId,
    catalogItem: {
      name,
      muscleGroup: "Ngực",
      imageUrl: null,
      animationUrl: null,
    },
    sets: [
      {
        setIndex: 0,
        intensityPercent: 70,
        targetReps: 10,
        targetWeightKg: 20,
      },
    ],
  };
}

test("creates a new today exercise log when the schedule replaced an exercise at the same position", () => {
  const result = planTodayWorkoutLogSync(
    [exercise("new-bench", "New Bench")],
    [{ id: "old-log", catalogItemId: "old-bench", orderIndex: 0 }],
  );

  assert.deepEqual(result.updateRows, []);
  assert.equal(result.createRows.length, 1);
  assert.equal(result.createRows[0].catalogItemId, "new-bench");
  assert.equal(result.createRows[0].exerciseName, "New Bench");
  assert.equal(result.createRows[0].orderIndex, 0);
  assert.deepEqual(result.createRows[0].setLogs.create, [
    {
      setIndex: 0,
      intensityPercent: 70,
      targetReps: 10,
      targetWeightKg: 20,
    },
  ]);
});

test("reuses the existing today exercise log when only the schedule order changed", () => {
  const result = planTodayWorkoutLogSync(
    [exercise("row"), exercise("bench")],
    [
      { id: "bench-log", catalogItemId: "bench", orderIndex: 0 },
      { id: "row-log", catalogItemId: "row", orderIndex: 1 },
    ],
  );

  assert.deepEqual(result.createRows, []);
  assert.deepEqual(result.updateRows, [
    { id: "row-log", orderIndex: 0 },
    { id: "bench-log", orderIndex: 1 },
  ]);
});
