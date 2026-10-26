import { jsonDownload, rejectNonAdmin } from "@/lib/admin-api";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

// GET /api/admin/exercises/export -> the whole exercise catalog with all its metadata
export async function GET() {
  const rejection = await rejectNonAdmin();

  if (rejection) {
    return rejection;
  }

  const items = await prisma.exerciseCatalogItem.findMany({
    orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
  });

  return jsonDownload(
    {
      version: 1,
      exportedAt: new Date().toISOString(),
      count: items.length,
      exercises: items.map((item) => ({
        slug: item.slug,
        name: item.name,
        muscleGroup: item.muscleGroup,
        imageUrl: item.imageUrl,
        animationUrl: item.animationUrl,
        defaultWeightKg: item.defaultWeightKg,
        note: item.note,
        sortOrder: item.sortOrder,
        isActive: item.isActive,
      })),
    },
    "gym-exercises",
  );
}
