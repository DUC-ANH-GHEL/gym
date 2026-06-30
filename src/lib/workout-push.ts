import webPush, { type PushSubscription as WebPushSubscription } from "web-push";
import { buildWorkoutPushSendOptions } from "./workout-notification-options";

let configured = false;

function getVapidConfig() {
  const publicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
  const privateKey = process.env.VAPID_PRIVATE_KEY;
  const subject = process.env.VAPID_SUBJECT || "mailto:admin@example.com";

  if (!publicKey || !privateKey) {
    return null;
  }

  return { publicKey, privateKey, subject };
}

export function configureWebPush() {
  const config = getVapidConfig();
  if (!config) {
    return false;
  }

  if (!configured) {
    webPush.setVapidDetails(config.subject, config.publicKey, config.privateKey);
    configured = true;
  }

  return true;
}

export function toWebPushSubscription(subscription: { endpoint: string; p256dh: string; auth: string }): WebPushSubscription {
  return {
    endpoint: subscription.endpoint,
    keys: {
      p256dh: subscription.p256dh,
      auth: subscription.auth,
    },
  };
}

export async function sendWorkoutPush(
  subscription: { endpoint: string; p256dh: string; auth: string },
  payload: { title: string; body: string; url: string },
) {
  if (!configureWebPush()) {
    return { ok: false as const, reason: "missing_vapid" };
  }

  await webPush.sendNotification(toWebPushSubscription(subscription), JSON.stringify(payload), buildWorkoutPushSendOptions());
  return { ok: true as const };
}
