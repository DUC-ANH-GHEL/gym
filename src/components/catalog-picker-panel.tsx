"use client";

import { useMemo, useState } from "react";
import { useFormStatus } from "react-dom";
import { ExerciseMediaPreview } from "@/components/exercise-media-preview";
import { AppButton, AppInput } from "@/components/ui";
import {
  buildCatalogPickerGroups,
  filterCatalogPickerItems,
  getCatalogPickerDisplayGroup,
  getCatalogPickerSelection,
  getCatalogPickerSubmitLabel,
  toggleCatalogPickerSelection,
  type CatalogPickerItem,
  type CatalogPickerSelectionMode,
} from "@/lib/catalog-picker";
import { getExerciseMedia } from "@/lib/exercise-media";

type CatalogPickerPanelProps = {
  items: CatalogPickerItem[];
  existingIds?: string[];
  title: string;
  description: string;
  submitLabel: string;
  emptyLabel?: string;
  selectionMode?: CatalogPickerSelectionMode;
  pendingLabel?: string;
  actionSummary?: string;
};

function CatalogPickerSubmitButton({
  label,
  disabled,
  pendingLabel,
  className = "",
}: {
  label: string;
  disabled: boolean;
  pendingLabel: string;
  className?: string;
}) {
  const { pending } = useFormStatus();

  return (
    <AppButton className={className} disabled={disabled || pending}>
      {pending ? pendingLabel : label}
    </AppButton>
  );
}

