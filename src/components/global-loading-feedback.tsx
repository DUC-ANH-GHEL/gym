"use client";

import { usePathname, useSearchParams } from "next/navigation";
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
  const searchParams = useSearchParams();
  // Query-only navigations (/today -> /today?exercise=...) must also end the loading state.
  const locationKey = `${pathname}?${searchParams.toString()}`;
  const [loadingPath, setLoadingPath] = useState<string | null>(null);
  const timeoutRef = useRef<number | null>(null);
  const loading = loadingPath === locationKey;

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
    setLoadingPath(locationKey);
    timeoutRef.current = window.setTimeout(() => {
      timeoutRef.current = null;
      setLoadingPath(null);
    }, durationMs);
  }, [locationKey]);

  useEffect(() => {
    if (timeoutRef.current) {
      window.clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
  }, [locationKey]);

  useEffect(() => {
    function handleSubmit(event: SubmitEvent) {
      const form = event.target;
      queueMicrotask(() => {
        if (
          event.defaultPrevented ||
          !(form instanceof HTMLFormElement) ||
          form.closest("[data-no-global-loading]")
        ) {
          return;
        }
        startLoading(12000);
      });
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
        if (!shouldIgnoreAnchor(interactive) && interactive.pathname !== window.location.pathname) {
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

  // Non-blocking and delayed: quick actions never flash it, slow ones show a small hint
  // without covering the screen or swallowing taps.
  return (
    <div
      aria-atomic="true"
      aria-busy={loading}
      aria-live="polite"
      className={`pointer-events-none fixed left-1/2 top-[calc(env(safe-area-inset-top)+8px)] z-[100] -translate-x-1/2 transition-opacity duration-150 ${
        loading ? "opacity-100 delay-[400ms]" : "opacity-0"
      }`}
    >
      <div className="flex items-center gap-2 rounded-full border border-[#1F2329] bg-[#14161A]/95 px-3 py-1.5 shadow-[0_8px_24px_rgba(0,0,0,0.4)]">
        <span className="h-4 w-4 animate-spin rounded-full border-2 border-[#2A2F36] border-t-[#C8F31D]" aria-hidden="true" />
        <p className="text-[13px] font-black text-[#F9FAFB]">{TEXT.loading}</p>
      </div>
    </div>
  );
}
