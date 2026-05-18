import { z } from "zod"

export const PaymentRequestSchema = z.object({
  amount: z.number().positive("Amount must be positive"),
  planDuration: z.number().int().min(1, "Duration must be at least 1 day"),
  paymentMode: z.enum(["upi", "cash"]),
  screenshotUrl: z.string().optional(),
  startDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Invalid start date format").optional(),
  paymentDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Invalid payment date format").optional()
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

