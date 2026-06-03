import { NextRequest } from "next/server"
import { authenticateRequest } from "@/src/middleware/auth.middleware"
import { requireRole } from "@/src/middleware/role.middleware"
import { createSupabaseServiceRoleClient } from "@/src/services/supabase.service"
import { fail, ok } from "@/src/utils/response"
import { getEndOfMonth } from "@/src/utils/payment-dates"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

const admin = createSupabaseServiceRoleClient()

// Salary defaults to 0 — owner sets actual amounts via the inline edit on the Salary page
const DEFAULT_BASE_SALARY = 0
const DEFAULT_BONUS = 0

export async function POST(req: NextRequest) {
  try {
    const auth = await authenticateRequest(req)
    requireRole(auth, ["owner"])

    const body = await req.json().catch(() => ({}))
    const now = new Date()
    const monthStart =
      body.month ??
      `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-01`

    // Get all active trainers
    const { data: trainers, error: trainersError } = await admin
      .from("users")
      .select("id, name")
      .eq("role", "trainer")

    if (trainersError) throw trainersError
    if (!trainers || trainers.length === 0) {
      return ok({ created: 0, skipped: 0, message: "No trainers found" })
    }

    // Check which trainers already have a record for this month
    const { data: existing } = await admin
      .from("trainer_salaries")
      .select("user_id")
      .gte("month_start", monthStart)
      .lte("month_start", getEndOfMonth(monthStart))

    const existingIds = new Set((existing ?? []).map((r: any) => r.user_id))
    const toCreate = trainers.filter((t) => !existingIds.has(t.id))

    if (toCreate.length === 0) {
      return ok({ created: 0, skipped: trainers.length, message: "All trainers already have payroll records for this month" })
    }

    const rows = toCreate.map((t) => ({
      user_id: t.id,
      month_start: monthStart,
      base_salary: DEFAULT_BASE_SALARY,
      bonus: DEFAULT_BONUS,
      status: "pending",
    }))

    const { error: insertError } = await admin
      .from("trainer_salaries")
      .insert(rows)

    if (insertError) {
      const code = (insertError as any).code
      if (code === "42P01" || code === "PGRST205") {
        return fail(new Error("The trainer_salaries table does not exist in Supabase. Please create it using the SQL shown on the Salary page."))
      }
      throw insertError
    }

    return ok({
      created: toCreate.length,
      skipped: existingIds.size,
      message: `Generated payroll for ${toCreate.length} trainer${toCreate.length !== 1 ? "s" : ""}`,
    })
  } catch (error) {
    return fail(error)
  }
}