export function CatalogPickerPanel({
  items,
  existingIds = [],
  title,
  description,
  submitLabel,
  emptyLabel = "Chưa có bài tập nào để chọn.",
  selectionMode = "multiple",
  pendingLabel = "Đang thêm...",
  actionSummary = "Thêm vào buổi tập",
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
  const buttonLabel = getCatalogPickerSubmitLabel(submitLabel, selectedCount, selectionMode);

  function toggleSelected(id: string) {
    setSelectedIds((current) => toggleCatalogPickerSelection(current, id, selectionMode));
  }

  return (
    <div className="relative min-w-0 overflow-hidden rounded-[20px] border border-[#1F2329] bg-[#0A0B0D] shadow-[0_18px_40px_rgba(0,0,0,0.22)]">
      {selectedIds.map((id) => (
        <input key={id} type="hidden" name="catalogItemIds" value={id} />
      ))}

      <div className="border-b border-[#1B1E23] bg-[#14161A] px-4 py-4">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0">
            <h3 className="break-words text-[18px] font-black leading-6 text-[#F4F5F7]">{title}</h3>
            <p className="mt-1 text-[14px] leading-6 text-[#8B919B]">{description}</p>
          </div>
          <div className="shrink-0 rounded-full border border-[#C8F31D]/30 bg-[#C8F31D]/10 px-3 py-1 text-[12px] font-black text-[#C8F31D]">
            {selectedCount} đã chọn
          </div>
        </div>
      </div>

      <div className="space-y-4 px-4 pb-4 pt-4">
        <AppInput
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Tìm tên bài hoặc nhóm cơ"
          className="border-[#2A2F36] bg-[#14161A]"
        />

        <div className="flex max-w-full flex-wrap gap-2">
          {muscleGroups.map((group) => {
            const isActive = group === activeGroup;
            const label = group === "all" ? "Tất cả" : group;

            return (
              <button
                key={group}
                type="button"
                onClick={() => setActiveGroup(group)}
                className={`min-h-[40px] rounded-full border px-3 py-2 text-[13px] font-black transition ${
                  isActive ? "border-[#C8F31D] bg-[#C8F31D] text-[#14161A]" : "border-[#2A2F36] bg-[#14161A] text-[#B6BBC4]"
                }`}
              >
                {label}
              </button>
            );
          })}
        </div>

        <div className="rounded-[18px] border border-[#263244] bg-[#0A0B0D] p-3">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <p className="text-[13px] font-black text-[#B6BBC4]">{selectedCount > 0 ? `Đã chọn ${selectedCount} bài` : "Chưa chọn bài nào"}</p>
            {selectedCount > 0 ? (
              <button type="button" className="text-[12px] font-bold text-[#C8F31D]" onClick={() => setSelectedIds([])}>
                Bỏ chọn hết
              </button>
            ) : null}
          </div>
          {selectedItems.length > 0 ? (
            <>
              <div className="mt-2 flex max-w-full flex-wrap gap-2">
                {selectedItems.map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => toggleSelected(item.id)}
                    className="min-w-0 max-w-full rounded-full border border-[#C8F31D]/40 bg-[#123522] px-3 py-2 text-left text-[13px] font-black text-[#C8F31D]"
                  >
                    <span className="break-words">{item.name} x</span>
                  </button>
                ))}
              </div>
              <CatalogPickerSubmitButton label={buttonLabel} disabled={selectedCount === 0} pendingLabel={pendingLabel} className="mt-3 w-full text-[15px] font-black" />
            </>
          ) : (
            <p className="mt-1 text-[13px] leading-5 text-[#8B919B]">
              {selectionMode === "multiple" ? "Bấm chọn ở bài bạn muốn thêm." : "Bấm chọn bài mới để thay bài hiện tại."}
            </p>
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
                    isSelected ? "border-[#C8F31D] bg-[#0D2418] shadow-[0_0_0_1px_rgba(34,197,94,0.18)]" : "border-[#263244] bg-[#14161A]"
                  }`}
                >
                  <button
                    type="button"
                    onClick={() => toggleSelected(item.id)}
                    aria-pressed={isSelected}
                    className={`mb-3 flex min-h-[52px] w-full min-w-0 items-center gap-3 rounded-[15px] border px-3 text-left transition active:scale-[0.99] ${
                      isSelected
                        ? "border-[#C8F31D] bg-[#14532D] text-[#DCFCE7]"
                        : "border-[#C8F31D]/45 bg-[#0C2537] text-[#E0F2FE] hover:border-[#C8F31D]"
                    }`}
                  >
                    <span
                      className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full border text-[16px] font-black ${
                        isSelected ? "border-[#C8F31D] bg-[#C8F31D] text-[#052E16]" : "border-[#C8F31D] bg-[#14161A] text-[#BAE6FD]"
                      }`}
                      aria-hidden="true"
                    >
                      {isSelected ? "✓" : "+"}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block text-[15px] font-black leading-5">{isSelected ? "Đã chọn" : "Chọn bài này"}</span>
                      <span className="mt-0.5 block break-words text-[13px] font-bold opacity-85">{item.name}</span>
                    </span>
                  </button>

                  <ExerciseMediaPreview
                    media={media}
                    alt={item.name}
                    width={640}
                    height={360}
                    imageClassName="aspect-[16/9] w-full rounded-[15px] object-cover"
                    placeholderClassName="flex aspect-[16/9] w-full items-center justify-center rounded-[15px] border border-dashed border-[#2A2F36] bg-[#0A0B0D] px-3 text-center text-[14px] font-black text-[#8B919B]"
                    placeholderLabel="Chưa có ảnh"
                    buttonClassName="block w-full rounded-[15px]"
                    sizes="(max-width: 480px) calc(100vw - 56px), 424px"
                  />

                  <div className="mt-3 min-w-0">
                    <div className="flex min-w-0 flex-wrap items-start justify-between gap-3">
                      <div className="min-w-0">
                        <h4 className="break-words text-[17px] font-black leading-6 text-[#F4F5F7]">{item.name}</h4>
                        <p className="mt-1 text-[13px] font-bold text-[#C8F31D]">
                          {displayGroup || "Chưa phân nhóm"}
                          {item.defaultWeightKg ? ` · ${item.defaultWeightKg} kg gợi ý` : ""}
                        </p>
                      </div>
                      {media.kind === "animation" ? (
                        <span className="shrink-0 rounded-full border border-[#C8F31D]/30 bg-[#C8F31D]/10 px-2 py-1 text-[11px] font-black text-[#C8F31D]">
                          GIF
                        </span>
                      ) : null}
                    </div>

                    {item.note ? <p className="mt-2 max-h-[44px] overflow-hidden text-[13px] leading-[22px] text-[#B6BBC4]">{item.note}</p> : null}

                    <button
                      type="button"
                      onClick={() => toggleSelected(item.id)}
                      className={`mt-3 min-h-[48px] w-full rounded-[15px] px-4 text-[15px] font-black transition active:scale-[0.99] ${
                        isSelected ? "bg-[#C8F31D] text-[#0A0B0D]" : "border border-[#2A2F36] bg-[#172234] text-[#B6BBC4]"
                      }`}
                    >
                      {isSelected ? "Bỏ chọn bài này" : "Chọn bài này"}
                    </button>
                  </div>
                </article>
              );
            })}
          </div>
        ) : (
          <div className="rounded-[16px] border border-dashed border-[#2A2F36] bg-[#14161A] px-4 py-6 text-center text-[13px] leading-5 text-[#8B919B]">
            {emptyLabel}
          </div>
        )}
      </div>

      <div className="sticky bottom-[calc(76px+env(safe-area-inset-bottom))] z-10 border-t border-[#1B1E23] bg-[#0A0B0D]/95 px-4 py-4 backdrop-blur">
        <div className="mb-2 flex flex-wrap items-center justify-between gap-3 text-[13px]">
          <span className="font-black text-[#B6BBC4]">{selectedCount} bài đã chọn</span>
          <span className="font-bold text-[#8B919B]">{actionSummary}</span>
        </div>
        <CatalogPickerSubmitButton label={buttonLabel} disabled={selectedCount === 0} pendingLabel={pendingLabel} className="w-full text-[16px] font-black" />
      </div>
    </div>
  );
}
