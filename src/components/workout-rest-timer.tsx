"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import { buildWorkoutNotificationOptions, shouldSyncPushSubscription } from "@/lib/workout-notification-options";
import { shouldShowLocalRestNotification } from "@/lib/workout-rest";

const TEXT = {
  defaultTitle: "T\u1edbi gi\u1edd t\u1eadp",
  defaultBody: "Ngh\u1ec9 xong r\u1ed3i. V\u00e0o t\u1eadp ti\u1ebfp nh\u00e9.",
  unsupported: "M\u00e1y n\u00e0y ch\u01b0a h\u1ed7 tr\u1ee3 th\u00f4ng b\u00e1o.",
  denied: "B\u1ea1n \u0111ang ch\u1eb7n th\u00f4ng b\u00e1o. M\u1edf c\u00e0i \u0111\u1eb7t tr\u00ecnh duy\u1ec7t \u0111\u1ec3 b\u1eadt l\u1ea1i.",
  notEnabled: "Ch\u01b0a b\u1eadt th\u00f4ng b\u00e1o, app v\u1eabn \u0111\u1ebfm gi\u1edd khi \u0111ang m\u1edf.",
  subscribed: "\u0110\u00e3 b\u1eadt nh\u1eafc ngh\u1ec9 cho m\u00e1y n\u00e0y.",
  localOnly: "\u0110\u00e3 b\u1eadt th\u00f4ng b\u00e1o tr\u00ean m\u00e1y n\u00e0y. Push n\u1ec1n c\u1ea7n c\u1ea5u h\u00ecnh VAPID tr\u00ean server.",
  enable: "B\u1eadt nh\u1eafc ngh\u1ec9",
  help: "Khi b\u1eadt th\u00f4ng b\u00e1o, app s\u1ebd b\u00e1o l\u00fac t\u1edbi set ho\u1eb7c b\u00e0i ti\u1ebfp theo. N\u1ebfu \u0111\u00e3 ch\u1eb7n th\u00f4ng b\u00e1o, c\u1ea7n b\u1eadt l\u1ea1i trong c\u00e0i \u0111\u1eb7t tr\u00ecnh duy\u1ec7t.",
};

function urlBase64ToUint8Array(base64String: string) {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const rawData = window.atob(base64);
  return Uint8Array.from([...rawData].map((char) => char.charCodeAt(0)));
}

async function ensureServiceWorker() {
  if (!("serviceWorker" in navigator)) {
    return null;
  }

  const registration = await navigator.serviceWorker.register("/sw.js");
  return registration;
}

async function subscribeForPush() {
  const registration = await ensureServiceWorker();
  const publicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;

  if (!registration || !("PushManager" in window) || !publicKey) {
    return false;
  }

  const existing = await registration.pushManager.getSubscription();
  const subscription =
    existing ??
    (await registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(publicKey),
    }));

  const response = await fetch("/api/workout-push/subscribe", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(subscription),
  });

  return response.ok;
}

async function showLocalNotification(title: string, body: string) {
  if (!("Notification" in window) || Notification.permission !== "granted") {
    return;
  }

  const registration = await ensureServiceWorker();
  if (registration) {
    await registration.showNotification(title, {
      ...buildWorkoutNotificationOptions({ url: "/today" }),
      body,
    });
  }
}

async function acknowledgeForegroundNotification(reminderId: string) {
  await fetch("/api/workout-reminders/acknowledge", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ reminderId }),
    keepalive: true,
  });
}

