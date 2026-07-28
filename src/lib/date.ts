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

function getTimeZoneOffsetMs(date: Date, timeZone: string) {
  const value = new Intl.DateTimeFormat("en-US", {
    timeZone,
    timeZoneName: "longOffset",
  })
    .formatToParts(date)
    .find((part) => part.type === "timeZoneName")?.value;
  const match = value?.match(/^GMT([+-])(\d{2}):(\d{2})$/);

  if (!match) {
    return 0;
  }

  const offsetMs = (Number(match[2]) * 60 + Number(match[3])) * 60 * 1000;
  return match[1] === "+" ? offsetMs : -offsetMs;
}

function getTimeZoneDayBoundary(dateKey: string, timeZone: string) {
  const [year, month, day] = dateKey.split("-").map(Number);
  const utcMidnightMs = Date.UTC(year, month - 1, day);

  return new Date(utcMidnightMs - getTimeZoneOffsetMs(new Date(utcMidnightMs), timeZone));
}

export function getWorkoutLogLookupWindow(date: Date, timeZone: string) {
  const dateKey = getDateKeyInTimeZone(date, timeZone);
  const [year, month, day] = dateKey.split("-").map(Number);
  const nextDayKey = new Date(Date.UTC(year, month - 1, day + 1)).toISOString().slice(0, 10);

  return {
    gte: getTimeZoneDayBoundary(dateKey, timeZone),
    lt: getTimeZoneDayBoundary(nextDayKey, timeZone),
  };
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
