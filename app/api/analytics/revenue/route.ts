import { NextRequest } from "next/server"
import { authenticateRequest } from "@/src/middleware/auth.middleware"
import { AnalyticsDateRangeQuerySchema } from "@/src/modules/analytics/analytics.schema"
import { AnalyticsService } from "@/src/modules/analytics/analytics.service"
import { fail, ok } from "@/src/utils/response"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

export async function GET(req: NextRequest) {
  try {
    const auth = await authenticateRequest(req)
    const query = AnalyticsDateRangeQuerySchema.parse(
      Object.fromEntries(req.nextUrl.searchParams)
    )
    const data = await new AnalyticsService(auth).getRevenue(query)

    return ok(data)
  } catch (error) {
    return fail(error)
  }
}
