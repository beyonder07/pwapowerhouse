import { z } from "zod"

export const AttendanceCheckInSchema = z.object({
  latitude: z.number().min(-90).max(90),
  longitude: z.number().min(-180).max(180),
  clientTimestamp: z.string().datetime().optional(),
})
