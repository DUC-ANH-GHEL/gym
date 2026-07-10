"use client";

import { usePathname } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";

const TEXT = {
  loading: "Đang xử lý...",
};

function isModifiedClick(event: MouseEvent) {
  return event.metaKey || event.ctrlKey || event.shiftKey || event.altKey || event.button !== 0;
}

function isDisabledElement(element: Element) {
  return element instanceof HTMLButtonElement || element instanceof HTMLInputElement
    ? element.disabled
    : element.getAttribute("aria-disabled") === "true";
}

function shouldIgnoreAnchor(anchor: HTMLAnchorElement) {
  const href = anchor.getAttribute("href") ?? "";
  return !href || href.startsWith("#") || anchor.target === "_blank" || anchor.hasAttribute("download");
}

export function GlobalLoadingFeedback() {
  const pathname = usePathname();
  const [loadingPath, setLoadingPath] = useState<string | null>(null);
  const timeoutRef = useRef<number | null>(null);
  const active = loadingPath === pathname;

  const clearLoading = useCallback(() => {
    if (timeoutRef.current) {
      window.clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
    setLoadingPath(null);
  }, []);

  const startLoading = useCallback((durationMs: number) => {
    if (timeoutRef.current) {
      window.clearTimeout(timeoutRef.current);
    }
    setLoadingPath(pathname);
    timeoutRef.current = window.setTimeout(() => {
      timeoutRef.current = null;
      setLoadingPath(null);
    }, durationMs);
  }, [pathname]);

  useEffect(() => {
    if (timeoutRef.current) {
      window.clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
  }, [pathname]);

  useEffect(() => {
    function handleSubmit(event: SubmitEvent) {
      if (event.defaultPrevented) {
        return;
      }

      startLoading(12000);
    }

    function handleClick(event: MouseEvent) {
      if (event.defaultPrevented || isModifiedClick(event)) {
        return;
      }

      const target = event.target instanceof Element ? event.target : null;
      const interactive = target?.closest("button, a[href], input[type='button'], input[type='submit'], [role='button']");
      if (!interactive || interactive.closest("[data-no-global-loading]") || isDisabledElement(interactive)) {
        return;
      }

      if (interactive instanceof HTMLAnchorElement) {
        if (shouldIgnoreAnchor(interactive)) {
          return;
        }
        startLoading(4500);
        return;
      }

      if (interactive instanceof HTMLButtonElement && (interactive.type || "submit") === "submit") {
        return;
      }

      if (interactive instanceof HTMLInputElement && interactive.type === "submit") {
        return;
      }

      startLoading(520);
    }

    document.addEventListener("submit", handleSubmit, true);
    document.addEventListener("click", handleClick, true);
    window.addEventListener("pageshow", clearLoading);

    return () => {
      document.removeEventListener("submit", handleSubmit, true);
      document.removeEventListener("click", handleClick, true);
      window.removeEventListener("pageshow", clearLoading);
      if (timeoutRef.current) {
        window.clearTimeout(timeoutRef.current);
      }
    };
  }, [clearLoading, startLoading]);

  return (
    <div
      aria-live="polite"
      aria-atomic="true"
      className={`pointer-events-none fixed inset-x-0 top-0 z-[80] flex justify-center px-3 pt-[calc(env(safe-area-inset-top)+8px)] transition duration-150 ${
        active ? "translate-y-0 opacity-100" : "-translate-y-2 opacity-0"
      }`}
    >
      <div className="max-w-[calc(100vw-24px)] rounded-full border border-[#38BDF8]/35 bg-[#0B1220]/95 px-3 py-2 text-[13px] font-black text-[#E0F2FE] shadow-[0_16px_36px_rgba(0,0,0,0.35)] backdrop-blur">
        <span className="inline-flex min-w-0 items-center gap-2">
          <span className="h-4 w-4 shrink-0 animate-spin rounded-full border-2 border-[#7DD3FC] border-t-transparent" aria-hidden="true" />
          <span className="truncate">{TEXT.loading}</span>
        </span>
      </div>
    </div>
  );
}
