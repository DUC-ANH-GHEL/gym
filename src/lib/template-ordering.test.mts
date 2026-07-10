import test from "node:test";
import assert from "node:assert/strict";
import { buildMovedOrderIndexUpdates, getNextOrderIndex, sortOrderedItems } from "./template-ordering.ts";

const createdAt = (day: number) => new Date(Date.UTC(2026, 0, day));

test("moves an item by the visible sorted position, not orderIndex plus or minus one", () => {
  const items = [
    { id: "bench", orderIndex: 0, createdAt: createdAt(1) },
    { id: "row", orderIndex: 10, createdAt: createdAt(2) },
    { id: "curl", orderIndex: 20, createdAt: createdAt(3) },
  ];

  assert.deepEqual(buildMovedOrderIndexUpdates(items, "row", "up"), [
    { id: "row", orderIndex: 0 },
    { id: "bench", orderIndex: 1 },
    { id: "curl", orderIndex: 2 },
  ]);
});

test("normalizes duplicate order indexes while moving the selected item one step", () => {
  const items = [
    { id: "bench", orderIndex: 0, createdAt: createdAt(1) },
    { id: "row", orderIndex: 0, createdAt: createdAt(2) },
    { id: "curl", orderIndex: 1, createdAt: createdAt(3) },
  ];

  assert.deepEqual(buildMovedOrderIndexUpdates(items, "row", "up"), [
    { id: "bench", orderIndex: 1 },
    { id: "curl", orderIndex: 2 },
  ]);
  assert.deepEqual(sortOrderedItems(items).map((item) => item.id), ["bench", "row", "curl"]);
});

test("returns no updates when moving past the list edge", () => {
  assert.deepEqual(buildMovedOrderIndexUpdates([{ id: "bench", orderIndex: 0 }], "bench", "up"), []);
});

test("adds new items after the largest existing order index", () => {
  assert.equal(getNextOrderIndex([{ orderIndex: 0 }, { orderIndex: 4 }]), 5);
  assert.equal(getNextOrderIndex([]), 0);
});
