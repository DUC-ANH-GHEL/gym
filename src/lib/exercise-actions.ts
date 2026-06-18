"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/auth";
import { exerciseSchema } from "@/lib/validators";

export async function saveExerciseAction(formData: FormData): Promise<void> {
  const user = await requireUser();
  const parsed = exerciseSchema.safeParse({
    id: formData.get("id"),
    name: formData.get("name"),
    muscleGroup: formData.get("muscleGroup"),
    currentWeightKg: formData.get("currentWeightKg"),
    imageUrl: formData.get("imageUrl"),
    note: formData.get("note"),
  });

  if (!parsed.success) {
    redirect("/exercises?error=invalid");
  }

  if (parsed.data.id) {
    const existingExercise = await prisma.exercise.findFirst({
      where: { id: parsed.data.id, userId: user.id },
    });

    if (!existingExercise) {
      return;
    }

    await prisma.exercise.update({
      where: { id: existingExercise.id },
      data: {
        name: parsed.data.name,
        muscleGroup: parsed.data.muscleGroup || null,
        currentWeightKg: parsed.data.currentWeightKg ?? null,
        imageUrl: parsed.data.imageUrl || null,
        note: parsed.data.note || null,
      },
    });
  } else {
    await prisma.exercise.create({
      data: {
        userId: user.id,
        name: parsed.data.name,
        muscleGroup: parsed.data.muscleGroup || null,
        currentWeightKg: parsed.data.currentWeightKg ?? null,
        imageUrl: parsed.data.imageUrl || null,
        note: parsed.data.note || null,
      },
    });
  }

  revalidatePath("/exercises");
  redirect("/exercises");
}

export async function deleteExerciseAction(formData: FormData) {
  const user = await requireUser();
  const exerciseId = String(formData.get("exerciseId") || "");

  await prisma.exercise.deleteMany({ where: { id: exerciseId, userId: user.id } });
  revalidatePath("/exercises");
  redirect("/exercises");
}
