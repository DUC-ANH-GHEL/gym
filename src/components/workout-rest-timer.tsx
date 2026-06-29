"use client";

import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";

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
      body,
      icon: "/icon-192.png",
      badge: "/icon-192.png",
      tag: "workout-rest",
      data: { url: "/today" },
    });
  }
}

export function WorkoutRestTimer() {
  const searchParams = useSearchParams();
  const dueAt = Number(searchParams.get("restDueAt") || 0);
  const title = searchParams.get("restTitle") || "Tới giờ tập";
  const body = searchParams.get("restBody") || "Nghỉ xong rồi. Vào tập tiếp nhé.";
  const restSeconds = Number(searchParams.get("rest") || 0);
  const [now, setNow] = useState(() => Date.now());
  const [permission, setPermission] = useState<NotificationPermission | "unsupported">(() =>
    typeof window !== "undefined" && "Notification" in window ? Notification.permission : "unsupported",
  );
  const [message, setMessage] = useState("");

  const timerKey = useMemo(() => (dueAt > 0 ? `${dueAt}:${title}` : ""), [dueAt, title]);
  const secondsLeft = Math.max(0, Math.ceil((dueAt - now) / 1000));
  const hasTimer = dueAt > 0 && restSeconds > 0;
  const minutes = Math.floor(secondsLeft / 60);
  const seconds = secondsLeft % 60;

  useEffect(() => {
    ensureServiceWorker().catch(() => undefined);
  }, []);

  useEffect(() => {
    if (!hasTimer) {
      return;
    }

    const interval = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(interval);
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
      const notifiedKey = `workout-rest-notified:${timerKey}`;
      if (window.sessionStorage.getItem(notifiedKey)) {
        return;
      }

      window.sessionStorage.setItem(notifiedKey, "1");
      showLocalNotification(title, body).catch(() => undefined);
    }, delay);

    return () => window.clearTimeout(timeout);
  }, [body, dueAt, hasTimer, timerKey, title]);

  async function enableReminder() {
    if (!("Notification" in window)) {
      setMessage("Máy này chưa hỗ trợ thông báo.");
      return;
    }

    if (Notification.permission === "denied") {
      setPermission("denied");
      setMessage("Bạn đang chặn thông báo. Mở cài đặt trình duyệt để bật lại.");
      return;
    }

    const nextPermission = Notification.permission === "granted" ? "granted" : await Notification.requestPermission();
    setPermission(nextPermission);

    if (nextPermission !== "granted") {
      setMessage("Chưa bật thông báo, app vẫn đếm giờ khi đang mở.");
      return;
    }

    const subscribed = await subscribeForPush().catch(() => false);
    setMessage(subscribed ? "Đã bật nhắc nghỉ cho máy này." : "Đã bật thông báo trên máy này. Push nền cần cấu hình VAPID trên server.");
  }

  if (!hasTimer && permission === "granted") {
    return null;
  }

  return (
    <section className="rounded-[18px] border border-[#263241] bg-[#111827] p-3">
      {hasTimer ? (
        <div className="flex min-w-0 items-center justify-between gap-3">
          <div className="min-w-0">
            <p className="text-[14px] font-bold text-[#86EFAC]">Đang nghỉ</p>
            <p className="mt-1 text-[15px] leading-5 text-[#F9FAFB]">{body}</p>
          </div>
          <div className="shrink-0 rounded-[16px] bg-[#0B0F14] px-3 py-2 text-center">
            <p className="text-[24px] font-bold tabular-nums text-[#F9FAFB]">
              {minutes}:{String(seconds).padStart(2, "0")}
            </p>
            <p className="text-[12px] font-bold text-[#9CA3AF]">còn lại</p>
          </div>
        </div>
      ) : null}

      {permission !== "granted" ? (
        <div className={hasTimer ? "mt-3 border-t border-[#263241] pt-3" : ""}>
          <button
            type="button"
            onClick={enableReminder}
            className="min-h-[44px] w-full rounded-[14px] bg-[#38BDF8] px-4 py-2 text-[15px] font-bold text-[#0B0F14]"
          >
            Bật nhắc nghỉ
          </button>
          <p className="mt-2 text-[13px] leading-5 text-[#9CA3AF]">
            Khi bật thông báo, app sẽ báo lúc tới set hoặc bài tiếp theo. Nếu đã chặn thông báo, cần bật lại trong cài đặt trình duyệt.
          </p>
        </div>
      ) : null}

      {message ? <p className="mt-2 text-[13px] leading-5 text-[#D1D5DB]">{message}</p> : null}
    </section>
  );
}
