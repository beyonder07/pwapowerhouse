import { NextRequest } from "next/server"
import { authenticateRequest } from "@/src/middleware/auth.middleware"
import { PaymentRequestSchema } from "@/src/modules/client/client.schema"
import { ClientService } from "@/src/modules/client/client.service"
import { rateLimitOrThrow } from "@/src/services/rate-limit.service"
import { fail, ok } from "@/src/utils/response"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

export async function POST(req: NextRequest) {
  try {
    const auth = await authenticateRequest(req)
    
    await rateLimitOrThrow({
      key: `client:payment-request:${auth.authUserId}`,
      limit: 3,
      windowSeconds: 60 * 10,
    })

    const input = PaymentRequestSchema.parse(await req.json())
    const data = await new ClientService(auth).requestPayment(input)

    return ok(data, 201)
  } catch (error) {
    return fail(error)
  }
}
