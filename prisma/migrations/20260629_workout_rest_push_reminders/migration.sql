CREATE TABLE "PushSubscription" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "endpoint" TEXT NOT NULL,
  "p256dh" TEXT NOT NULL,
  "auth" TEXT NOT NULL,
  "userAgent" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "PushSubscription_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "WorkoutRestReminder" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "workoutSetLogId" TEXT,
  "workoutExerciseLogId" TEXT,
  "kind" TEXT NOT NULL,
  "title" TEXT NOT NULL,
  "body" TEXT NOT NULL,
  "url" TEXT NOT NULL DEFAULT '/today',
  "dueAt" TIMESTAMP(3) NOT NULL,
  "sentAt" TIMESTAMP(3),
  "lastError" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "WorkoutRestReminder_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "PushSubscription_endpoint_key" ON "PushSubscription"("endpoint");
CREATE INDEX "PushSubscription_userId_idx" ON "PushSubscription"("userId");
CREATE INDEX "WorkoutRestReminder_userId_dueAt_idx" ON "WorkoutRestReminder"("userId", "dueAt");
CREATE INDEX "WorkoutRestReminder_dueAt_sentAt_idx" ON "WorkoutRestReminder"("dueAt", "sentAt");

ALTER TABLE "PushSubscription"
  ADD CONSTRAINT "PushSubscription_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "WorkoutRestReminder"
  ADD CONSTRAINT "WorkoutRestReminder_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "WorkoutRestReminder"
  ADD CONSTRAINT "WorkoutRestReminder_workoutSetLogId_fkey"
  FOREIGN KEY ("workoutSetLogId") REFERENCES "WorkoutSetLog"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "WorkoutRestReminder"
  ADD CONSTRAINT "WorkoutRestReminder_workoutExerciseLogId_fkey"
  FOREIGN KEY ("workoutExerciseLogId") REFERENCES "WorkoutExerciseLog"("id") ON DELETE SET NULL ON UPDATE CASCADE;
