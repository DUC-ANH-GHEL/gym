import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { deliverWorkoutRestReminder } from "@/lib/workout-reminder-delivery";
import { verifyQstashRequest } from "@/lib/workout-qstash";

export async function POST(request: Request) {
  const body = await request.text();
  const validSignature = await verifyQstashRequest({ body, request });
  if (!validSignature) {
    console.error("[workout-reminder] deliver rejected: invalid QStash signature");
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const payload = JSON.parse(body) as { reminderId?: unknown };
  const reminderId = typeof payload.reminderId === "string" ? payload.reminderId.trim() : "";
  if (!reminderId || reminderId.length > 64) {
    return NextResponse.json({ error: "invalid_reminder" }, { status: 400 });
  }

  let result;
  try {
    result = await deliverWorkoutRestReminder(reminderId);
  } catch (error) {
    const message = error instanceof Error ? error.message.slice(0, 500) : "deliver_failed";
    console.error("[workout-reminder] deliver failed", reminderId, error);
    await prisma.workoutRestReminder
      .update({ where: { id: reminderId }, data: { lastError: `deliver_failed:${message}`.slice(0, 500) } })
      .catch(() => undefined);
    return NextResponse.json({ error: "deliver_failed" }, { status: 500 });
  }

  if (result.status === "not_due") {
    return NextResponse.json({ error: "not_due" }, { status: 503 });
  }

  return NextResponse.json({ ok: true, status: result.status });
}
