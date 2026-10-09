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
  identifier: z
    .string()
    .trim()
    .min(3)
    .max(60)
    .regex(/^[^\p{C}<>"'`\\/]+$/u)
    .transform((value) => value.toLowerCase()),
  password: z.string().min(8),
  name: z.string().trim().optional(),
});

export const profileSchema = z.object({
  displayName: z.string().trim().max(80).optional().or(z.literal("")),
  goal: z.string().trim().max(120).optional().or(z.literal("")),
  heightCm: optionalNumberField(z.number().int().positive().max(300)),
  weightKg: optionalNumberField(z.number().positive().max(1000)),
  timezone: z.string().trim().min(1),
  membershipStartDate: z
    .string()
    .trim()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .refine((value) => !Number.isNaN(Date.parse(`${value}T00:00:00Z`)))
    .optional()
    .or(z.literal("")),
});

export const exerciseSchema = z.object({
  id: z.string().optional(),
  name: z.string().trim().min(2).max(120),
  muscleGroup: z.string().trim().optional().or(z.literal("")),
  currentWeightKg: optionalNumberField(z.number().positive().max(1000)),
  imageUrl: z.string().url().optional().or(z.literal("")),
  note: z.string().trim().max(500).optional().or(z.literal("")),
});

export const exerciseCatalogItemSchema = z.object({
  id: z.string().optional(),
  name: z.string().trim().min(2).max(120),
  muscleGroup: z.string().trim().optional().or(z.literal("")),
  imageUrl: z.string().trim().max(2048).optional().or(z.literal("")),
  animationUrl: z.string().trim().max(2048).optional().or(z.literal("")),
  defaultWeightKg: optionalNumberField(z.number().positive().max(1000)),
  defaultSets: optionalNumberField(z.number().int().min(1).max(10)),
  defaultReps: optionalNumberField(z.number().int().min(1).max(100)),
  note: z.string().trim().max(500).optional().or(z.literal("")),
  sortOrder: optionalNumberField(z.number().int().min(0).max(100000)),
  isActive: z.coerce.boolean().optional(),
});

export const workoutTemplateSchema = z.object({
  id: z.string().optional(),
  name: z.string().trim().min(2).max(120),
  description: z.string().trim().max(500).optional().or(z.literal("")),
  sessionsPerWeek: optionalNumberField(z.number().int().min(0).max(7)),
  sortOrder: optionalNumberField(z.number().int().min(0).max(100000)),
  isActive: z.coerce.boolean().optional(),
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
