import { z } from "zod"

export const RequestStatusUpdateSchema = z.object({
  type: z.enum(["membership", "trainer"]),
  id: z.string().uuid(),
  status: z.enum(["approved", "rejected"]),
})

export type RequestStatusUpdateInput = z.infer<
  typeof RequestStatusUpdateSchema
>
