import test from "node:test";
import assert from "node:assert/strict";
import { isGymFeeDueToday } from "./gym-fee.ts";

test("is due on the same day of each later month", () => {
  assert.equal(isGymFeeDueToday("2026-01-15", "2026-02-15"), true);
  assert.equal(isGymFeeDueToday("2026-01-15", "2026-02-14"), false);
});

test("is due on the start date itself but not before it", () => {
  assert.equal(isGymFeeDueToday("2026-10-15", "2026-10-15"), true);
  assert.equal(isGymFeeDueToday("2026-10-15", "2026-09-15"), false);
});

test("falls back to the last day of short months", () => {
  assert.equal(isGymFeeDueToday("2026-01-31", "2026-02-28"), true);
  assert.equal(isGymFeeDueToday("2026-01-31", "2026-04-30"), true);
  assert.equal(isGymFeeDueToday("2026-01-31", "2026-03-30"), false);
});
