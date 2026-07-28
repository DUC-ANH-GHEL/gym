import assert from "node:assert/strict";
import test from "node:test";
import { getWorkoutLogLookupWindow } from "./date.ts";

test("limits workout log reads to the current local day", () => {
  const window = getWorkoutLogLookupWindow(new Date("2026-07-28T18:00:00.000Z"), "Asia/Bangkok");

  assert.equal(window.gte.toISOString(), "2026-07-28T17:00:00.000Z");
  assert.equal(window.lt.toISOString(), "2026-07-29T17:00:00.000Z");
});

test("keeps the lookup window aligned to a negative UTC offset", () => {
  const window = getWorkoutLogLookupWindow(new Date("2026-07-28T12:00:00.000Z"), "America/New_York");

  assert.equal(window.gte.toISOString(), "2026-07-28T04:00:00.000Z");
  assert.equal(window.lt.toISOString(), "2026-07-29T04:00:00.000Z");
});
