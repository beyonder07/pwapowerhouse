import { NextRequest } from "next/server"
import { z } from "zod"
import { authenticateRequest } from "@/src/middleware/auth.middleware"
import { PaymentRequestService } from "@/src/modules/payments/payment-request.service"
import { rateLimitOrThrow } from "@/src/services/rate-limit.service"
import { fail, ok } from "@/src/utils/response"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

const TrainerPaymentRequestSchema = z.object({
  memberId: z.string().uuid(),
  amount: z.number().positive(),
  month: z.string().regex(/^\d{4}-\d{2}$/, "Invalid month format. Expected YYYY-MM"),
  paymentMode: z.enum(['cash', 'upi', 'card', 'bank-transfer', 'other']),
  notes: z.string().optional(),
  screenshotUrl: z.string().optional(),
  planStartDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Invalid date format").optional().nullable(),
  planEndDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Invalid date format").optional().nullable(),
  paymentDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Invalid date format").optional().nullable(),
})

export async function POST(req: NextRequest) {
  try {
    const auth = await authenticateRequest(req)
    
    // Rate limit per trainer
    await rateLimitOrThrow({
      key: `trainer:payment-request:${auth.user.id}`,
      limit: 5,
      windowSeconds: 60,
    })

    const body = await req.json()
    const input = TrainerPaymentRequestSchema.parse(body)

    const service = new PaymentRequestService(auth)
    const data = await service.createRequest({
      ...input,
      createdBy: "trainer",
    })

    return ok(data, 201)
  } catch (error) {
    return fail(error)
  }
}
