"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireAdminUser } from "@/lib/admin";
import { isAllowedExerciseAnimationUrl } from "@/lib/exercise-media";
import { buildDefaultPlanSets } from "@/lib/workout";

const MAX_IMPORT_BYTES = 2 * 1024 * 1024;

const nullableInt = z.number().int().nullable().optional();

function slugify(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
}

function safeImageUrl(value: string | null | undefined) {
  const trimmed = value?.trim();

  if (!trimmed) {
    return "/exercise-placeholder.png";
  }

  if (trimmed.startsWith("/")) {
    return trimmed;
  }

  try {
    const parsed = new URL(trimmed);
    return parsed.protocol === "https:" && parsed.hostname === "res.cloudinary.com" ? parsed.toString() : "/exercise-placeholder.png";
  } catch {
    return "/exercise-placeholder.png";
  }
}

function safeAnimationUrl(value: string | null | undefined) {
  const trimmed = value?.trim();
  return trimmed && isAllowedExerciseAnimationUrl(trimmed) ? trimmed : null;
}

const importSchema = z.object({
  templates: z
    .array(
      z.object({
        name: z.string().trim().min(1).max(120),
        description: z.string().trim().max(500).nullable().optional(),
        sessionsPerWeek: z.number().int().min(0).max(7).optional(),
        isActive: z.boolean().optional(),
        sortOrder: z.number().int().min(0).max(100000).optional(),
        days: z
          .array(
            z.object({
              dayOfWeek: z.number().int().min(0).max(6),
              title: z.string().trim().max(120).optional(),
              isRestDay: z.boolean().optional(),
              exercises: z
                .array(
                  z.object({
                    slug: z.string().trim().optional(),
                    name: z.string().trim().optional(),
                    muscleGroup: z.string().trim().max(80).nullable().optional(),
                    imageUrl: z.string().max(2048).nullable().optional(),
                    animationUrl: z.string().max(2048).nullable().optional(),
                    defaultWeightKg: z.number().min(0).max(1000).nullable().optional(),
                    defaultSets: nullableInt,
                    defaultReps: nullableInt,
                    note: z.string().max(500).nullable().optional(),
                    sets: z
                      .array(
                        z.object({
                          intensityPercent: nullableInt,
                          targetReps: nullableInt,
                          targetWeightKg: z.number().min(0).max(1000).nullable().optional(),
                        }),
                      )
                      .max(20)
                      .optional(),
                  }),
                )
                .max(60)
                .optional(),
            }),
          )
          .max(7)
          .optional(),
      }),
    )
    .min(1)
    .max(50),
});

