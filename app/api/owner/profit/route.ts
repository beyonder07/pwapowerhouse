import { NextRequest } from "next/server"
import { authenticateRequest } from "@/src/middleware/auth.middleware"
import { getProfitMetrics } from "@/src/modules/gym/profit.service"
import { fail, ok } from "@/src/utils/response"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

export async function GET(req: NextRequest) {
  try {
    const auth = await authenticateRequest(req)
    const { searchParams } = new URL(req.url)
    const month = searchParams.get("month")
    if (!month) throw new Error("Month parameter required (YYYY-MM-01)")

    const data = await getProfitMetrics(auth, month)
    return ok(data)
  } catch (error) {
    if ((error as any).message === "TABLE_MISSING" || (error as any).code === "42P01") {
        return ok({ needsSetup: true })
    }
    return fail(error)
  }
}
