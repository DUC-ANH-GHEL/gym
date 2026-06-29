CREATE TABLE "WorkoutCronJob" (
  "id" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "provider" TEXT NOT NULL DEFAULT 'cron-job.org',
  "providerJobId" INTEGER,
  "lastError" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "WorkoutCronJob_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "WorkoutCronJob_name_key" ON "WorkoutCronJob"("name");
