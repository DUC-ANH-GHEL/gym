"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { requireAdminUser } from "@/lib/admin";
import { exerciseCatalogItemSchema } from "@/lib/validators";

function slugify(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
}

async function buildUniqueSlug(name: string) {
  const baseSlug = slugify(name) || `exercise-${Date.now()}`;
  let slug = baseSlug;
  let suffix = 2;

  while (await prisma.exerciseCatalogItem.findUnique({ where: { slug } })) {
    slug = `${baseSlug}-${suffix}`;
    suffix += 1;
  }

  return slug;
}

function normalizeCatalogImageUrl(value: string | null | undefined) {
  const trimmed = value?.trim();

  if (!trimmed) {
    return "/exercise-placeholder.png";
  }

  if (trimmed.startsWith("/")) {
    return trimmed;
  }

  try {
    const parsed = new URL(trimmed);
    const isCloudinaryImage = parsed.protocol === "https:" && parsed.hostname === "res.cloudinary.com";
    return isCloudinaryImage ? parsed.toString() : null;
  } catch {
    return null;
  }
}

export async function saveCatalogItemAction(formData: FormData): Promise<void> {
  await requireAdminUser();

  const parsed = exerciseCatalogItemSchema.safeParse({
    name: formData.get("name"),
    muscleGroup: formData.get("muscleGroup"),
    imageUrl: formData.get("imageUrl"),
    defaultWeightKg: formData.get("defaultWeightKg"),
    note: formData.get("note"),
    sortOrder: formData.get("sortOrder"),
    isActive: formData.get("isActive") === "on",
  });

  if (!parsed.success) {
    redirect("/admin/exercises?error=invalid");
  }

  const imageUrl = normalizeCatalogImageUrl(parsed.data.imageUrl);
  if (!imageUrl) {
    redirect("/admin/exercises?error=image");
  }

  await prisma.exerciseCatalogItem.create({
    data: {
      slug: await buildUniqueSlug(parsed.data.name),
      name: parsed.data.name,
      muscleGroup: parsed.data.muscleGroup || null,
      imageUrl,
      defaultWeightKg: parsed.data.defaultWeightKg ?? null,
      note: parsed.data.note || null,
      sortOrder: parsed.data.sortOrder ?? 999,
      isActive: parsed.data.isActive ?? true,
    },
  });

  revalidatePath("/admin/exercises");
  revalidatePath("/admin/templates");
  revalidatePath("/exercises");
  revalidatePath("/schedule");
  revalidatePath("/today");
  redirect("/admin/exercises?created=1");
}

export async function toggleCatalogItemActiveAction(formData: FormData): Promise<void> {
  await requireAdminUser();
  const id = String(formData.get("id") || "");
  const isActive = formData.get("isActive") === "on";

  if (!id) {
    redirect("/admin/exercises?error=invalid");
  }

  const updated = await prisma.exerciseCatalogItem.updateMany({
    where: { id },
    data: { isActive },
  });

  if (updated.count !== 1) {
    redirect("/admin/exercises?error=invalid");
  }

  revalidatePath("/admin/exercises");
  revalidatePath("/admin/templates");
  revalidatePath("/exercises");
  revalidatePath("/schedule");
  revalidatePath("/today");
}
