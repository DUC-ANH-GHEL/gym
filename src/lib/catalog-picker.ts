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

export function getCatalogPickerSubmitLabel(baseLabel: string, selectedCount: number) {
  if (selectedCount <= 0) {
    return "Chọn ít nhất 1 bài";
  }

  const action = baseLabel.split(" ")[0] || "Thêm";
  return `${action} ${selectedCount} bài vào buổi này`;
}
