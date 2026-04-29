import { NextRequest } from "next/server"
import { authenticateRequest } from "@/src/middleware/auth.middleware"
import { fail, ok } from "@/src/utils/response"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

export async function GET(req: NextRequest) {
  try {
    const auth = await authenticateRequest(req)

    return ok({
      user: {
        id: auth.user.id,
        email: auth.user.email,
        fullName: auth.user.full_name,
        avatarUrl: auth.user.avatar_url,
        role: auth.user.role,
        branchId: auth.user.branch_id,
      },
    })
  } catch (error) {
    return fail(error)
  }
}
