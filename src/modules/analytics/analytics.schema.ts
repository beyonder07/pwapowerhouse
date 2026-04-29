import { z } from "zod"

const OptionalDateSchema = z.preprocess(
  (value) => (value === "" ? undefined : value),
  z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional()
)

const OptionalUuidSchema = z.preprocess(
  (value) => (value === "" ? undefined : value),
  z.string().uuid().optional()
)

export const AnalyticsDateRangeQuerySchema = z.object({
  from: OptionalDateSchema,
  to: OptionalDateSchema,
  branchId: OptionalUuidSchema,
})

export const InactiveMembersQuerySchema = z.object({
  days: z.coerce.number().int().min(1).max(365).default(7),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  offset: z.coerce.number().int().min(0).default(0),
  branchId: OptionalUuidSchema,
})

export const RecentAttendanceQuerySchema = z.object({
  limit: z.coerce.number().int().min(1).max(100).default(20),
  offset: z.coerce.number().int().min(0).default(0),
  search: z.string().trim().max(120).optional(),
})

export type AnalyticsDateRangeQuery = z.infer<
  typeof AnalyticsDateRangeQuerySchema
>
export type InactiveMembersQuery = z.infer<typeof InactiveMembersQuerySchema>
export type RecentAttendanceQuery = z.infer<typeof RecentAttendanceQuerySchema>
