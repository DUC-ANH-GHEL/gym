import test from "node:test";
import assert from "node:assert/strict";
import {
  buildWorkoutNotificationOptions,
  buildWorkoutPushSendOptions,
  shouldSyncPushSubscription,
} from "./workout-notification-options.ts";

test("builds workout notification options with vibration and persistent rest tag", () => {
  const options = buildWorkoutNotificationOptions({ url: "/today?exercise=abc" });

  assert.deepEqual(options.vibrate, [220, 90, 220, 90, 320]);
  assert.equal(options.requireInteraction, true);
  assert.equal(options.renotify, true);
  assert.equal(options.tag, "workout-rest");
  assert.deepEqual(options.data, { url: "/today?exercise=abc" });
});

test("builds urgent web push send options with a short time to live", () => {
  const options = buildWorkoutPushSendOptions();

  assert.equal(options.TTL, 300);
  assert.deepEqual(options.headers, { Urgency: "high", Topic: "workout-rest" });
});

test("syncs the push subscription whenever browser notification permission is already granted", () => {
  assert.equal(shouldSyncPushSubscription("granted"), true);
  assert.equal(shouldSyncPushSubscription("default"), false);
  assert.equal(shouldSyncPushSubscription("denied"), false);
  assert.equal(shouldSyncPushSubscription("unsupported"), false);
});
