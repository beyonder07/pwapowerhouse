import { NextRequest } from "next/server"
import { authenticateRequest } from "@/src/middleware/auth.middleware"
import { requireRole } from "@/src/middleware/role.middleware"
import { createSupabaseServiceRoleClient } from "@/src/services/supabase.service"
import { fail, ok } from "@/src/utils/response"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

const admin = createSupabaseServiceRoleClient()

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await authenticateRequest(req)
    requireRole(auth, ["owner"])
    const { id } = await params

    const body = await req.json()
    const { is_active } = body

    if (typeof is_active !== "boolean") {
      return fail(new Error("is_active must be a boolean"))
    }

    const { error } = await admin
      .from("users")
      .update({ is_active })
      .eq("id", id)

    if (error) return fail(error)

    return ok({ success: true, is_active })
  } catch (error) {
    return fail(error)
  }
}
