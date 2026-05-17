import { NextRequest } from "next/server"
import { authenticateRequest } from "@/src/middleware/auth.middleware"
import { TrainerPanelService } from "@/src/modules/trainer/trainer.service"
import { rateLimitOrThrow } from "@/src/services/rate-limit.service"
import { fail, ok } from "@/src/utils/response"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

export async function GET(req: NextRequest) {
  try {
    const auth = await authenticateRequest(req)
    const data = await new TrainerPanelService(auth).getAttendance()

    return ok(data)
  } catch (error) {
    return fail(error)
  }
}

export async function POST(req: NextRequest) {
  try {
    const auth = await authenticateRequest(req)
    await rateLimitOrThrow({
      key: `trainer:attendance:${auth.authUserId}`,
      limit: 4,
      windowSeconds: 60,
    })

    const requestId = req.headers.get("idempotency-key") ?? crypto.randomUUID()
    const data = await new TrainerPanelService(auth).markAttendance(
      await req.json(),
      requestId
    )

    return ok(data, 201)
  } catch (error) {
    return fail(error)
  }
}
