import { z } from "zod"

export const PaymentReviewSchema = z.object({
  id: z.coerce.string().min(1),
  status: z.enum(["approved", "rejected"]),
})

export type PaymentReviewInput = z.infer<typeof PaymentReviewSchema>
