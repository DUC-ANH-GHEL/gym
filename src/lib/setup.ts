import { prisma } from "@/lib/prisma";

export async function ensureDefaultWorkoutDays(userId: string) {
  await prisma.workoutDay.createMany({
    data: [
      { userId, dayOfWeek: 1, title: "Ngày nghỉ", isRestDay: true },
      { userId, dayOfWeek: 2, title: "Ngày nghỉ", isRestDay: true },
      { userId, dayOfWeek: 3, title: "Ngày nghỉ", isRestDay: true },
      { userId, dayOfWeek: 4, title: "Ngày nghỉ", isRestDay: true },
      { userId, dayOfWeek: 5, title: "Ngày nghỉ", isRestDay: true },
      { userId, dayOfWeek: 6, title: "Ngày nghỉ", isRestDay: true },
      { userId, dayOfWeek: 0, title: "Ngày nghỉ", isRestDay: true },
    ],
    skipDuplicates: true,
  });
}
