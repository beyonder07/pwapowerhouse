import { NextRequest } from "next/server"
import { PasswordResetRequestSchema } from "@/src/modules/auth/auth.schema"
import { createSupabaseAuthClient } from "@/src/services/supabase.service"
import { rateLimitOrThrow } from "@/src/services/rate-limit.service"
import { fail, ok } from "@/src/utils/response"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

export async function POST(req: NextRequest) {
  try {
    const ip = req.headers.get("x-forwarded-for")?.split(",")[0] ?? "unknown"
    await rateLimitOrThrow({
      key: `auth:password-reset:${ip}`,
      limit: 5,
      windowSeconds: 300,
    })

    const input = PasswordResetRequestSchema.parse(await req.json())
    const origin = req.headers.get("origin")
    const authClient = createSupabaseAuthClient()
    const { error } = await authClient.auth.resetPasswordForEmail(input.email, {
      redirectTo: origin ? `${origin}/login` : undefined,
    })

    if (error) {
      throw error
    }

    return ok({ sent: true })
  } catch (error) {
    return fail(error)
  }
}
