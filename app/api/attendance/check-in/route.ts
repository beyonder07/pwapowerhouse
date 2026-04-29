import { NextRequest } from "next/server"
import { authenticateRequest } from "@/src/middleware/auth.middleware"
import { AttendanceService } from "@/src/modules/attendance/attendance.service"
import { rateLimitOrThrow } from "@/src/services/rate-limit.service"
import { fail, ok } from "@/src/utils/response"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

export async function POST(req: NextRequest) {
  try {
    const ctx = await authenticateRequest(req)
    await rateLimitOrThrow({
      key: `attendance:check-in:${ctx.authUserId}`,
      limit: 6,
      windowSeconds: 60,
    })

    const requestId = req.headers.get("idempotency-key") ?? crypto.randomUUID()
    const result = await new AttendanceService(ctx).checkIn(
      await req.json(),
      requestId
    )

    return ok(result, 201)
  } catch (error) {
    return fail(error)
  }
}
