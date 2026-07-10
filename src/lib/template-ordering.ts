export type MoveDirection = "up" | "down";

type OrderedItem = {
  id: string;
  orderIndex: number;
  createdAt?: Date | string | null;
};

export type OrderIndexUpdate = {
  id: string;
  orderIndex: number;
};

function getCreatedAtMs(value: Date | string | null | undefined) {
  if (value instanceof Date) {
    return value.getTime();
  }

  if (typeof value === "string") {
    const time = Date.parse(value);
    return Number.isNaN(time) ? 0 : time;
  }

  return 0;
}

export function sortOrderedItems<TItem extends OrderedItem>(items: TItem[]) {
  return [...items].sort((left, right) => {
    if (left.orderIndex !== right.orderIndex) {
      return left.orderIndex - right.orderIndex;
    }

    const createdAtDiff = getCreatedAtMs(left.createdAt) - getCreatedAtMs(right.createdAt);
    if (createdAtDiff !== 0) {
      return createdAtDiff;
    }

    return left.id.localeCompare(right.id);
  });
}

export function getNextOrderIndex(items: Pick<OrderedItem, "orderIndex">[]) {
  if (items.length === 0) {
    return 0;
  }

  return Math.max(...items.map((item) => item.orderIndex)) + 1;
}

export function buildMovedOrderIndexUpdates<TItem extends OrderedItem>(
  items: TItem[],
  currentId: string,
  direction: MoveDirection,
): OrderIndexUpdate[] {
  if (direction !== "up" && direction !== "down") {
    return [];
  }

  const orderedItems = sortOrderedItems(items);
  const currentIndex = orderedItems.findIndex((item) => item.id === currentId);
  const targetIndex = direction === "up" ? currentIndex - 1 : currentIndex + 1;

  if (currentIndex < 0 || targetIndex < 0 || targetIndex >= orderedItems.length) {
    return [];
  }

  const nextItems = [...orderedItems];
  [nextItems[currentIndex], nextItems[targetIndex]] = [nextItems[targetIndex], nextItems[currentIndex]];

  return nextItems
    .map((item, orderIndex) => ({ id: item.id, orderIndex }))
    .filter((item) => orderedItems.find((original) => original.id === item.id)?.orderIndex !== item.orderIndex);
}
