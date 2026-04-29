import { NextRequest } from "next/server"
import { OwnerSetupSchema } from "@/src/modules/auth/setup.schema"
import { OwnerSetupService } from "@/src/modules/auth/setup.service"
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
      key: `setup:owner:${ip}`,
      limit: 5,
      windowSeconds: 300,
    })

    const input = OwnerSetupSchema.parse(await req.json())
    await new OwnerSetupService().createOwner(input)

    const login = await new AuthModuleService().login(input.email, input.password)
    const res = ok({ user: login.user }, 201)
    setSessionCookies(res, login.session)

    return res
  } catch (error) {
    return fail(error)
  }
}
