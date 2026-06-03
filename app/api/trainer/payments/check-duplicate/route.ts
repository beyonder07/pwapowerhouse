import { NextRequest } from "next/server"
import { z } from "zod"
import { authenticateRequest } from "@/src/middleware/auth.middleware"
import { PaymentRequestService } from "@/src/modules/payments/payment-request.service"
import { fail, ok } from "@/src/utils/response"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

const QuerySchema = z.object({
  memberId: z.string().uuid(),
  month: z.string().regex(/^\d{4}-\d{2}$/, "Invalid month format. Expected YYYY-MM"),
})

export async function GET(req: NextRequest) {
  try {
    const auth = await authenticateRequest(req)
    
    const searchParams = Object.fromEntries(req.nextUrl.searchParams)
    const { memberId, month } = QuerySchema.parse(searchParams)

    const service = new PaymentRequestService(auth)
    const duplicate = await service.checkDuplicate(memberId, month)

    return ok(duplicate)
  } catch (error) {
    return fail(error)
  }
}
