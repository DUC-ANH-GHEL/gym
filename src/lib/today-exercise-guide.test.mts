import assert from "node:assert/strict";
import test from "node:test";
import { buildExerciseGuideItems, getExerciseGuideFallback } from "./today-exercise-guide.ts";

test("buildExerciseGuideItems splits detailed technique notes into readable steps", () => {
  assert.deepEqual(
    buildExerciseGuideItems("Gập hông, giữ lưng thẳng. Kéo tạ sát người; siết mông khi đứng lên"),
    ["Gập hông, giữ lưng thẳng.", "Kéo tạ sát người.", "Siết mông khi đứng lên."],
  );
});

test("buildExerciseGuideItems removes empty and duplicated punctuation", () => {
  assert.deepEqual(buildExerciseGuideItems("  Đặt chân chắc;;  Thở đều. "), ["Đặt chân chắc.", "Thở đều."]);
});

test("getExerciseGuideFallback gives a clear fallback when metadata has no note", () => {
  assert.equal(
    getExerciseGuideFallback("Romanian Deadlift"),
    "Bài Romanian Deadlift chưa có hướng dẫn chi tiết. Tập chậm, giữ lưng chắc và dừng lại nếu thấy đau bất thường.",
  );
});
