import { NextRequest } from "next/server"
import { AuthModuleService } from "@/src/modules/auth/auth.service"
import { getRefreshToken, setSessionCookies } from "@/src/services/auth.service"
import { UnauthorizedError } from "@/src/utils/errors"
import { fail, ok } from "@/src/utils/response"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

export async function POST(req: NextRequest) {
  try {
    const refreshToken = getRefreshToken(req)
    if (!refreshToken) {
      throw new UnauthorizedError("Missing refresh token")
    }

    const session = await new AuthModuleService().refresh(refreshToken)
    const res = ok({ refreshed: true })
    setSessionCookies(res, session)

    return res
  } catch (error) {
    return fail(error)
  }
}
