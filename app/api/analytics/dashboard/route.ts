import { NextRequest } from "next/server"
import { authenticateRequest } from "@/src/middleware/auth.middleware"
import { AnalyticsDateRangeQuerySchema } from "@/src/modules/analytics/analytics.schema"
import { AnalyticsService } from "@/src/modules/analytics/analytics.service"
import { getOwnerGymId } from "@/src/utils/owner-gym"
import { fail, ok } from "@/src/utils/response"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

export async function GET(req: NextRequest) {
  try {
    const auth = await authenticateRequest(req)
    const params = Object.fromEntries(req.nextUrl.searchParams)
    const ownerGymId = getOwnerGymId(auth)
    if (ownerGymId && !params.branchId) {
      params.branchId = ownerGymId
    }
    const query = AnalyticsDateRangeQuerySchema.parse(params)
    const data = await new AnalyticsService(auth).getDashboard(query)

    return ok(data)
  } catch (error) {
    return fail(error)
  }
}
