import test from "node:test";
import assert from "node:assert/strict";
import { getQstashDelay } from "./workout-qstash.ts";

test("rounds a rest reminder delay up so it never sends before the timer reaches zero", () => {
  assert.equal(getQstashDelay(45_000, 0), "45s");
  assert.equal(getQstashDelay(45_001, 0), "46s");
  assert.equal(getQstashDelay(0, 0), "1s");
});
