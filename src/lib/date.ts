export const DAY_NAMES = ["Chủ nhật", "Thứ 2", "Thứ 3", "Thứ 4", "Thứ 5", "Thứ 6", "Thứ 7"] as const;

const weekdayNames = new Map<string, number>([
  ["Sun", 0],
  ["Mon", 1],
  ["Tue", 2],
  ["Wed", 3],
  ["Thu", 4],
  ["Fri", 5],
  ["Sat", 6],
]);

export function getDayOfWeekInTimeZone(date: Date, timeZone: string): number {
  const weekday = new Intl.DateTimeFormat("en-US", { timeZone, weekday: "short" }).format(date);
  const value = weekdayNames.get(weekday);
  return value ?? 0;
}

export function getDateKeyInTimeZone(date: Date, timeZone: string): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(date);
}

export function formatWorkoutDate(date: Date, timeZone: string): string {
  return new Intl.DateTimeFormat("vi-VN", {
    timeZone,
    weekday: "long",
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(date);
}

export function dayLabel(dayOfWeek: number): string {
  return DAY_NAMES[dayOfWeek] ?? "Ngày";
}

export function todayLabel(dayOfWeek: number, title: string): string {
  return `${dayLabel(dayOfWeek)} - ${title}`;
}
