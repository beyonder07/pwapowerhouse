import { clearSessionCookies } from "@/src/services/auth.service"
import { ok } from "@/src/utils/response"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

export async function POST() {
  const res = ok({ signedOut: true })
  clearSessionCookies(res)

  return res
}
