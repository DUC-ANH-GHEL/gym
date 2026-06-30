export const SET_REST_SECONDS = 30;
export const EXERCISE_REST_SECONDS = 90;

export type RestReminderPlan = {
  seconds: number;
  kind: "set" | "exercise";
  title: string;
  body: string;
};

export type RestLock = {
  dueAtMs: number;
  restSeconds: number;
  title: string;
  body: string;
};

export type RestSearchParams = {
  rest?: string;
  restTitle?: string;
  restBody?: string;
  restDueAt?: string;
};

const DEFAULT_REST_TITLE = "T\u1edbi gi\u1edd t\u1eadp";
const DEFAULT_REST_BODY = "Ngh\u1ec9 xong r\u1ed3i. V\u00e0o t\u1eadp ti\u1ebfp nh\u00e9.";
const LOCAL_NOTIFICATION_GRACE_MS = 2 * 60 * 1000;

export function isRestLocked(dueAtMs: number | null | undefined, nowMs = Date.now()) {
  return typeof dueAtMs === "number" && Number.isFinite(dueAtMs) && dueAtMs > nowMs;
}

export function getRestLockFromSearchParams(params: RestSearchParams, nowMs = Date.now()): RestLock | null {
  const dueAtMs = Number(params.restDueAt || 0);
  if (!isRestLocked(dueAtMs, nowMs)) {
    return null;
  }

  const restSeconds = Number(params.rest || 0);

  return {
    dueAtMs,
    restSeconds: Number.isFinite(restSeconds) && restSeconds > 0 ? restSeconds : Math.ceil((dueAtMs - nowMs) / 1000),
    title: params.restTitle || DEFAULT_REST_TITLE,
    body: params.restBody || DEFAULT_REST_BODY,
  };
}

export function shouldShowLocalRestNotification(dueAtMs: number, nowMs = Date.now()) {
  return Number.isFinite(dueAtMs) && nowMs >= dueAtMs && nowMs - dueAtMs <= LOCAL_NOTIFICATION_GRACE_MS;
}

export function getRestReminderPlan({
  setWasCompleted,
  exerciseIsCompleted,
  nextExerciseName,
}: {
  setWasCompleted: boolean;
  exerciseIsCompleted: boolean;
  nextExerciseName: string | null;
}): RestReminderPlan | null {
  if (!setWasCompleted) {
    return null;
  }

  if (exerciseIsCompleted) {
    return {
      seconds: EXERCISE_REST_SECONDS,
      kind: "exercise",
      title: "T\u1edbi b\u00e0i ti\u1ebfp theo",
      body: nextExerciseName
        ? `Ngh\u1ec9 xong r\u1ed3i. Chuy\u1ec3n sang ${nextExerciseName} nh\u00e9.`
        : "Ngh\u1ec9 xong r\u1ed3i. Ch\u1ecdn b\u00e0i ti\u1ebfp theo nh\u00e9.",
    };
  }

  return {
    seconds: SET_REST_SECONDS,
    kind: "set",
    title: "T\u1edbi set ti\u1ebfp theo",
    body: "Ngh\u1ec9 xong r\u1ed3i. V\u00e0o t\u1eadp set ti\u1ebfp theo nh\u00e9.",
  };
}

export function buildLastSetHint(
  lastSet: {
    actualWeightKg: number | null;
    actualReps: number | null;
  } | null,
) {
  if (!lastSet) {
    return null;
  }

  const hasWeight = typeof lastSet.actualWeightKg === "number";
  const hasReps = typeof lastSet.actualReps === "number";

  if (hasWeight && hasReps) {
    return `L\u1ea7n tr\u01b0\u1edbc: ${lastSet.actualWeightKg} kg x ${lastSet.actualReps} l\u1ea7n`;
  }

  if (hasWeight) {
    return `L\u1ea7n tr\u01b0\u1edbc: ${lastSet.actualWeightKg} kg`;
  }

  if (hasReps) {
    return `L\u1ea7n tr\u01b0\u1edbc: ${lastSet.actualReps} l\u1ea7n`;
  }

  return null;
}
