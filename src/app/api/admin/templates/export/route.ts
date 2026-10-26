import { NextResponse } from "next/server";
import { isAdminIdentifier } from "@/lib/admin-config";
import { getSessionUserId } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

// GET /api/admin/templates/export            -> every template
// GET /api/admin/templates/export?template=ID -> one template
export async function GET(request: Request) {
  const userId = await getSessionUserId();

  if (!userId) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const user = await prisma.user.findUnique({ where: { id: userId }, select: { email: true } });

  if (!user || !isAdminIdentifier(user.email)) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
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
              catalogItem: { select: { slug: true, name: true, muscleGroup: true } },
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

  const fileName = `gym-templates-${new Date().toISOString().slice(0, 10)}.json`;

  return new NextResponse(JSON.stringify(payload, null, 2), {
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Content-Disposition": `attachment; filename="${fileName}"`,
      "Cache-Control": "no-store",
    },
  });
}
