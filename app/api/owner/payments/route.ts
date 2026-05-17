import { NextRequest } from "next/server"
import { authenticateRequest } from "@/src/middleware/auth.middleware"
import { PaymentReviewSchema } from "@/src/modules/payments/payment-approval.schema"
import { PaymentApprovalService } from "@/src/modules/payments/payment-approval.service"
import { fail, ok } from "@/src/utils/response"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

export async function GET(req: NextRequest) {
  try {
    const auth = await authenticateRequest(req)
    const data = await new PaymentApprovalService(auth).list()

    return ok(data)
  } catch (error) {
    return fail(error)
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const auth = await authenticateRequest(req)
    const input = PaymentReviewSchema.parse(await req.json())
    const data = await new PaymentApprovalService(auth).review(input)

    return ok(data)
  } catch (error) {
    return fail(error)
  }
}
