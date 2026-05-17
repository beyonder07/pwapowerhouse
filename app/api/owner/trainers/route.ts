import { NextRequest } from "next/server"
import { authenticateRequest } from "@/src/middleware/auth.middleware"
import { listOwnerTrainers } from "@/src/modules/gym/owner-roster.service"
import { fail, ok } from "@/src/utils/response"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

export async function GET(req: NextRequest) {
  try {
    const auth = await authenticateRequest(req)
    const { searchParams } = new URL(req.url)
    const search = searchParams.get("search") ?? undefined

    const data = await listOwnerTrainers(auth, { search })
    return ok(data)
  } catch (error) {
    return fail(error)
  }
}
