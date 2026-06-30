export const WORKOUT_REST_NOTIFICATION_TAG = "workout-rest";
export const WORKOUT_REST_VIBRATION_PATTERN = [220, 90, 220, 90, 320] as const;
export const WORKOUT_REST_PUSH_TTL_SECONDS = 300;

export function buildWorkoutNotificationOptions({ url }: { url: string }) {
  return {
    icon: "/icon-192.png",
    badge: "/icon-192.png",
    data: { url },
    tag: WORKOUT_REST_NOTIFICATION_TAG,
    renotify: true,
    requireInteraction: true,
    vibrate: [...WORKOUT_REST_VIBRATION_PATTERN],
  };
}

export function buildWorkoutPushSendOptions() {
  return {
    TTL: WORKOUT_REST_PUSH_TTL_SECONDS,
    headers: {
      Urgency: "high",
      Topic: WORKOUT_REST_NOTIFICATION_TAG,
    },
  };
}

export function shouldSyncPushSubscription(permission: NotificationPermission | "unsupported") {
  return permission === "granted";
}
