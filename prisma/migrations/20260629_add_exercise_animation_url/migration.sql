ALTER TABLE "ExerciseCatalogItem"
  ADD COLUMN "animationUrl" TEXT;

ALTER TABLE "WorkoutExerciseLog"
  ADD COLUMN "animationUrl" TEXT;

UPDATE "WorkoutExerciseLog" AS wel
SET "animationUrl" = eci."animationUrl"
FROM "ExerciseCatalogItem" AS eci
WHERE wel."catalogItemId" = eci."id"
  AND wel."animationUrl" IS NULL
  AND eci."animationUrl" IS NOT NULL;
