import test from "node:test";
import assert from "node:assert/strict";
import { buildWorkoutReminderCronJobPayload, resolveWorkoutReminderCronUrl } from "./workout-cron-job-org-payload.ts";

test("builds a cron-job.org job that posts to the workout reminder route every minute", () => {
  const url = resolveWorkoutReminderCronUrl("https://gym.example.com");
  const payload = buildWorkoutReminderCronJobPayload({
    url,
    cronSecret: "secret-123",
  });

  assert.equal(payload.job.url, "https://gym.example.com/api/workout-reminders/due");
  assert.equal(payload.job.enabled, true);
  assert.equal(payload.job.requestMethod, 1);
  assert.deepEqual(payload.job.schedule, {
    timezone: "UTC",
    expiresAt: 0,
    hours: [-1],
    mdays: [-1],
    minutes: [-1],
    months: [-1],
    wdays: [-1],
  });
  assert.deepEqual(payload.job.extendedData.headers, {
    Authorization: "Bearer secret-123",
    "Content-Type": "application/json",
  });
});

test("refuses non-https cron callback urls outside local development", () => {
  assert.throws(() => resolveWorkoutReminderCronUrl("http://gym.example.com"), /https/i);
  assert.equal(resolveWorkoutReminderCronUrl("http://127.0.0.1:3000"), "http://127.0.0.1:3000/api/workout-reminders/due");
});
