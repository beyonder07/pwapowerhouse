import { NextRequest } from "next/server"
import { authenticateRequest } from "@/src/middleware/auth.middleware"
import { listOwnerMembers } from "@/src/modules/gym/owner-roster.service"
import { fail, ok } from "@/src/utils/response"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

export async function GET(req: NextRequest) {
  try {
    const auth = await authenticateRequest(req)
    const { searchParams } = new URL(req.url)

    const search = searchParams.get("search") ?? undefined
    const status = searchParams.get("status") ?? "all"
    const page = Math.max(1, Number(searchParams.get("page") ?? "1"))
    const limit = Math.min(50, Math.max(1, Number(searchParams.get("limit") ?? "20")))

    const data = await listOwnerMembers(auth, { search, status, page, limit })
    return ok(data)
  } catch (error) {
    return fail(error)
  }
}
