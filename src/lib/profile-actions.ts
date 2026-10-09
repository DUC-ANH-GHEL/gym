"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { requireUser, logoutUser } from "@/lib/auth";
import { profileSchema } from "@/lib/validators";

export async function saveProfileAction(formData: FormData): Promise<void> {
  const user = await requireUser();
  const parsed = profileSchema.safeParse({
    displayName: formData.get("displayName"),
    goal: formData.get("goal"),
    heightCm: formData.get("heightCm"),
    weightKg: formData.get("weightKg"),
    timezone: formData.get("timezone") || "Asia/Bangkok",
    membershipStartDate: formData.get("membershipStartDate") || "",
  });

  if (!parsed.success) {
    redirect("/profile?error=invalid");
  }

  const membershipStartDate = parsed.data.membershipStartDate ? new Date(`${parsed.data.membershipStartDate}T00:00:00Z`) : null;
  const startDateChanged = membershipStartDate?.getTime() !== user.gymProfile?.membershipStartDate?.getTime();

  await prisma.gymProfile.upsert({
    where: { userId: user.id },
    update: {
      displayName: parsed.data.displayName || null,
      goal: parsed.data.goal || null,
      heightCm: Number.isFinite(parsed.data.heightCm) ? Number(parsed.data.heightCm) : null,
      weightKg: Number.isFinite(parsed.data.weightKg) ? Number(parsed.data.weightKg) : null,
      timezone: parsed.data.timezone,
      membershipStartDate,
      ...(startDateChanged ? { feeReminderSentOn: null } : {}),
    },
    create: {
      userId: user.id,
      displayName: parsed.data.displayName || null,
      goal: parsed.data.goal || null,
      heightCm: Number.isFinite(parsed.data.heightCm) ? Number(parsed.data.heightCm) : null,
      weightKg: Number.isFinite(parsed.data.weightKg) ? Number(parsed.data.weightKg) : null,
      timezone: parsed.data.timezone,
      membershipStartDate,
    },
  });

  revalidatePath("/profile");
}

export async function logoutAction() {
  await logoutUser();
  redirect("/login");
}

export async function setRestTimerEnabledAction(enabled: boolean): Promise<void> {
  const user = await requireUser();

  await prisma.user.update({ where: { id: user.id }, data: { restTimerEnabled: enabled } });

  if (!enabled) {
    // Drop pending reminders so no countdown or push fires after the timer is turned off.
    await prisma.workoutRestReminder.updateMany({
      where: { userId: user.id, sentAt: null },
      data: { sentAt: new Date(), lastError: "timer_disabled" },
    });
  }

  revalidatePath("/profile");
  revalidatePath("/today");
}