// Imported templates are always added as new ones (never overwriting), so nobody's applied schedule changes.
// Exercises that are not in the catalog yet are created from the file.
export async function importWorkoutTemplatesAction(formData: FormData): Promise<void> {
  await requireAdminUser();
  const file = formData.get("file");

  if (!(file instanceof File) || file.size === 0 || file.size > MAX_IMPORT_BYTES) {
    redirect("/admin/templates?importError=file");
  }

  let json: unknown;
  try {
    json = JSON.parse(await file.text());
  } catch {
    redirect("/admin/templates?importError=json");
  }

  const parsed = importSchema.safeParse(json);

  if (!parsed.success) {
    redirect("/admin/templates?importError=format");
  }

  const [catalogItems, existingTemplates] = await Promise.all([
    prisma.exerciseCatalogItem.findMany({ select: { id: true, slug: true, name: true, defaultWeightKg: true, sortOrder: true } }),
    prisma.workoutTemplate.findMany({ select: { name: true } }),
  ]);
  const bySlug = new Map(catalogItems.map((item) => [item.slug, item]));
  const byName = new Map(catalogItems.map((item) => [item.name.trim().toLowerCase(), item]));
  const usedNames = new Set(existingTemplates.map((template) => template.name.trim().toLowerCase()));
  const usedSlugs = new Set(catalogItems.map((item) => item.slug));
  let nextSortOrder = catalogItems.reduce((max, item) => Math.max(max, item.sortOrder), 0) + 1;
  let skippedExercises = 0;

  type NewCatalogItem = {
    slug: string;
    name: string;
    muscleGroup: string | null;
    imageUrl: string;
    animationUrl: string | null;
    defaultWeightKg: number | null;
    defaultSets: number | null;
    defaultReps: number | null;
    note: string | null;
    sortOrder: number;
  };
  const newItems = new Map<string, NewCatalogItem>();

  function uniqueSlug(base: string) {
    const root = base || `exercise-${usedSlugs.size + 1}`;
    let slug = root;
    let suffix = 2;

    while (usedSlugs.has(slug)) {
      slug = `${root}-${suffix}`;
      suffix += 1;
    }

    usedSlugs.add(slug);
    return slug;
  }

  function uniqueName(name: string) {
    let candidate = name;
    let suffix = 2;

    while (usedNames.has(candidate.trim().toLowerCase())) {
      candidate = `${name} (${suffix})`;
      suffix += 1;
    }

    usedNames.add(candidate.trim().toLowerCase());
    return candidate;
  }

  const prepared = parsed.data.templates.map((template) => {
    const daysByWeekday = new Map((template.days ?? []).map((day) => [day.dayOfWeek, day]));
    const days = Array.from({ length: 7 }, (_, dayOfWeek) => {
      const day = daysByWeekday.get(dayOfWeek);
      const exercises: {
        catalogItemId?: string;
        newItemKey?: string;
        note: string | null;
        sets: { setIndex: number; intensityPercent: number | null; targetReps: number | null; targetWeightKg: number | null }[];
      }[] = [];

      for (const exercise of day?.exercises ?? []) {
        const item = (exercise.slug ? bySlug.get(exercise.slug) : undefined) ?? (exercise.name ? byName.get(exercise.name.trim().toLowerCase()) : undefined);
        const newItemKey = (exercise.slug || exercise.name || "").trim().toLowerCase();
        let createdItem = newItemKey ? newItems.get(newItemKey) : undefined;

        if (!item && !createdItem) {
          const name = exercise.name || exercise.slug?.replace(/-/g, " ") || "";

          if (!name) {
            skippedExercises += 1;
            continue;
          }

          createdItem = {
            slug: uniqueSlug(slugify(exercise.slug || name)),
            name,
            muscleGroup: exercise.muscleGroup || null,
            imageUrl: safeImageUrl(exercise.imageUrl),
            animationUrl: safeAnimationUrl(exercise.animationUrl),
            defaultWeightKg: exercise.defaultWeightKg ?? null,
            defaultSets: exercise.defaultSets ?? null,
            defaultReps: exercise.defaultReps ?? null,
            note: exercise.note || null,
            sortOrder: nextSortOrder,
          };
          nextSortOrder += 1;
          newItems.set(newItemKey, createdItem);
        }

        const sets =
          exercise.sets && exercise.sets.length > 0
            ? exercise.sets.map((set, index) => ({
                setIndex: index,
                intensityPercent: set.intensityPercent ?? null,
                targetReps: set.targetReps ?? null,
                targetWeightKg: set.targetWeightKg ?? null,
              }))
            : buildDefaultPlanSets(item?.defaultWeightKg ?? createdItem?.defaultWeightKg ?? null);

        exercises.push({ catalogItemId: item?.id, newItemKey: item ? undefined : newItemKey, note: exercise.note ?? null, sets });
      }

      const isRestDay = day ? Boolean(day.isRestDay) || exercises.length === 0 : true;

      return { dayOfWeek, title: day?.title || (isRestDay ? "Nghỉ" : "Buổi tập"), isRestDay, exercises };
    });

    return {
      name: uniqueName(template.name),
      description: template.description || null,
      sessionsPerWeek: template.sessionsPerWeek ?? days.filter((day) => !day.isRestDay).length,
      sortOrder: template.sortOrder ?? 0,
      isActive: template.isActive ?? true,
      days,
    };
  });

  await prisma.$transaction(
    async (tx) => {
      const createdIds = new Map<string, string>();

      for (const [key, item] of newItems) {
        const created = await tx.exerciseCatalogItem.create({ data: item, select: { id: true } });
        createdIds.set(key, created.id);
      }

      for (const template of prepared) {
        await tx.workoutTemplate.create({
          data: {
            name: template.name,
            description: template.description,
            sessionsPerWeek: template.sessionsPerWeek,
            sortOrder: template.sortOrder,
            isActive: template.isActive,
            days: {
              create: template.days.map((day) => ({
                dayOfWeek: day.dayOfWeek,
                title: day.title,
                isRestDay: day.isRestDay,
                exercises: {
                  create: day.exercises.map((exercise, orderIndex) => ({
                    catalogItemId: exercise.catalogItemId ?? createdIds.get(exercise.newItemKey ?? "") ?? "",
                    orderIndex,
                    note: exercise.note,
                    sets: { create: exercise.sets },
                  })),
                },
              })),
            },
          },
        });
      }
    },
    { timeout: 30_000 },
  );

  revalidatePath("/admin/templates");
  revalidatePath("/admin/exercises");
  revalidatePath("/schedule/templates");
  redirect(`/admin/templates?imported=${prepared.length}&created=${newItems.size}&skipped=${skippedExercises}`);
}
