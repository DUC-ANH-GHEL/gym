import { z } from "zod";

const optionalNumberField = (schema: z.ZodNumber) =>
  z.preprocess((value) => {
    if (value === "" || value === null || value === undefined) {
      return undefined;
    }

    if (typeof value === "number") {
      return Number.isNaN(value) ? undefined : value;
    }

    const parsed = Number(value);
    return Number.isNaN(parsed) ? undefined : parsed;
  }, schema.optional());

export const authSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
  name: z.string().trim().optional(),
});

export const profileSchema = z.object({
  displayName: z.string().trim().max(80).optional().or(z.literal("")),
  goal: z.string().trim().max(120).optional().or(z.literal("")),
  heightCm: optionalNumberField(z.number().int().positive().max(300)),
  weightKg: optionalNumberField(z.number().positive().max(1000)),
  timezone: z.string().trim().min(1),
});

export const exerciseSchema = z.object({
  id: z.string().optional(),
  name: z.string().trim().min(2).max(120),
  muscleGroup: z.string().trim().optional().or(z.literal("")),
  currentWeightKg: optionalNumberField(z.number().positive().max(1000)),
  imageUrl: z.string().url().optional().or(z.literal("")),
  note: z.string().trim().max(500).optional().or(z.literal("")),
});

export const workoutDaySchema = z.object({
  title: z.string().trim().min(1).max(120),
  isRestDay: z.coerce.boolean(),
});

export const workoutSetSchema = z.object({
  setIndex: z.coerce.number().int().nonnegative(),
  intensityPercent: optionalNumberField(z.number().int().min(0).max(100)),
  targetReps: optionalNumberField(z.number().int().positive().max(1000)),
  targetWeightKg: optionalNumberField(z.number().positive().max(1000)),
});
