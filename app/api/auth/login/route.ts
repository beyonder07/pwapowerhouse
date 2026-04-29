import { NextRequest } from "next/server"
import { LoginSchema } from "@/src/modules/auth/auth.schema"
import { AuthModuleService } from "@/src/modules/auth/auth.service"
import { setSessionCookies } from "@/src/services/auth.service"
import { rateLimitOrThrow } from "@/src/services/rate-limit.service"
import { fail, ok } from "@/src/utils/response"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

export async function POST(req: NextRequest) {
  try {
    const ip = req.headers.get("x-forwarded-for")?.split(",")[0] ?? "unknown"
    await rateLimitOrThrow({
      key: `auth:login:${ip}`,
      limit: 10,
      windowSeconds: 60,
    })

    const input = LoginSchema.parse(await req.json())
    const result = await new AuthModuleService().login(input.email, input.password)
    const res = ok({ user: result.user })
    setSessionCookies(res, result.session)

    return res
  } catch (error) {
    return fail(error)
  }
}
