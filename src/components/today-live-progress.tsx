"use client";

import { useEffect, useSyncExternalStore } from "react";
import { todayOptimisticStore } from "@/lib/today-optimistic-store";

function useLiveCompleted(completed: number, total: number) {
  const delta = useSyncExternalStore(
    todayOptimisticStore.subscribe,
    todayOptimisticStore.getSnapshot,
    todayOptimisticStore.getServerSnapshot,
  );

  // Fresh server numbers replace the optimistic guess.
  useEffect(() => {
    todayOptimisticStore.reset();
  }, [completed]);

  return Math.min(total, Math.max(0, completed + delta));
}

export function LiveSetCount({ completed, total }: { completed: number; total: number }) {
  const live = useLiveCompleted(completed, total);

  return (
    <>
      {live}
      <span className="text-[14px] font-bold text-[#8B919B]">/{total}</span>
    </>
  );
}

export function LiveSegmentedProgress({ completed, total }: { completed: number; total: number }) {
  const live = useLiveCompleted(completed, total);
  const segments = Math.min(total, 40);
  const filled = total > 0 ? Math.round((live / total) * segments) : 0;

  return (
    <div className="flex gap-[3px]" aria-hidden="true">
      {Array.from({ length: segments }, (_, index) => (
        <span key={index} className={`h-[5px] flex-1 rounded-full ${index < filled ? "bg-[#C8F31D]" : "bg-[#23262B]"}`} />
      ))}
    </div>
  );
}
