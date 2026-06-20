import { prisma } from "@/lib/prisma";

export const DEFAULT_WORKOUT_DAY_CONFIG = [
  { dayOfWeek: 1, title: "Thứ 2" },
  { dayOfWeek: 2, title: "Thứ 3" },
  { dayOfWeek: 3, title: "Thứ 4" },
  { dayOfWeek: 4, title: "Thứ 5" },
  { dayOfWeek: 5, title: "Thứ 6" },
  { dayOfWeek: 6, title: "Thứ 7" },
  { dayOfWeek: 0, title: "Chủ nhật" },
] as const;

export async function ensureDefaultWorkoutDays(userId: string) {
  await prisma.workoutDay.createMany({
    data: DEFAULT_WORKOUT_DAY_CONFIG.map((day) => ({
      userId,
      dayOfWeek: day.dayOfWeek,
      title: day.title,
      isRestDay: true,
    })),
    skipDuplicates: true,
  });
}
