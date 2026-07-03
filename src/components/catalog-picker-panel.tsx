"use client";

import { useMemo, useState } from "react";
import { ExerciseMediaPreview } from "@/components/exercise-media-preview";
import { AppButton, AppInput } from "@/components/ui";
import {
  buildCatalogPickerGroups,
  filterCatalogPickerItems,
  getCatalogPickerDisplayGroup,
  getCatalogPickerSelection,
  getCatalogPickerSubmitLabel,
  type CatalogPickerItem,
} from "@/lib/catalog-picker";
import { getExerciseMedia } from "@/lib/exercise-media";

type CatalogPickerPanelProps = {
  items: CatalogPickerItem[];
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

  const muscleGroups = useMemo(() => buildCatalogPickerGroups(items), [items]);
  const filteredItems = useMemo(
    () => filterCatalogPickerItems({ items, existingIds, query, activeGroup }),
    [activeGroup, existingIds, items, query],
  );
  const selectedItems = useMemo(() => getCatalogPickerSelection(items, selectedIds), [items, selectedIds]);
  const selectedCount = selectedIds.length;
  const buttonLabel = getCatalogPickerSubmitLabel(submitLabel, selectedCount);

  function toggleSelected(id: string) {
    setSelectedIds((current) => {
      if (current.includes(id)) {
        return current.filter((itemId) => itemId !== id);
      }

      return [...current, id];
    });
  }

  return (
    <div className="rounded-[20px] border border-[#243041] bg-[#0F172A] shadow-[0_18px_40px_rgba(0,0,0,0.22)]">
      {selectedIds.map((id) => (
        <input key={id} type="hidden" name="catalogItemIds" value={id} />
      ))}

      <div className="rounded-t-[20px] border-b border-[#1E293B] bg-[#111C2E] px-4 py-4">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <h3 className="break-words text-[18px] font-black leading-6 text-[#F8FAFC]">{title}</h3>
            <p className="mt-1 text-[13px] leading-5 text-[#94A3B8]">{description}</p>
          </div>
          <div className="shrink-0 rounded-full border border-[#0EA5E9]/30 bg-[#0EA5E9]/10 px-3 py-1 text-[12px] font-black text-[#7DD3FC]">
            {selectedCount} đã chọn
          </div>
        </div>
      </div>

      <div className="space-y-4 px-4 pb-[150px] pt-4">
        <AppInput
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Tìm tên bài hoặc nhóm cơ"
          className="border-[#314155] bg-[#111C2E]"
        />

        <div className="-mx-1 flex max-w-full gap-2 overflow-x-auto px-1 pb-1">
          {muscleGroups.map((group) => {
            const isActive = group === activeGroup;
            const label = group === "all" ? "Phù hợp" : group;

            return (
              <button
                key={group}
                type="button"
                onClick={() => setActiveGroup(group)}
                className={`shrink-0 rounded-full border px-3 py-2 text-[13px] font-black transition ${
                  isActive ? "border-[#0EA5E9] bg-[#0EA5E9] text-[#082F49]" : "border-[#334155] bg-[#111827] text-[#CBD5E1]"
                }`}
              >
                {label}
              </button>
            );
          })}
        </div>

        <div className="rounded-[18px] border border-[#263244] bg-[#0B1220] p-3">
          <div className="flex items-center justify-between gap-3">
            <p className="text-[13px] font-black text-[#E2E8F0]">Đã chọn {selectedCount} bài</p>
            {selectedCount > 0 ? (
              <button type="button" className="text-[12px] font-bold text-[#7DD3FC]" onClick={() => setSelectedIds([])}>
                Bỏ chọn hết
              </button>
            ) : null}
          </div>
          {selectedItems.length > 0 ? (
            <div className="mt-2 flex max-w-full flex-wrap gap-2">
              {selectedItems.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => toggleSelected(item.id)}
                  className="min-w-0 max-w-full rounded-full border border-[#22C55E]/40 bg-[#123522] px-3 py-2 text-left text-[13px] font-black text-[#BBF7D0]"
                >
                  <span className="break-words">{item.name} ×</span>
                </button>
              ))}
            </div>
          ) : (
            <p className="mt-1 text-[13px] leading-5 text-[#94A3B8]">Bấm “Chọn bài này” ở bài bạn muốn thêm.</p>
          )}
        </div>

        {filteredItems.length > 0 ? (
          <div className="space-y-3">
            {filteredItems.map((item) => {
              const isSelected = selectedIds.includes(item.id);
              const media = getExerciseMedia(item, "list");
              const displayGroup = getCatalogPickerDisplayGroup(item.muscleGroup);

              return (
                <article
                  key={item.id}
                  className={`min-w-0 rounded-[18px] border p-3 transition ${
                    isSelected ? "border-[#22C55E] bg-[#0D2418] shadow-[0_0_0_1px_rgba(34,197,94,0.18)]" : "border-[#263244] bg-[#111827]"
                  }`}
                >
                  <ExerciseMediaPreview
                    media={media}
                    alt={item.name}
                    width={640}
                    height={360}
                    imageClassName="aspect-[16/9] w-full rounded-[15px] object-cover"
                    placeholderClassName="flex aspect-[16/9] w-full items-center justify-center rounded-[15px] border border-dashed border-[#334155] bg-[#0B1220] px-3 text-center text-[14px] font-black text-[#94A3B8]"
                    placeholderLabel="Chưa có ảnh"
                    buttonClassName="block w-full rounded-[15px]"
                    sizes="(max-width: 480px) calc(100vw - 56px), 424px"
                  />

                  <div className="mt-3 min-w-0">
                    <div className="flex min-w-0 items-start justify-between gap-3">
                      <div className="min-w-0">
                        <h4 className="break-words text-[17px] font-black leading-6 text-[#F8FAFC]">{item.name}</h4>
                        <p className="mt-1 text-[13px] font-bold text-[#7DD3FC]">
                          {displayGroup || "Chưa phân nhóm"}
                          {item.defaultWeightKg ? ` · ${item.defaultWeightKg} kg gợi ý` : ""}
                        </p>
                      </div>
                      {media.kind === "animation" ? (
                        <span className="shrink-0 rounded-full border border-[#22C55E]/30 bg-[#22C55E]/10 px-2 py-1 text-[11px] font-black text-[#BBF7D0]">
                          GIF
                        </span>
                      ) : null}
                    </div>

                    {item.note ? <p className="mt-2 max-h-[44px] overflow-hidden text-[13px] leading-[22px] text-[#B7C6D8]">{item.note}</p> : null}

                    <button
                      type="button"
                      onClick={() => toggleSelected(item.id)}
                      className={`mt-3 min-h-[48px] w-full rounded-[15px] px-4 text-[15px] font-black transition active:scale-[0.99] ${
                        isSelected ? "bg-[#22C55E] text-white" : "border border-[#334155] bg-[#172234] text-[#E2E8F0]"
                      }`}
                    >
                      {isSelected ? "Đã chọn ✓" : "Chọn bài này"}
                    </button>
                  </div>
                </article>
              );
            })}
          </div>
        ) : (
          <div className="rounded-[16px] border border-dashed border-[#334155] bg-[#111827] px-4 py-6 text-center text-[13px] text-[#94A3B8]">
            {emptyLabel}
          </div>
        )}
      </div>

      <div className="sticky bottom-[calc(76px+env(safe-area-inset-bottom))] z-10 rounded-b-[20px] border-t border-[#1E293B] bg-[#0B1220]/95 px-4 py-4 backdrop-blur">
        <div className="mb-2 flex items-center justify-between gap-3 text-[13px]">
          <span className="font-black text-[#E2E8F0]">{selectedCount} bài đã chọn</span>
          <span className="text-right font-bold text-[#94A3B8]">Thêm vào buổi tập</span>
        </div>
        <AppButton className="w-full text-[16px] font-black" disabled={selectedCount === 0}>
          {buttonLabel}
        </AppButton>
      </div>
    </div>
  );
}
