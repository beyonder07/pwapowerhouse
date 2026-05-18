import { z } from "zod"

export const PaymentReviewSchema = z.object({
  id: z.coerce.string().min(1),
  status: z.enum(["approved", "rejected"]),
  planStartDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Invalid plan start date format").optional(),
  paymentDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Invalid payment date format").optional()
})

export type PaymentReviewInput = z.infer<typeof PaymentReviewSchema>
