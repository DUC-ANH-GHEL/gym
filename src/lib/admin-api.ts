import { NextResponse } from "next/server";
import { isAdminIdentifier } from "@/lib/admin-config";
import { getSessionUserId } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

// For admin-only route handlers: returns an error response to send back, or null when the caller is an admin.
export async function rejectNonAdmin() {
  const userId = await getSessionUserId();

  if (!userId) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const user = await prisma.user.findUnique({ where: { id: userId }, select: { email: true } });

  if (!user || !isAdminIdentifier(user.email)) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }

  return null;
}

export function jsonDownload(payload: unknown, filePrefix: string) {
  const fileName = `${filePrefix}-${new Date().toISOString().slice(0, 10)}.json`;

  return new NextResponse(JSON.stringify(payload, null, 2), {
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Content-Disposition": `attachment; filename="${fileName}"`,
      "Cache-Control": "no-store",
    },
  });
}
