import test from "node:test";
import assert from "node:assert/strict";
import { buildScheduleSummary, getFriendlyWorkoutTitle } from "./schedule-summary.ts";

test("builds mobile schedule summary in Monday first order", () => {
  const summary = buildScheduleSummary({
    selectedDayOfWeek: 2,
    workoutDays: [
      { dayOfWeek: 0, title: "Nghi", isRestDay: true, exercises: [] },
      { dayOfWeek: 2, title: "Pull A", isRestDay: false, exercises: [{ id: "1" }, { id: "2" }] },
      { dayOfWeek: 1, title: "Push A", isRestDay: false, exercises: [{ id: "3" }] },
    ],
  });

  assert.deepEqual(
    summary.weekDays.map((day) => ({
      dayOfWeek: day.dayOfWeek,
      shortName: day.shortName,
      shortTitle: day.shortTitle,
      isSelected: day.isSelected,
    })),
    [
      { dayOfWeek: 1, shortName: "T2", shortTitle: "Push", isSelected: false },
      { dayOfWeek: 2, shortName: "T3", shortTitle: "Pull", isSelected: true },
      { dayOfWeek: 3, shortName: "T4", shortTitle: "Trống", isSelected: false },
      { dayOfWeek: 4, shortName: "T5", shortTitle: "Trống", isSelected: false },
      { dayOfWeek: 5, shortName: "T6", shortTitle: "Trống", isSelected: false },
      { dayOfWeek: 6, shortName: "T7", shortTitle: "Trống", isSelected: false },
      { dayOfWeek: 0, shortName: "CN", shortTitle: "Nghỉ", isSelected: false },
    ],
  );
  assert.deepEqual(summary.stats, {
    exerciseCount: 3,
    restDayCount: 1,
    trainingDayCount: 2,
  });
  assert.equal(summary.selectedDay?.title, "Pull A");
});

test("shortens template day titles into plain workout labels", () => {
  assert.equal(getFriendlyWorkoutTitle("Thứ 2 - PUSH A (Ngực chính - Vai phụ)"), "Push A");
  assert.equal(getFriendlyWorkoutTitle("Thứ 3 - PULL A"), "Pull A");
  assert.equal(getFriendlyWorkoutTitle("Thứ 4 - LEGS A (Đùi trước chính - Bắp chân phụ)"), "Chân A");
  assert.equal(getFriendlyWorkoutTitle("Thứ 5"), "Thứ 5");
});
