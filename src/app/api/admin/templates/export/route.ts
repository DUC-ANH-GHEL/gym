import { NextResponse } from "next/server";
import { jsonDownload, rejectNonAdmin } from "@/lib/admin-api";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

// GET /api/admin/templates/export            -> every template
// GET /api/admin/templates/export?template=ID -> one template
export async function GET(request: Request) {
  const rejection = await rejectNonAdmin();

  if (rejection) {
    return rejection;
  }

  const templateId = new URL(request.url).searchParams.get("template");
  const templates = await prisma.workoutTemplate.findMany({
    where: templateId ? { id: templateId } : undefined,
    orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
    include: {
      days: {
        orderBy: { dayOfWeek: "asc" },
        include: {
          exercises: {
            orderBy: { orderIndex: "asc" },
            include: {
              catalogItem: {
                select: {
                  slug: true,
                  name: true,
                  muscleGroup: true,
                  imageUrl: true,
                  animationUrl: true,
                  defaultWeightKg: true,
                  defaultSets: true,
                  defaultReps: true,
                },
              },
              sets: { orderBy: { setIndex: "asc" } },
            },
          },
        },
      },
    },
  });

  if (templateId && templates.length === 0) {
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }

  const payload = {
    version: 1,
    exportedAt: new Date().toISOString(),
    templates: templates.map((template) => ({
      name: template.name,
      description: template.description,
      sessionsPerWeek: template.sessionsPerWeek,
      isActive: template.isActive,
      sortOrder: template.sortOrder,
      days: template.days.map((day) => ({
        dayOfWeek: day.dayOfWeek,
        title: day.title,
        isRestDay: day.isRestDay,
        exercises: day.exercises.map((exercise) => ({
          slug: exercise.catalogItem.slug,
          name: exercise.catalogItem.name,
          muscleGroup: exercise.catalogItem.muscleGroup,
          imageUrl: exercise.catalogItem.imageUrl,
          animationUrl: exercise.catalogItem.animationUrl,
          defaultWeightKg: exercise.catalogItem.defaultWeightKg,
          defaultSets: exercise.catalogItem.defaultSets,
          defaultReps: exercise.catalogItem.defaultReps,
          note: exercise.note,
          sets: exercise.sets.map((set) => ({
            setIndex: set.setIndex,
            intensityPercent: set.intensityPercent,
            targetReps: set.targetReps,
            targetWeightKg: set.targetWeightKg,
          })),
        })),
      })),
    })),
  };

  return jsonDownload(payload, "gym-templates");
}
