import assert from "node:assert/strict";
import test from "node:test";
import {
  buildCatalogPickerGroups,
  filterCatalogPickerItems,
  getCatalogPickerSelection,
  getCatalogPickerDisplayGroup,
  getCatalogPickerSubmitLabel,
  toggleCatalogPickerSelection,
} from "./catalog-picker.ts";

const items = [
  {
    id: "rdl",
    name: "Romanian Deadlift",
    muscleGroup: "Chân",
    note: "Gập hông, giữ lưng thẳng.",
    defaultWeightKg: null,
    imageUrl: "/rdl.jpg",
    animationUrl: "/rdl.gif",
  },
  {
    id: "hip-thrust",
    name: "Hip Thrust",
    muscleGroup: "Mông",
    note: "Đẩy hông lên, siết mông.",
    defaultWeightKg: 20,
    imageUrl: "/hip.jpg",
    animationUrl: null,
  },
  {
    id: "plank",
    name: "Plank",
    muscleGroup: "Bụng",
    note: "Giữ thân người thẳng.",
    defaultWeightKg: null,
    imageUrl: null,
    animationUrl: null,
  },
];

test("filterCatalogPickerItems hides exercises already in the day", () => {
  const result = filterCatalogPickerItems({
    items,
    existingIds: ["rdl"],
    query: "",
    activeGroup: "all",
  });

  assert.deepEqual(
    result.map((item) => item.id),
    ["hip-thrust", "plank"],
  );
});

test("filterCatalogPickerItems hides QA catalog rows that should not be user-visible", () => {
  const result = filterCatalogPickerItems({
    items: [
      { ...items[0], id: "qa", slug: "qa-fit-123-squat", imageUrl: "https://res.cloudinary.com/demo/image/upload/sample.jpg" },
      { ...items[1], id: "real", slug: "hip-thrust" },
    ],
    existingIds: [],
    query: "",
    activeGroup: "all",
  });

  assert.deepEqual(
    result.map((item) => item.id),
    ["real"],
  );
});

test("filterCatalogPickerItems searches by name, muscle group and note", () => {
  assert.deepEqual(
    filterCatalogPickerItems({ items, existingIds: [], query: "lưng", activeGroup: "all" }).map((item) => item.id),
    ["rdl"],
  );
  assert.deepEqual(
    filterCatalogPickerItems({ items, existingIds: [], query: "mông", activeGroup: "all" }).map((item) => item.id),
    ["hip-thrust"],
  );
  assert.deepEqual(
    filterCatalogPickerItems({ items, existingIds: [], query: "plank", activeGroup: "Bụng" }).map((item) => item.id),
    ["plank"],
  );
});

test("buildCatalogPickerGroups keeps all first and removes blank groups", () => {
  assert.deepEqual(buildCatalogPickerGroups([...items, { ...items[0], id: "blank", muscleGroup: " " }]), [
    "all",
    "Chân",
    "Mông",
    "Bụng",
  ]);
});

test("buildCatalogPickerGroups normalizes mojibake muscle groups from existing catalog data", () => {
  const result = buildCatalogPickerGroups([
    { ...items[0], id: "bad-leg", muscleGroup: "Ch?n" },
    { ...items[1], id: "bad-calf", muscleGroup: "B?p ch?n" },
    { ...items[2], id: "bad-quad", muscleGroup: "??i tr??c" },
    { ...items[2], id: "qa-quad", slug: "qa-fit-123-quad", muscleGroup: "??i tr??c" },
    { ...items[0], id: "good-leg", muscleGroup: "Chân" },
  ]);

  assert.deepEqual(result, ["all", "Chân", "Bắp chân", "Đùi trước"]);
  assert.equal(getCatalogPickerDisplayGroup("Ch?n"), "Chân");
});

test("filterCatalogPickerItems matches normalized Vietnamese muscle group labels", () => {
  const result = filterCatalogPickerItems({
    items: [{ ...items[0], id: "bad-leg", muscleGroup: "Ch?n" }],
    existingIds: [],
    query: "chân",
    activeGroup: "Chân",
  });

  assert.deepEqual(
    result.map((item) => item.id),
    ["bad-leg"],
  );
});

test("getCatalogPickerSelection returns selected items in selected order", () => {
  const result = getCatalogPickerSelection(items, ["plank", "rdl", "missing"]);

  assert.deepEqual(
    result.map((item) => item.id),
    ["plank", "rdl"],
  );
});

test("getCatalogPickerSubmitLabel shows a clear disabled and selected label", () => {
  assert.equal(getCatalogPickerSubmitLabel("Thêm vào buổi này", 0), "Chọn ít nhất 1 bài");
  assert.equal(getCatalogPickerSubmitLabel("Thêm vào buổi này", 1), "Thêm 1 bài vào buổi này");
  assert.equal(getCatalogPickerSubmitLabel("Thêm vào buổi này", 3), "Thêm 3 bài vào buổi này");
  assert.equal(getCatalogPickerSubmitLabel("Thêm bài vào Thứ 7", 1), "Thêm 1 bài vào Thứ 7");
});

test("replace mode keeps one selected exercise and uses clear copy", () => {
  assert.deepEqual(toggleCatalogPickerSelection(["rdl"], "plank", "single"), ["plank"]);
  assert.deepEqual(toggleCatalogPickerSelection(["plank"], "plank", "single"), []);
  assert.equal(getCatalogPickerSubmitLabel("Thay bài", 0, "replace"), "Chọn 1 bài để thay");
  assert.equal(getCatalogPickerSubmitLabel("Thay bài", 1, "replace"), "Thay bằng bài đã chọn");
});
