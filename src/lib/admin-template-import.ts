"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireAdminUser } from "@/lib/admin";
import { buildDefaultPlanSets } from "@/lib/workout";

const MAX_IMPORT_BYTES = 2 * 1024 * 1024;

const nullableInt = z.number().int().nullable().optional();

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
    prisma.exerciseCatalogItem.findMany({ select: { id: true, slug: true, name: true, defaultWeightKg: true } }),
    prisma.workoutTemplate.findMany({ select: { name: true } }),
  ]);
  const bySlug = new Map(catalogItems.map((item) => [item.slug, item]));
  const byName = new Map(catalogItems.map((item) => [item.name.trim().toLowerCase(), item]));
  const usedNames = new Set(existingTemplates.map((template) => template.name.trim().toLowerCase()));
  let skippedExercises = 0;

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
        catalogItemId: string;
        note: string | null;
        sets: { setIndex: number; intensityPercent: number | null; targetReps: number | null; targetWeightKg: number | null }[];
      }[] = [];

      for (const exercise of day?.exercises ?? []) {
        const item = (exercise.slug ? bySlug.get(exercise.slug) : undefined) ?? (exercise.name ? byName.get(exercise.name.trim().toLowerCase()) : undefined);

        if (!item) {
          skippedExercises += 1;
          continue;
        }

        const sets =
          exercise.sets && exercise.sets.length > 0
            ? exercise.sets.map((set, index) => ({
                setIndex: index,
                intensityPercent: set.intensityPercent ?? null,
                targetReps: set.targetReps ?? null,
                targetWeightKg: set.targetWeightKg ?? null,
              }))
            : buildDefaultPlanSets(item.defaultWeightKg ?? null);

        exercises.push({ catalogItemId: item.id, note: exercise.note ?? null, sets });
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
                    catalogItemId: exercise.catalogItemId,
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
  revalidatePath("/schedule/templates");
  redirect(`/admin/templates?imported=${prepared.length}&skipped=${skippedExercises}`);
}
