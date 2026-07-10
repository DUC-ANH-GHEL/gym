import { Receiver } from "@upstash/qstash";

const REMINDER_DELIVERY_PATH = "/api/workout-reminders/deliver";

function getBaseUrl() {
  const baseUrl = process.env.WORKOUT_REMINDER_BASE_URL || process.env.NEXTAUTH_URL;
  if (!baseUrl) {
    throw new Error("Missing WORKOUT_REMINDER_BASE_URL or NEXTAUTH_URL.");
  }

  const url = new URL(baseUrl);
  if (url.protocol !== "https:" && process.env.NODE_ENV === "production") {
    throw new Error("Workout reminder delivery URL must use HTTPS in production.");
  }

  return url;
}

function getQstashConfig() {
  const url = process.env.QSTASH_URL;
  const token = process.env.QSTASH_TOKEN;
  if (!url || !token) {
    throw new Error("Missing QStash configuration.");
  }

  return { url: url.replace(/\/$/, ""), token };
}

export function getQstashDelay(dueAtMs: number, nowMs = Date.now()) {
  return `${Math.max(1, Math.ceil((dueAtMs - nowMs) / 1000))}s` as const;
}

export async function scheduleWorkoutRestReminder({ reminderId, dueAt }: { reminderId: string; dueAt: Date }) {
  const qstash = getQstashConfig();
  const destinationUrl = new URL(REMINDER_DELIVERY_PATH, getBaseUrl()).toString();
  const response = await fetch(`${qstash.url}/v2/publish/${destinationUrl}`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${qstash.token}`,
      "Content-Type": "application/json",
      "Upstash-Delay": getQstashDelay(dueAt.getTime()),
      "Upstash-Retries": "3",
      "Upstash-Retry-Delay": "1000 * (1 + retried)",
      "Upstash-Redact-Fields": "body",
    },
    body: JSON.stringify({ reminderId }),
  });

  if (!response.ok) {
    throw new Error(`QStash reminder publish failed: ${response.status}`);
  }
}

export async function verifyQstashRequest({ body, request }: { body: string; request: Request }) {
  const currentSigningKey = process.env.QSTASH_CURRENT_SIGNING_KEY;
  const nextSigningKey = process.env.QSTASH_NEXT_SIGNING_KEY;
  const signature = request.headers.get("upstash-signature");

  if (!currentSigningKey || !nextSigningKey || !signature) {
    return false;
  }

  try {
    const receiver = new Receiver({ currentSigningKey, nextSigningKey });
    return await receiver.verify({
      body,
      signature,
      url: new URL(REMINDER_DELIVERY_PATH, getBaseUrl()).toString(),
      clockTolerance: 5,
      upstashRegion: request.headers.get("upstash-region") ?? undefined,
    });
  } catch {
    return false;
  }
}
