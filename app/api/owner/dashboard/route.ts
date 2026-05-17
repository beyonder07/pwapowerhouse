import { NextRequest } from "next/server"
import { authenticateRequest } from "@/src/middleware/auth.middleware"
import { DashboardService } from "@/src/modules/gym/dashboard.service"
import { fail, ok } from "@/src/utils/response"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

export async function GET(req: NextRequest) {
  try {
    const auth = await authenticateRequest(req)
    const data = await new DashboardService(auth).getOwnerDashboard()
    return ok(data)
  } catch (error) {
    return fail(error)
  }
}
