import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getDateKeyInTimeZone } from "@/lib/date";
import { GYM_FEE_BODY, GYM_FEE_TITLE, isGymFeeDueToday } from "@/lib/gym-fee";
import { sendWorkoutPush } from "@/lib/workout-push";

function isAuthorized(request: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret) {
    return false;
  }

  return request.headers.get("authorization") === `Bearer ${secret}`;
}

// Called daily by Vercel Cron (09:00 UTC = 16:00 in Vietnam/Thailand).
async function handle(request: Request) {
  if (!isAuthorized(request)) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const profiles = await prisma.gymProfile.findMany({
    where: { membershipStartDate: { not: null } },
    include: { user: { include: { pushSubscriptions: true } } },
  });

  let sent = 0;
  let skipped = 0;
  let failed = 0;

  for (const profile of profiles) {
    if (!profile.membershipStartDate) {
      continue;
    }

    const todayKey = getDateKeyInTimeZone(new Date(), profile.timezone || "Asia/Bangkok");
    const startKey = profile.membershipStartDate.toISOString().slice(0, 10);

    if (profile.feeReminderSentOn === todayKey || !isGymFeeDueToday(startKey, todayKey)) {
      skipped += 1;
      continue;
    }

    // Claim today's reminder first so an overlapping run cannot send it twice.
    const claimed = await prisma.gymProfile.updateMany({
      where: { id: profile.id, OR: [{ feeReminderSentOn: null }, { feeReminderSentOn: { not: todayKey } }] },
      data: { feeReminderSentOn: todayKey },
    });
    if (claimed.count === 0) {
      skipped += 1;
      continue;
    }

    let sentAny = false;
    for (const subscription of profile.user.pushSubscriptions) {
      try {
        const result = await sendWorkoutPush(subscription, { title: GYM_FEE_TITLE, body: GYM_FEE_BODY, url: "/profile" });
        sentAny = sentAny || result.ok;
      } catch (error) {
        const statusCode = typeof error === "object" && error !== null && "statusCode" in error ? Number(error.statusCode) : null;
        if (statusCode === 404 || statusCode === 410) {
          await prisma.pushSubscription.delete({ where: { id: subscription.id } }).catch(() => undefined);
        }
      }
    }

    if (sentAny) {
      sent += 1;
    } else {
      failed += 1;
      // Nothing was delivered, so release the claim and let the next run retry.
      await prisma.gymProfile.update({ where: { id: profile.id }, data: { feeReminderSentOn: profile.feeReminderSentOn } });
    }
  }

  return NextResponse.json({ ok: true, checked: profiles.length, sent, skipped, failed });
}

export const GET = handle;
export const POST = handle;