export function WorkoutRestTimer({
  body: initialBody,
  dueAtMs,
  reminderId,
  restSeconds: initialRestSeconds,
  showPrompt = true,
  title: initialTitle,
}: {
  body?: string | null;
  dueAtMs?: number | null;
  reminderId?: string | null;
  restSeconds?: number | null;
  showPrompt?: boolean;
  title?: string | null;
}) {
  const searchParams = useSearchParams();
  const urlDueAt = Number(searchParams.get("restDueAt") || 0);
  const dueAt = dueAtMs || urlDueAt;
  const title = initialTitle || searchParams.get("restTitle") || TEXT.defaultTitle;
  const body = initialBody || searchParams.get("restBody") || TEXT.defaultBody;
  const urlRestSeconds = Number(searchParams.get("rest") || 0);
  const restSeconds = initialRestSeconds || urlRestSeconds;
  const [now, setNow] = useState(() => Date.now());
  const [permission, setPermission] = useState<NotificationPermission | "unsupported">(() =>
    typeof window !== "undefined" && "Notification" in window ? Notification.permission : "unsupported",
  );
  const [message, setMessage] = useState("");
  const [pushSynced, setPushSynced] = useState(false);
  const wasHiddenDuringTimerRef = useRef(false);

  const timerKey = useMemo(() => (dueAt > now ? `${dueAt}:${title}` : ""), [dueAt, now, title]);
  const hasTimer = dueAt > now && restSeconds > 0;

  useEffect(() => {
    ensureServiceWorker().catch(() => undefined);
  }, []);

  useEffect(() => {
    if (!shouldSyncPushSubscription(permission) || pushSynced) {
      return;
    }

    let cancelled = false;
    subscribeForPush()
      .then((subscribed) => {
        if (!cancelled) {
          setPushSynced(subscribed);
        }
      })
      .catch(() => undefined);

    return () => {
      cancelled = true;
    };
  }, [permission, pushSynced]);

  useEffect(() => {
    if (!hasTimer) {
      wasHiddenDuringTimerRef.current = false;
      return;
    }

    wasHiddenDuringTimerRef.current = document.visibilityState !== "visible";
    const markWhenHidden = () => {
      if (document.visibilityState !== "visible") {
        wasHiddenDuringTimerRef.current = true;
      }
    };
    const interval = window.setInterval(() => setNow(Date.now()), 1000);
    document.addEventListener("visibilitychange", markWhenHidden);
    return () => {
      window.clearInterval(interval);
      document.removeEventListener("visibilitychange", markWhenHidden);
    };
  }, [hasTimer]);

  useEffect(() => {
    if (!hasTimer || !timerKey) {
      return;
    }

    const delay = dueAt - Date.now();
    if (delay <= 0) {
      return;
    }

    const timeout = window.setTimeout(() => {
      if (wasHiddenDuringTimerRef.current || !shouldShowLocalRestNotification(dueAt, Date.now())) {
        return;
      }

      const notifiedKey = `workout-rest-notified:${timerKey}`;
      if (window.sessionStorage.getItem(notifiedKey)) {
        return;
      }

      window.sessionStorage.setItem(notifiedKey, "1");
      showLocalNotification(title, body)
        .then(() => (reminderId ? acknowledgeForegroundNotification(reminderId) : undefined))
        .catch(() => undefined);
    }, delay);

    return () => window.clearTimeout(timeout);
  }, [body, dueAt, hasTimer, reminderId, timerKey, title]);

  async function enableReminder() {
    if (!("Notification" in window)) {
      setMessage(TEXT.unsupported);
      return;
    }

    if (Notification.permission === "denied") {
      setPermission("denied");
      setMessage(TEXT.denied);
      return;
    }

    const nextPermission = Notification.permission === "granted" ? "granted" : await Notification.requestPermission();
    setPermission(nextPermission);

    if (nextPermission !== "granted") {
      setMessage(TEXT.notEnabled);
      return;
    }

    const subscribed = await subscribeForPush().catch(() => false);
    setPushSynced(subscribed);
    setMessage(subscribed ? TEXT.subscribed : TEXT.localOnly);
  }

  if (!showPrompt || (!hasTimer && permission === "granted")) {
    return null;
  }

  return (
    <>
      {permission !== "granted" || message ? (
      <section className="rounded-[18px] border border-[#263241] bg-[#111827] p-3">
        {permission !== "granted" ? (
        <div>
          <button
            type="button"
            onClick={enableReminder}
            className="min-h-[44px] w-full rounded-[14px] bg-[#38BDF8] px-4 py-2 text-[15px] font-bold text-[#0B0F14]"
          >
            {TEXT.enable}
          </button>
          <p className="mt-2 text-[13px] leading-5 text-[#9CA3AF]">{TEXT.help}</p>
        </div>
        ) : null}

        {message ? <p className="mt-2 text-[13px] leading-5 text-[#D1D5DB]">{message}</p> : null}
      </section>
      ) : null}
    </>
  );
}
