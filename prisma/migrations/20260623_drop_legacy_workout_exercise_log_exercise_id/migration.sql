-- The workout log flow now stores catalog metadata in catalogItemId.
-- Drop the old per-user Exercise link so new catalog-only logs can be created.
DROP INDEX IF EXISTS "WorkoutExerciseLog_exerciseId_idx";
ALTER TABLE "WorkoutExerciseLog" DROP COLUMN IF EXISTS "exerciseId";
