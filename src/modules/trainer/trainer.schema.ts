import { z } from "zod"

export const TrainerMemberQuerySchema = z.object({
  search: z.string().trim().max(120).optional(),
  status: z.enum(["all", "active", "expiring", "expired"]).default("all"),
  activity: z
    .enum(["all", "present_today", "recent", "inactive", "no_attendance"])
    .default("all"),
})

export const TrainerAttendanceCheckInSchema = z
  .object({
    session: z.enum(["morning", "evening"]).optional(),
    action: z.enum(["check_in", "check_out"]).default("check_in"),
    latitude: z.number().min(-90).max(90).optional(),
    longitude: z.number().min(-180).max(180).optional(),
    clientTimestamp: z.string().datetime().optional(),
  })
  .refine(
    (input) =>
      (input.latitude === undefined && input.longitude === undefined) ||
      (input.latitude !== undefined && input.longitude !== undefined),
    "Latitude and longitude must be submitted together"
  )

const WorkoutExerciseSchema = z.object({
  name: z.string().trim().min(1, "Exercise name is required").max(120),
  sets: z.coerce.number().int().min(1).max(20),
  reps: z.string().trim().min(1, "Reps are required").max(40),
  restDuration: z.string().trim().max(40).optional().default(""),
  notes: z.string().trim().max(500).optional().default(""),
})

const WorkoutDaySchema = z.object({
  day: z.string().trim().min(1).max(80),
  exercises: z.array(WorkoutExerciseSchema).min(1),
})

export const WorkoutPlanUpsertSchema = z.object({
  id: z.string().uuid().optional(),
  memberId: z.string().trim().min(1),
  title: z.string().trim().min(2).max(120),
  notes: z.string().trim().max(2000).optional().default(""),
  status: z.enum(["active", "pending", "archived"]).default("active"),
  split: z.array(WorkoutDaySchema).min(1),
})

export type TrainerMemberQuery = z.infer<typeof TrainerMemberQuerySchema>
export type TrainerAttendanceCheckInInput = z.infer<
  typeof TrainerAttendanceCheckInSchema
>
export type WorkoutPlanUpsertInput = z.infer<typeof WorkoutPlanUpsertSchema>
