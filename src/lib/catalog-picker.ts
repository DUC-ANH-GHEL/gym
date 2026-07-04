export type CatalogPickerItem = {
  id: string;
  slug?: string | null;
  name: string;
  muscleGroup: string | null;
  note?: string | null;
  defaultWeightKg?: number | null;
  imageUrl?: string | null;
  animationUrl?: string | null;
};

export type CatalogPickerFilterInput = {
  items: CatalogPickerItem[];
  existingIds: string[];
  query: string;
  activeGroup: string;
};

export type CatalogPickerSelectionMode = "multiple" | "single" | "replace";

const MUSCLE_GROUP_DISPLAY_FIXES: Record<string, string> = {
  "Ch?n": "Chân",
  "B?p ch?n": "Bắp chân",
  "??i tr??c": "Đùi trước",
};

export function getCatalogPickerDisplayGroup(value: string | null | undefined) {
  const trimmed = value?.trim();
  if (!trimmed) {
    return "";
  }

  return MUSCLE_GROUP_DISPLAY_FIXES[trimmed] ?? trimmed;
}

export function isCatalogPickerVisibleItem(item: CatalogPickerItem) {
  const slug = item.slug?.trim().toLowerCase() || "";
  return !slug.startsWith("qa-");
}

export function buildCatalogPickerGroups(items: CatalogPickerItem[]) {
  const groups = Array.from(
    new Set(items.filter(isCatalogPickerVisibleItem).map((item) => getCatalogPickerDisplayGroup(item.muscleGroup)).filter(Boolean)),
  ) as string[];
  return ["all", ...groups];
}

export function filterCatalogPickerItems({ items, existingIds, query, activeGroup }: CatalogPickerFilterInput) {
  const normalizedQuery = query.trim().toLowerCase();
  const existingIdSet = new Set(existingIds);

  return items.filter((item) => {
    if (!isCatalogPickerVisibleItem(item)) {
      return false;
    }

    if (existingIdSet.has(item.id)) {
      return false;
    }

    const displayGroup = getCatalogPickerDisplayGroup(item.muscleGroup);
    const matchesGroup = activeGroup === "all" || displayGroup === activeGroup;
    const haystack = `${item.name} ${displayGroup} ${item.note ?? ""}`.toLowerCase();
    const matchesQuery = normalizedQuery.length === 0 || haystack.includes(normalizedQuery);
    return matchesGroup && matchesQuery;
  });
}

export function getCatalogPickerSelection(items: CatalogPickerItem[], selectedIds: string[]) {
  const itemById = new Map(items.map((item) => [item.id, item]));
  return selectedIds.map((id) => itemById.get(id)).filter(Boolean) as CatalogPickerItem[];
}

export function toggleCatalogPickerSelection(selectedIds: string[], id: string, mode: CatalogPickerSelectionMode = "multiple") {
  if (selectedIds.includes(id)) {
    return selectedIds.filter((itemId) => itemId !== id);
  }

  if (mode !== "multiple") {
    return [id];
  }

  return [...selectedIds, id];
}

export function getCatalogPickerSubmitLabel(baseLabel: string, selectedCount: number, mode: CatalogPickerSelectionMode = "multiple") {
  if (selectedCount <= 0) {
    if (mode !== "multiple") {
      return "Chọn 1 bài để thay";
    }

    return "Chọn ít nhất 1 bài";
  }

  if (mode !== "multiple") {
    return "Thay bằng bài đã chọn";
  }

  const target = baseLabel.trim().match(/^Thêm bài vào\s+(.+)$/i)?.[1]?.trim();
  if (target) {
    return `Thêm ${selectedCount} bài vào ${target}`;
  }

  return `Thêm ${selectedCount} bài vào buổi này`;
}
