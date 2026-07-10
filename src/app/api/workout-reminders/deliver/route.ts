import { NextResponse } from "next/server";
import { deliverWorkoutRestReminder } from "@/lib/workout-reminder-delivery";
import { verifyQstashRequest } from "@/lib/workout-qstash";

export async function POST(request: Request) {
  const body = await request.text();
  const validSignature = await verifyQstashRequest({ body, request });
  if (!validSignature) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const payload = JSON.parse(body) as { reminderId?: unknown };
  const reminderId = typeof payload.reminderId === "string" ? payload.reminderId.trim() : "";
  if (!reminderId || reminderId.length > 64) {
    return NextResponse.json({ error: "invalid_reminder" }, { status: 400 });
  }

  const result = await deliverWorkoutRestReminder(reminderId);
  if (result.status === "not_due") {
    return NextResponse.json({ error: "not_due" }, { status: 503 });
  }

  return NextResponse.json({ ok: true, status: result.status });
}
