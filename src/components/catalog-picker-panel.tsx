"use client";

import { useMemo, useState } from "react";
import { AppButton, AppInput } from "@/components/ui";

type CatalogItem = {
  id: string;
  name: string;
  muscleGroup: string | null;
  note?: string | null;
  defaultWeightKg?: number | null;
};

type CatalogPickerPanelProps = {
  items: CatalogItem[];
  existingIds?: string[];
  title: string;
  description: string;
  submitLabel: string;
  emptyLabel?: string;
};

export function CatalogPickerPanel({
  items,
  existingIds = [],
  title,
  description,
  submitLabel,
  emptyLabel = "Chưa có bài tập nào để chọn.",
}: CatalogPickerPanelProps) {
  const [query, setQuery] = useState("");
  const [activeGroup, setActiveGroup] = useState<string>("all");
  const [selectedIds, setSelectedIds] = useState<string[]>([]);

  const muscleGroups = useMemo(() => {
    const groups = Array.from(new Set(items.map((item) => item.muscleGroup?.trim()).filter(Boolean))) as string[];
    return ["all", ...groups];
  }, [items]);

  const filteredItems = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();

    return items.filter((item) => {
      if (existingIds.includes(item.id)) {
        return false;
      }

      const matchesGroup = activeGroup === "all" || item.muscleGroup === activeGroup;
      const haystack = `${item.name} ${item.muscleGroup ?? ""} ${item.note ?? ""}`.toLowerCase();
      const matchesQuery = normalizedQuery.length === 0 || haystack.includes(normalizedQuery);
      return matchesGroup && matchesQuery;
    });
  }, [activeGroup, existingIds, items, query]);

  const selectedCount = selectedIds.length;

  function toggleSelected(id: string, checked: boolean) {
    setSelectedIds((current) => {
      if (checked) {
        return current.includes(id) ? current : [...current, id];
      }
      return current.filter((itemId) => itemId !== id);
    });
  }

  return (
    <div className="overflow-hidden rounded-[18px] border border-[#243041] bg-[#0F172A]">
      {selectedIds.map((id) => (
        <input key={id} type="hidden" name="catalogItemIds" value={id} />
      ))}

      <div className="border-b border-[#1E293B] px-4 py-4">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <h3 className="text-[17px] font-bold text-[#F8FAFC]">{title}</h3>
            <p className="mt-1 text-[13px] leading-5 text-[#94A3B8]">{description}</p>
          </div>
          <div className="rounded-full border border-[#0EA5E9]/30 bg-[#0EA5E9]/10 px-3 py-1 text-[12px] font-semibold text-[#7DD3FC]">
            {selectedCount} đã chọn
          </div>
        </div>
      </div>

      <div className="space-y-3 px-4 py-4">
        <AppInput
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Tìm theo tên bài hoặc nhóm cơ"
          className="border-[#314155] bg-[#111C2E]"
        />

        <div className="-mx-1 flex gap-2 overflow-x-auto px-1 pb-1">
          {muscleGroups.map((group) => {
            const isActive = group === activeGroup;
            const label = group === "all" ? "Tất cả" : group;

            return (
              <button
                key={group}
                type="button"
                onClick={() => setActiveGroup(group)}
                className={`shrink-0 rounded-full border px-3 py-2 text-[13px] font-semibold transition ${
                  isActive
                    ? "border-[#0EA5E9] bg-[#0EA5E9] text-[#082F49]"
                    : "border-[#334155] bg-[#111827] text-[#CBD5E1]"
                }`}
              >
                {label}
              </button>
            );
          })}
        </div>

        {filteredItems.length > 0 ? (
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
            {filteredItems.map((item) => {
              const checked = selectedIds.includes(item.id);

              return (
                <label
                  key={item.id}
                  className={`flex min-h-[92px] cursor-pointer items-start gap-3 rounded-[16px] border px-3 py-3 transition ${
                    checked
                      ? "border-[#0EA5E9] bg-[#0C2537] shadow-[0_0_0_1px_rgba(14,165,233,0.18)]"
                      : "border-[#263244] bg-[#111827]"
                  }`}
                >
                  <input
                    type="checkbox"
                    checked={checked}
                    onChange={(event) => toggleSelected(item.id, event.target.checked)}
                    className="mt-1 h-5 w-5 shrink-0 accent-[#0EA5E9]"
                  />
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="truncate text-[15px] font-bold text-[#F8FAFC]">{item.name}</p>
                      {item.defaultWeightKg ? (
                        <span className="shrink-0 rounded-full bg-[#1E293B] px-2 py-1 text-[11px] font-semibold text-[#CBD5E1]">
                          {item.defaultWeightKg} kg
                        </span>
                      ) : null}
                    </div>
                    <p className="mt-1 text-[12px] font-medium text-[#7DD3FC]">{item.muscleGroup || "Chưa phân nhóm"}</p>
                    {item.note ? <p className="mt-2 text-[12px] leading-5 text-[#94A3B8]">{item.note}</p> : null}
                  </div>
                </label>
              );
            })}
          </div>
        ) : (
          <div className="rounded-[16px] border border-dashed border-[#334155] bg-[#111827] px-4 py-6 text-center text-[13px] text-[#94A3B8]">
            {emptyLabel}
          </div>
        )}
      </div>

      <div className="border-t border-[#1E293B] bg-[#0B1220] px-4 py-4">
        <AppButton className="w-full bg-[#0EA5E9] text-[#082F49] hover:bg-[#38BDF8]" disabled={selectedCount === 0}>
          {selectedCount > 0 ? `${submitLabel} (${selectedCount})` : submitLabel}
        </AppButton>
      </div>
    </div>
  );
}
