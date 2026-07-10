"use client";

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { shouldSyncPushSubscription } from "@/lib/workout-notification-options";

const TEXT = {
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

export function WorkoutRestTimer({
  dueAtMs,
  restSeconds: initialRestSeconds,
  showPrompt = true,
}: {
  dueAtMs?: number | null;
  restSeconds?: number | null;
  showPrompt?: boolean;
}) {
  const searchParams = useSearchParams();
  const urlDueAt = Number(searchParams.get("restDueAt") || 0);
  const dueAt = dueAtMs || urlDueAt;
  const urlRestSeconds = Number(searchParams.get("rest") || 0);
  const restSeconds = initialRestSeconds || urlRestSeconds;
  const [now, setNow] = useState(() => Date.now());
  const [permission, setPermission] = useState<NotificationPermission | "unsupported">(() =>
    typeof window !== "undefined" && "Notification" in window ? Notification.permission : "unsupported",
  );
  const [message, setMessage] = useState("");
  const [pushSynced, setPushSynced] = useState(false);

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
      return;
    }

    const interval = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(interval);
  }, [hasTimer]);

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
