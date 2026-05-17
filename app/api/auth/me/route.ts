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
        fullName: auth.user.fullName,
        role: auth.user.role,
        gymId: auth.user.gymId,
      },
    })
  } catch (error) {
    return fail(error)
  }
}
