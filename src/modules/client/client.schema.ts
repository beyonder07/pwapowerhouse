import { z } from "zod"

export const PaymentRequestSchema = z.object({
  amount: z.number().positive("Amount must be positive"),
  planDuration: z.number().int().min(1, "Duration must be at least 1 day"),
  paymentMode: z.enum(["upi", "cash"]),
  screenshotUrl: z.string().url("Valid screenshot URL required").optional()
}).refine((data) => {
  if (data.paymentMode === "upi" && !data.screenshotUrl) {
    return false
  }
  return true
}, {
  message: "Screenshot is mandatory for UPI payments",
  path: ["screenshotUrl"]
})

export type PaymentRequestInput = z.infer<typeof PaymentRequestSchema>
