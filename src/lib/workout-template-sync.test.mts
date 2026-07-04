import assert from "node:assert/strict";
import test from "node:test";
import { buildWorkoutTemplateScheduleRows } from "./workout-template-sync-core.ts";

test("buildWorkoutTemplateScheduleRows rebuilds a user schedule from the latest template", () => {
  const result = buildWorkoutTemplateScheduleRows({
    workoutDays: [
      { id: "day-mon", dayOfWeek: 1 },
      { id: "day-tue", dayOfWeek: 2 },
    ],
    template: {
      id: "template-1",
      days: [
        {
          dayOfWeek: 1,
          title: "Push mới",
          isRestDay: false,
          exercises: [
            {
              catalogItemId: "bench",
              note: "Giữ chắc vai",
              catalogItem: { defaultWeightKg: 40 },
              sets: [
                { setIndex: 0, intensityPercent: 70, targetReps: 10, targetWeightKg: 45 },
                { setIndex: 1, intensityPercent: 75, targetReps: 8, targetWeightKg: 50 },
              ],
            },
            {
              catalogItemId: "plank",
              note: null,
              catalogItem: { defaultWeightKg: null },
              sets: [],
            },
          ],
        },
        {
          dayOfWeek: 2,
          title: "Nghỉ phục hồi",
          isRestDay: true,
          exercises: [
            {
              catalogItemId: "hidden-rest-exercise",
              note: null,
              catalogItem: { defaultWeightKg: null },
              sets: [{ setIndex: 0, intensityPercent: null, targetReps: 10, targetWeightKg: null }],
            },
          ],
        },
      ],
    },
    makeId: (() => {
      let value = 0;
      return () => `id-${++value}`;
    })(),
  });

  assert.deepEqual(result.dayUpserts.map((day) => [day.dayOfWeek, day.title, day.isRestDay]), [
    [1, "Push mới", false],
    [2, "Nghỉ phục hồi", true],
    [3, "Thứ 4", true],
    [4, "Thứ 5", true],
    [5, "Thứ 6", true],
    [6, "Thứ 7", true],
    [0, "Chủ nhật", true],
  ]);
  assert.equal(result.exerciseRows.length, 2);
  assert.deepEqual(
    result.exerciseRows.map((row) => ({ id: row.id, workoutDayId: row.workoutDayId, catalogItemId: row.catalogItemId, orderIndex: row.orderIndex, note: row.note })),
    [
      { id: "id-1", workoutDayId: "day-mon", catalogItemId: "bench", orderIndex: 0, note: "Giữ chắc vai" },
      { id: "id-4", workoutDayId: "day-mon", catalogItemId: "plank", orderIndex: 1, note: null },
    ],
  );
  assert.deepEqual(
    result.setRows.map((row) => ({
      workoutDayExerciseId: row.workoutDayExerciseId,
      setIndex: row.setIndex,
      intensityPercent: row.intensityPercent,
      targetReps: row.targetReps,
      targetWeightKg: row.targetWeightKg,
    })),
    [
      { workoutDayExerciseId: "id-1", setIndex: 0, intensityPercent: 70, targetReps: 10, targetWeightKg: 45 },
      { workoutDayExerciseId: "id-1", setIndex: 1, intensityPercent: 75, targetReps: 8, targetWeightKg: 50 },
      { workoutDayExerciseId: "id-4", setIndex: 0, intensityPercent: 70, targetReps: 12, targetWeightKg: null },
      { workoutDayExerciseId: "id-4", setIndex: 1, intensityPercent: 80, targetReps: 10, targetWeightKg: null },
      { workoutDayExerciseId: "id-4", setIndex: 2, intensityPercent: 90, targetReps: 8, targetWeightKg: null },
      { workoutDayExerciseId: "id-4", setIndex: 3, intensityPercent: 90, targetReps: 8, targetWeightKg: null },
    ],
  );
});
