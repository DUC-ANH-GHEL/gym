import test from "node:test";
import assert from "node:assert/strict";
import { getUploadPolicy, validateUploadFile } from "./media-upload-policy.ts";

test("allows larger gif files for exercise animation uploads", () => {
  const result = validateUploadFile({ type: "image/gif", size: 12 * 1024 * 1024 }, "animation");

  assert.equal(result.ok, true);
  assert.equal(getUploadPolicy("animation").maxBytes, 20 * 1024 * 1024);
});

test("keeps thumbnail uploads limited to normal images", () => {
  assert.equal(validateUploadFile({ type: "image/png", size: 6 * 1024 * 1024 }, "image").ok, false);
  assert.equal(validateUploadFile({ type: "image/gif", size: 1024 }, "image").ok, false);
});

test("rejects non gif animation uploads", () => {
  assert.equal(validateUploadFile({ type: "image/png", size: 1024 }, "animation").ok, false);
});
