import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";

type PushSubscriptionPayload = {
  endpoint?: string;
  keys?: {
    p256dh?: string;
    auth?: string;
  };
};

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

function isAllowedPushEndpoint(endpoint: string) {
  try {
    const url = new URL(endpoint);
    const host = url.hostname.toLowerCase();

    return (
      url.protocol === "https:" &&
      (host === "fcm.googleapis.com" ||
        host === "updates.push.services.mozilla.com" ||
        host === "web.push.apple.com" ||
        host.endsWith(".push.apple.com") ||
        host.endsWith(".notify.windows.com"))
    );
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

  const payload = (await request.json().catch(() => null)) as PushSubscriptionPayload | null;
  const endpoint = payload?.endpoint?.trim();
  const p256dh = payload?.keys?.p256dh?.trim();
  const auth = payload?.keys?.auth?.trim();

  if (
    !endpoint ||
    !p256dh ||
    !auth ||
    endpoint.length > 2048 ||
    p256dh.length > 512 ||
    auth.length > 512 ||
    !isAllowedPushEndpoint(endpoint)
  ) {
    return NextResponse.json({ error: "invalid_subscription" }, { status: 400 });
  }

  await prisma.pushSubscription.upsert({
    where: { endpoint },
    create: {
      userId: user.id,
      endpoint,
      p256dh,
      auth,
      userAgent: request.headers.get("user-agent")?.slice(0, 300) || null,
    },
    update: {
      userId: user.id,
      p256dh,
      auth,
      userAgent: request.headers.get("user-agent")?.slice(0, 300) || null,
    },
  });

  return NextResponse.json({ ok: true });
}
