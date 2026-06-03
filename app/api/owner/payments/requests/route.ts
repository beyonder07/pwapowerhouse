import { NextRequest } from "next/server"
import { z } from "zod"
import { authenticateRequest } from "@/src/middleware/auth.middleware"
import { PaymentRequestService } from "@/src/modules/payments/payment-request.service"
import { fail, ok } from "@/src/utils/response"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

const ReviewSchema = z.object({
  requestId: z.string().uuid(),
  status: z.enum(["approved", "rejected"]),
})

export async function GET(req: NextRequest) {
  try {
    const auth = await authenticateRequest(req)
    const service = new PaymentRequestService(auth)
    const data = await service.listPending()

    return ok(data)
  } catch (error) {
    return fail(error)
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const auth = await authenticateRequest(req)
    const body = await req.json()
    const { requestId, status } = ReviewSchema.parse(body)

    const service = new PaymentRequestService(auth)
    const result = await service.review(requestId, status)

    return ok(result)
  } catch (error) {
    return fail(error)
  }
}
