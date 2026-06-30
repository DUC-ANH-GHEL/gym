import assert from "node:assert/strict";
import test from "node:test";
import { authSchema } from "./validators.ts";

test("accepts text account names, email addresses, and phone-like identifiers", () => {
  for (const identifier of ["aduc7", "new.user@example.com", "Nguyen Van A", "\u0110\u1ee9c Anh", "nguyen van a", "+84901234567"]) {
    const parsed = authSchema.safeParse({
      identifier,
      password: "password123",
      name: "New User",
    });

    assert.equal(parsed.success, true, identifier);
  }
});

test("normalizes account identifiers before saving or looking up users", () => {
  const parsed = authSchema.safeParse({
    identifier: "  New.User@Example.COM  ",
    password: "password123",
    name: "",
  });

  assert.equal(parsed.success, true);
  if (parsed.success) {
    assert.equal(parsed.data.identifier, "new.user@example.com");
  }
});

test("rejects very short or unsafe identifiers", () => {
  assert.equal(authSchema.safeParse({ identifier: "a@", password: "password123", name: "" }).success, false);
  assert.equal(authSchema.safeParse({ identifier: "bad<script>", password: "password123", name: "" }).success, false);
});
