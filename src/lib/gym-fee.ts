export const GYM_FEE_TITLE = "Tới hạn đóng tiền gym";
export const GYM_FEE_BODY = "Hôm nay là ngày đóng tiền phòng gym. Nhớ đóng nhé!";

function daysInMonth(year: number, month: number) {
  return new Date(Date.UTC(year, month, 0)).getUTCDate();
}

// Fee is due every month on the registration day; short months fall back to their last day.
export function isGymFeeDueToday(startDateKey: string, todayKey: string) {
  const [startYear, startMonth, startDay] = startDateKey.split("-").map(Number);
  const [year, month, day] = todayKey.split("-").map(Number);

  if (year * 12 + month <= startYear * 12 + startMonth) {
    return todayKey === startDateKey;
  }

  return day === Math.min(startDay, daysInMonth(year, month));
}
