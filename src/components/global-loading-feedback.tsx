"use client";

import { usePathname } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";

const TEXT = {
  loading: "\u0110ang x\u1eed l\u00fd...",
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
  const loading = loadingPath === pathname;

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
      if (!event.defaultPrevented) {
        startLoading(12000);
      }
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
        if (!shouldIgnoreAnchor(interactive)) {
          startLoading(4500);
        }
        return;
      }

      if (
        (interactive instanceof HTMLButtonElement && (interactive.type || "submit") === "submit") ||
        (interactive instanceof HTMLInputElement && interactive.type === "submit")
      ) {
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
      aria-atomic="true"
      aria-busy={loading}
      aria-live="polite"
      className={`fixed inset-0 z-[100] flex items-center justify-center bg-[#0B0F14]/78 px-6 backdrop-blur-sm transition duration-150 ${
        loading ? "pointer-events-auto opacity-100" : "pointer-events-none opacity-0"
      }`}
    >
      <div className="flex min-h-[120px] w-full max-w-[280px] flex-col items-center justify-center rounded-[18px] border border-[#263241] bg-[#111827] px-5 py-5 text-center shadow-[0_24px_70px_rgba(0,0,0,0.45)]">
        <span className="h-10 w-10 animate-spin rounded-full border-4 border-[#334155] border-t-[#38BDF8]" aria-hidden="true" />
        <p className="mt-3 text-[17px] font-black text-[#F9FAFB]">{TEXT.loading}</p>
      </div>
    </div>
  );
}
