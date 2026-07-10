import { prisma } from "@/lib/prisma";
import { sendWorkoutPush } from "@/lib/workout-push";

export async function deliverWorkoutRestReminder(reminderId: string) {
  const reminder = await prisma.workoutRestReminder.findUnique({
    where: { id: reminderId },
    include: { user: { include: { pushSubscriptions: true } } },
  });

  if (!reminder || reminder.sentAt) {
    return { status: "already_processed" as const };
  }

  if (reminder.dueAt.getTime() > Date.now()) {
    return { status: "not_due" as const };
  }

  if (reminder.user.pushSubscriptions.length === 0) {
    await prisma.workoutRestReminder.update({
      where: { id: reminder.id },
      data: { sentAt: new Date(), lastError: "no_subscription" },
    });
    return { status: "no_subscription" as const };
  }

  let sentAny = false;
  const errors: string[] = [];

  for (const subscription of reminder.user.pushSubscriptions) {
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
      const statusCode = typeof error === "object" && error !== null && "statusCode" in error ? Number(error.statusCode) : null;
      if (statusCode === 404 || statusCode === 410) {
        await prisma.pushSubscription.delete({ where: { id: subscription.id } }).catch(() => undefined);
      }
      errors.push(error instanceof Error ? error.message : "push_failed");
    }
  }

  if (!sentAny) {
    throw new Error(errors.join("; ").slice(0, 500) || "push_not_sent");
  }

  await prisma.workoutRestReminder.update({
    where: { id: reminder.id },
    data: { sentAt: new Date(), lastError: errors.join("; ").slice(0, 500) || null },
  });

  return { status: "sent" as const };
}
