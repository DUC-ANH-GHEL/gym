import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { sendWorkoutPush } from "@/lib/workout-push";
import { cleanupWorkoutReminderCronJobIfIdle } from "@/lib/workout-cron-job-org";

function isAuthorized(request: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret) {
    return false;
  }

  return request.headers.get("authorization") === `Bearer ${secret}`;
}

export async function POST(request: Request) {
  if (!isAuthorized(request)) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const dueReminders = await prisma.workoutRestReminder.findMany({
    where: {
      sentAt: null,
      dueAt: { lte: new Date() },
    },
    orderBy: { dueAt: "asc" },
    take: 50,
    include: {
      user: {
        include: { pushSubscriptions: true },
      },
    },
  });

  let sent = 0;
  let skipped = 0;
  let failed = 0;

  for (const reminder of dueReminders) {
    const subscriptions = reminder.user.pushSubscriptions;

    if (subscriptions.length === 0) {
      skipped += 1;
      await prisma.workoutRestReminder.update({
        where: { id: reminder.id },
        data: { sentAt: new Date(), lastError: "no_subscription" },
      });
      continue;
    }

    let sentAny = false;
    const errors: string[] = [];

    for (const subscription of subscriptions) {
      try {
        const result = await sendWorkoutPush(subscription, {
          title: reminder.title,
          body: reminder.body,
          url: reminder.url,
        });

        if (result.ok) {
          sentAny = true;
        } else {
          errors.push(result.reason);
        }
      } catch (error) {
        failed += 1;
        const statusCode = typeof error === "object" && error !== null && "statusCode" in error ? Number(error.statusCode) : null;
        if (statusCode === 404 || statusCode === 410) {
          await prisma.pushSubscription.delete({ where: { id: subscription.id } }).catch(() => undefined);
        }
        errors.push(error instanceof Error ? error.message : "push_failed");
      }
    }

    if (sentAny) {
      sent += 1;
      await prisma.workoutRestReminder.update({
        where: { id: reminder.id },
        data: { sentAt: new Date(), lastError: errors.join("; ").slice(0, 500) || null },
      });
    } else {
      await prisma.workoutRestReminder.update({
        where: { id: reminder.id },
        data: { sentAt: new Date(), lastError: errors.join("; ").slice(0, 500) || "push_not_sent" },
      });
    }
  }

  const cron = await cleanupWorkoutReminderCronJobIfIdle().catch(() => ({ ok: false, reason: "cleanup_failed" }));

  return NextResponse.json({ ok: true, checked: dueReminders.length, sent, skipped, failed, cron });
}
