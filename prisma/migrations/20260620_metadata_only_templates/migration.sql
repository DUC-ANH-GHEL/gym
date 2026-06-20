-- Create legacy catalog entries for scheduled exercises that were never linked to catalog metadata
INSERT INTO "ExerciseCatalogItem" ("id", "slug", "name", "muscleGroup", "imageUrl", "defaultWeightKg", "note", "sortOrder", "isActive", "createdAt", "updatedAt")
SELECT
  'legacy_' || e."id" AS "id",
  'legacy-' || e."id" AS "slug",
  e."name",
  e."muscleGroup",
  COALESCE(e."imageUrl", '/exercise-placeholder.png'),
  e."currentWeightKg",
  e."note",
  9999,
  true,
  NOW(),
  NOW()
FROM "Exercise" e
WHERE e."catalogItemId" IS NULL
  AND EXISTS (
    SELECT 1
    FROM "WorkoutDayExercise" wde
    WHERE wde."exerciseId" = e."id"
  );

-- Create template tables
CREATE TABLE "WorkoutTemplate" (
  "id" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "description" TEXT,
  "sessionsPerWeek" INTEGER NOT NULL DEFAULT 0,
  "isActive" BOOLEAN NOT NULL DEFAULT true,
  "sortOrder" INTEGER NOT NULL DEFAULT 0,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "WorkoutTemplate_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "WorkoutTemplateDay" (
  "id" TEXT NOT NULL,
  "workoutTemplateId" TEXT NOT NULL,
  "dayOfWeek" INTEGER NOT NULL,
  "title" TEXT NOT NULL,
  "isRestDay" BOOLEAN NOT NULL DEFAULT false,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "WorkoutTemplateDay_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "WorkoutTemplateExercise" (
  "id" TEXT NOT NULL,
  "workoutTemplateDayId" TEXT NOT NULL,
  "catalogItemId" TEXT NOT NULL,
  "orderIndex" INTEGER NOT NULL DEFAULT 0,
  "note" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "WorkoutTemplateExercise_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "WorkoutTemplateSet" (
  "id" TEXT NOT NULL,
  "workoutTemplateExerciseId" TEXT NOT NULL,
  "setIndex" INTEGER NOT NULL,
  "intensityPercent" INTEGER,
  "targetReps" INTEGER,
  "targetWeightKg" DOUBLE PRECISION,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "WorkoutTemplateSet_pkey" PRIMARY KEY ("id")
);

-- Add new columns for metadata-only schedule/log flow
ALTER TABLE "GymProfile"
  ADD COLUMN "appliedWorkoutTemplateId" TEXT,
  ADD COLUMN "appliedWorkoutTemplateAt" TIMESTAMP(3);

ALTER TABLE "WorkoutDayExercise"
  ADD COLUMN "catalogItemId" TEXT;

ALTER TABLE "WorkoutExerciseLog"
  ADD COLUMN "catalogItemId" TEXT;

-- Migrate schedule and logs from user Exercise -> catalog metadata
UPDATE "WorkoutDayExercise" wde
SET "catalogItemId" = COALESCE(e."catalogItemId", 'legacy_' || e."id")
FROM "Exercise" e
WHERE wde."exerciseId" = e."id";

UPDATE "WorkoutExerciseLog" wel
SET "catalogItemId" = COALESCE(e."catalogItemId", 'legacy_' || e."id")
FROM "Exercise" e
WHERE wel."exerciseId" = e."id";

ALTER TABLE "WorkoutDayExercise"
  ALTER COLUMN "catalogItemId" SET NOT NULL;

-- Drop old Exercise relation from schedule
DROP INDEX "WorkoutDayExercise_exerciseId_idx";
ALTER TABLE "WorkoutDayExercise" DROP CONSTRAINT "WorkoutDayExercise_exerciseId_fkey";
ALTER TABLE "WorkoutDayExercise" DROP COLUMN "exerciseId";

-- Drop old log index and recreate for catalog metadata
DROP INDEX "WorkoutExerciseLog_exerciseId_idx";

-- Create indexes
CREATE INDEX "WorkoutTemplate_isActive_sortOrder_idx" ON "WorkoutTemplate"("isActive", "sortOrder");
CREATE UNIQUE INDEX "WorkoutTemplateDay_workoutTemplateId_dayOfWeek_key" ON "WorkoutTemplateDay"("workoutTemplateId", "dayOfWeek");
CREATE INDEX "WorkoutTemplateDay_workoutTemplateId_dayOfWeek_idx" ON "WorkoutTemplateDay"("workoutTemplateId", "dayOfWeek");
CREATE INDEX "WorkoutTemplateExercise_workoutTemplateDayId_orderIndex_idx" ON "WorkoutTemplateExercise"("workoutTemplateDayId", "orderIndex");
CREATE INDEX "WorkoutTemplateExercise_catalogItemId_idx" ON "WorkoutTemplateExercise"("catalogItemId");
CREATE INDEX "WorkoutTemplateSet_workoutTemplateExerciseId_setIndex_idx" ON "WorkoutTemplateSet"("workoutTemplateExerciseId", "setIndex");
CREATE INDEX "WorkoutDayExercise_catalogItemId_idx" ON "WorkoutDayExercise"("catalogItemId");
CREATE INDEX "WorkoutExerciseLog_catalogItemId_idx" ON "WorkoutExerciseLog"("catalogItemId");

-- Add new foreign keys
ALTER TABLE "GymProfile"
  ADD CONSTRAINT "GymProfile_appliedWorkoutTemplateId_fkey"
  FOREIGN KEY ("appliedWorkoutTemplateId") REFERENCES "WorkoutTemplate"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "WorkoutDayExercise"
  ADD CONSTRAINT "WorkoutDayExercise_catalogItemId_fkey"
  FOREIGN KEY ("catalogItemId") REFERENCES "ExerciseCatalogItem"("id")
  ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "WorkoutExerciseLog"
  ADD CONSTRAINT "WorkoutExerciseLog_catalogItemId_fkey"
  FOREIGN KEY ("catalogItemId") REFERENCES "ExerciseCatalogItem"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "WorkoutTemplateDay"
  ADD CONSTRAINT "WorkoutTemplateDay_workoutTemplateId_fkey"
  FOREIGN KEY ("workoutTemplateId") REFERENCES "WorkoutTemplate"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "WorkoutTemplateExercise"
  ADD CONSTRAINT "WorkoutTemplateExercise_workoutTemplateDayId_fkey"
  FOREIGN KEY ("workoutTemplateDayId") REFERENCES "WorkoutTemplateDay"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "WorkoutTemplateExercise"
  ADD CONSTRAINT "WorkoutTemplateExercise_catalogItemId_fkey"
  FOREIGN KEY ("catalogItemId") REFERENCES "ExerciseCatalogItem"("id")
  ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "WorkoutTemplateSet"
  ADD CONSTRAINT "WorkoutTemplateSet_workoutTemplateExerciseId_fkey"
  FOREIGN KEY ("workoutTemplateExerciseId") REFERENCES "WorkoutTemplateExercise"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;
