const DAY_ORDER = [1, 2, 3, 4, 5, 6, 0] as const;

const SHORT_DAY_NAMES: Record<number, string> = {
  0: "CN",
  1: "T2",
  2: "T3",
  3: "T4",
  4: "T5",
  5: "T6",
  6: "T7",
};

const TITLE_REPLACEMENTS: Record<string, string> = {
  PUSH: "Push",
  PULL: "Pull",
  LEGS: "Chân",
};

type ScheduleDayInput = {
  dayOfWeek: number;
  title: string;
  isRestDay: boolean;
  exercises: unknown[];
};

export type ScheduleWeekDay = {
  dayOfWeek: number;
  shortName: string;
  shortTitle: string;
  isRestDay: boolean;
  isSelected: boolean;
  exerciseCount: number;
};

export type ScheduleSummary<TDay extends ScheduleDayInput> = {
  selectedDay: TDay | null;
  stats: {
    trainingDayCount: number;
    exerciseCount: number;
    restDayCount: number;
  };
  weekDays: ScheduleWeekDay[];
};

function toPlainTitleCase(value: string) {
  return value
    .split(/\s+/)
    .filter(Boolean)
    .map((part) => TITLE_REPLACEMENTS[part.toUpperCase()] ?? part.charAt(0).toUpperCase() + part.slice(1).toLowerCase())
    .join(" ");
}

export function getFriendlyWorkoutTitle(title: string) {
  const withoutPrefix = title.includes(" - ") ? title.split(" - ").slice(1).join(" - ") : title;
  const withoutNote = withoutPrefix.replace(/\s*\(.+?\)\s*/g, " ").trim();
  return toPlainTitleCase(withoutNote || title.trim());
}

function shortenDayTitle(day: ScheduleDayInput | undefined) {
  if (!day) {
    return "Trống";
  }

  if (day.isRestDay) {
    return "Nghỉ";
  }

  const [firstWord] = getFriendlyWorkoutTitle(day.title).split(/\s+/);
  return firstWord || "Tập";
}

export function buildScheduleSummary<TDay extends ScheduleDayInput>({
  selectedDayOfWeek,
  workoutDays,
}: {
  selectedDayOfWeek: number;
  workoutDays: TDay[];
}): ScheduleSummary<TDay> {
  const dayByWeek = new Map(workoutDays.map((day) => [day.dayOfWeek, day]));
  const selectedDay = dayByWeek.get(selectedDayOfWeek) ?? workoutDays.find((day) => !day.isRestDay) ?? null;

  const trainingDays = workoutDays.filter((day) => !day.isRestDay);
  const restDays = workoutDays.filter((day) => day.isRestDay);

  return {
    selectedDay,
    stats: {
      trainingDayCount: trainingDays.length,
      exerciseCount: workoutDays.reduce((sum, day) => sum + day.exercises.length, 0),
      restDayCount: restDays.length,
    },
    weekDays: DAY_ORDER.map((dayOfWeek) => {
      const day = dayByWeek.get(dayOfWeek);

      return {
        dayOfWeek,
        shortName: SHORT_DAY_NAMES[dayOfWeek] ?? "Ngày",
        shortTitle: shortenDayTitle(day),
        isRestDay: day?.isRestDay ?? true,
        isSelected: selectedDay?.dayOfWeek === dayOfWeek,
        exerciseCount: day?.exercises.length ?? 0,
      };
    }),
  };
}
