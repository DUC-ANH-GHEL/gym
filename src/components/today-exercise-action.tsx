"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { getTodayExerciseHref } from "@/lib/workout-today-flow";

const TEXT = {
  waitRest: "\u0110\u1ee3i ngh\u1ec9",
  waitTitle: "H\u1ebft gi\u1edd ngh\u1ec9 r\u1ed3i h\u00e3y t\u1eadp ti\u1ebfp",
};

function useRestLocked(restDueAtMs: number | null) {
  const [now, setNow] = useState(() => Date.now());
  const locked = typeof restDueAtMs === "number" && restDueAtMs > now;

  useEffect(() => {
    if (!locked) {
      return;
    }

    const interval = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(interval);
  }, [locked]);

  return locked;
}

export function TodayExerciseAction({
  action,
  className,
  cta,
  exerciseLogId,
  isCompleted,
  isStarted,
  restDueAtMs,
  onBeforeNavigate,
  wide = false,
  workoutDayExerciseId,
}: {
  action: (formData: FormData) => void | Promise<void>;
  className: string;
  cta: string;
  exerciseLogId: string | null;
  isCompleted: boolean;
  isStarted: boolean;
  restDueAtMs: number | null;
  onBeforeNavigate?: () => void;
  wide?: boolean;
  workoutDayExerciseId: string;
}) {
  const router = useRouter();
  const restLocked = useRestLocked(restDueAtMs);
  const href = getTodayExerciseHref({ exerciseLogId, isCompleted, isStarted });

  if (href && isCompleted) {
    return (
      <button
        type="button"
        className={className}
        onClick={() => {
          onBeforeNavigate?.();
          router.push(href);
        }}
      >
        {cta}
      </button>
    );
  }

  if (restLocked) {
    return (
      <button
        type="button"
        disabled
        title={TEXT.waitTitle}
        className={`${className} cursor-not-allowed opacity-55 active:scale-100`}
      >
        {TEXT.waitRest}
      </button>
    );
  }

  if (href) {
    return (
      <Link href={href} className={className} onClick={onBeforeNavigate}>
        {cta}
      </Link>
    );
  }

  return (
    <form action={action} className={wide ? "w-full" : "shrink-0"}>
      <input type="hidden" name="workoutDayExerciseId" value={workoutDayExerciseId} />
      <button className={className}>{cta}</button>
    </form>
  );
}
