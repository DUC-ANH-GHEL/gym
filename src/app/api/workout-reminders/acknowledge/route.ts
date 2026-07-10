import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

function isSameOriginPost(request: Request) {
  const origin = request.headers.get("origin");
  const host = request.headers.get("host");

  if (!origin || !host) {
    return true;
  }

  try {
    return new URL(origin).host === host;
  } catch {
    return false;
  }
}

export async function POST(request: Request) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  if (!isSameOriginPost(request)) {
    return NextResponse.json({ error: "invalid_origin" }, { status: 403 });
  }

  const payload = (await request.json().catch(() => null)) as { reminderId?: unknown } | null;
  const reminderId = typeof payload?.reminderId === "string" ? payload.reminderId.trim() : "";
  if (!reminderId || reminderId.length > 64) {
    return NextResponse.json({ error: "invalid_reminder" }, { status: 400 });
  }

  const acknowledgementWindowEndsAt = new Date(Date.now() + 10_000);
  const result = await prisma.workoutRestReminder.updateMany({
    where: {
      id: reminderId,
      userId: user.id,
      sentAt: null,
      dueAt: { lte: acknowledgementWindowEndsAt },
    },
    data: {
      sentAt: new Date(),
      lastError: "foreground_notification",
    },
  });

  return NextResponse.json({ ok: result.count === 1 });
}
