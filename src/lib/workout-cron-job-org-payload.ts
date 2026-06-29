export type CronJobOrgPayload = {
  job: {
    title: string;
    enabled: boolean;
    url: string;
    saveResponses: boolean;
    requestTimeout: number;
    redirectSuccess: boolean;
    requestMethod: 1;
    schedule: {
      timezone: "UTC";
      expiresAt: 0;
      hours: [-1];
      mdays: [-1];
      minutes: [-1];
      months: [-1];
      wdays: [-1];
    };
    extendedData: {
      headers: Record<string, string>;
      body: string;
    };
  };
};

export function isLocalUrl(url: URL) {
  return url.hostname === "localhost" || url.hostname === "127.0.0.1" || url.hostname === "::1";
}

export function resolveWorkoutReminderCronUrl(baseUrl: string) {
  const url = new URL("/api/workout-reminders/due", baseUrl);

  if (url.protocol !== "https:" && !isLocalUrl(url)) {
    throw new Error("Workout reminder cron URL must use HTTPS.");
  }

  return url.toString();
}

export function buildWorkoutReminderCronJobPayload({
  url,
  cronSecret,
}: {
  url: string;
  cronSecret: string;
}): CronJobOrgPayload {
  return {
    job: {
      title: "Gym workout rest reminders",
      enabled: true,
      url,
      saveResponses: false,
      requestTimeout: 30,
      redirectSuccess: false,
      requestMethod: 1,
      schedule: {
        timezone: "UTC",
        expiresAt: 0,
        hours: [-1],
        mdays: [-1],
        minutes: [-1],
        months: [-1],
        wdays: [-1],
      },
      extendedData: {
        headers: {
          Authorization: `Bearer ${cronSecret}`,
          "Content-Type": "application/json",
        },
        body: "",
      },
    },
  };
}
