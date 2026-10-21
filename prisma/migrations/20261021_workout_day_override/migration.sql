CREATE TABLE "WorkoutDayOverride" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "dateKey" TEXT NOT NULL,
    "sourceDayOfWeek" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "WorkoutDayOverride_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "WorkoutDayOverride_userId_dateKey_key" ON "WorkoutDayOverride"("userId", "dateKey");

ALTER TABLE "WorkoutDayOverride" ADD CONSTRAINT "WorkoutDayOverride_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
