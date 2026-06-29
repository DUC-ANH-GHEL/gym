import { prisma } from "./prisma";
import {
  buildWorkoutReminderCronJobPayload,
  isLocalUrl,
  resolveWorkoutReminderCronUrl,
} from "./workout-cron-job-org-payload";

const CRON_JOB_ORG_ENDPOINT = "https://api.cron-job.org";
const WORKOUT_REMINDER_CRON_NAME = "workout-rest-reminders";

function getPublicBaseUrl() {
  const explicitUrl = process.env.WORKOUT_REMINDER_BASE_URL || process.env.NEXTAUTH_URL;
  if (explicitUrl) {
    return explicitUrl;
  }

  if (process.env.VERCEL_URL) {
    return `https://${process.env.VERCEL_URL}`;
  }

  return null;
}

function getWorkoutCronConfig() {
  const apiKey = process.env.CRON_JOB_ORG_API_KEY;
  const cronSecret = process.env.CRON_SECRET;
  const baseUrl = getPublicBaseUrl();

  if (!apiKey || !cronSecret || !baseUrl) {
    return null;
  }

  const url = resolveWorkoutReminderCronUrl(baseUrl);
  if (isLocalUrl(new URL(url))) {
    return null;
  }

  return { apiKey, cronSecret, url };
}

async function requestCronJobOrg(
  method: "PUT" | "DELETE",
  path: string,
  apiKey: string,
  payload?: unknown,
) {
  const response = await fetch(`${CRON_JOB_ORG_ENDPOINT}${path}`, {
    method,
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: payload ? JSON.stringify(payload) : undefined,
  });

  if (!response.ok) {
    const body = await response.text().catch(() => "");
    throw new Error(`cron-job.org ${method} ${path} failed: ${response.status} ${body.slice(0, 200)}`);
  }

  if (response.status === 204) {
    return null;
  }

  return (await response.json().catch(() => null)) as { jobId?: number } | null;
}

export async function ensureWorkoutReminderCronJob() {
  const config = getWorkoutCronConfig();
  if (!config) {
    return { ok: false as const, reason: "missing_config" };
  }

  const existing = await prisma.workoutCronJob.findUnique({
    where: { name: WORKOUT_REMINDER_CRON_NAME },
  });

  if (existing?.providerJobId) {
    return { ok: true as const, jobId: existing.providerJobId, reused: true };
  }

  try {
    const result = await requestCronJobOrg(
      "PUT",
      "/jobs",
      config.apiKey,
      buildWorkoutReminderCronJobPayload({
        url: config.url,
        cronSecret: config.cronSecret,
      }),
    );
    const jobId = result?.jobId;

    if (typeof jobId !== "number") {
      throw new Error("cron-job.org did not return a jobId.");
    }

    await prisma.workoutCronJob.upsert({
      where: { name: WORKOUT_REMINDER_CRON_NAME },
      create: {
        name: WORKOUT_REMINDER_CRON_NAME,
        provider: "cron-job.org",
        providerJobId: jobId,
        lastError: null,
      },
      update: {
        provider: "cron-job.org",
        providerJobId: jobId,
        lastError: null,
      },
    });

    return { ok: true as const, jobId, reused: false };
  } catch (error) {
    await prisma.workoutCronJob.upsert({
      where: { name: WORKOUT_REMINDER_CRON_NAME },
      create: {
        name: WORKOUT_REMINDER_CRON_NAME,
        provider: "cron-job.org",
        lastError: error instanceof Error ? error.message.slice(0, 500) : "cron_create_failed",
      },
      update: {
        lastError: error instanceof Error ? error.message.slice(0, 500) : "cron_create_failed",
      },
    });

    return { ok: false as const, reason: "create_failed" };
  }
}

export async function cleanupWorkoutReminderCronJobIfIdle() {
  const config = getWorkoutCronConfig();
  if (!config) {
    return { ok: false as const, reason: "missing_config" };
  }

  const pendingReminders = await prisma.workoutRestReminder.count({
    where: { sentAt: null },
  });

  if (pendingReminders > 0) {
    return { ok: true as const, deleted: false, pendingReminders };
  }

  const existing = await prisma.workoutCronJob.findUnique({
    where: { name: WORKOUT_REMINDER_CRON_NAME },
  });

  if (!existing?.providerJobId) {
    return { ok: true as const, deleted: false, pendingReminders: 0 };
  }

  try {
    await requestCronJobOrg("DELETE", `/jobs/${existing.providerJobId}`, config.apiKey);
    await prisma.workoutCronJob.update({
      where: { name: WORKOUT_REMINDER_CRON_NAME },
      data: { providerJobId: null, lastError: null },
    });

    return { ok: true as const, deleted: true, pendingReminders: 0 };
  } catch (error) {
    await prisma.workoutCronJob.update({
      where: { name: WORKOUT_REMINDER_CRON_NAME },
      data: {
        lastError: error instanceof Error ? error.message.slice(0, 500) : "cron_delete_failed",
      },
    });

    return { ok: false as const, reason: "delete_failed" };
  }
}
