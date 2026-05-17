import { NextRequest } from "next/server"
import { authenticateRequest } from "@/src/middleware/auth.middleware"
import { requireRole } from "@/src/middleware/role.middleware"
import { createSupabaseServiceRoleClient } from "@/src/services/supabase.service"
import { fail, ok } from "@/src/utils/response"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

const admin = createSupabaseServiceRoleClient()

export async function GET(req: NextRequest) {
  try {
    const auth = await authenticateRequest(req)
    requireRole(auth, ["owner"])

    const { searchParams } = new URL(req.url)
    const limitParam = Number(searchParams.get("limit") ?? "20")
    const offsetParam = Number(searchParams.get("offset") ?? "0")
    const search = searchParams.get("search")?.trim() ?? ""

    // Fetch attendance with user join — direct query, no RPC needed
    let query = admin
      .from("attendance")
      .select(
        "id, user_id, gym_id, date, check_in_time, check_out_time, distance_meters, users!inner(name)",
        { count: "exact" }
      )
      .order("check_in_time", { ascending: false })
      .range(offsetParam, offsetParam + limitParam - 1)

    if (search) {
      query = query.ilike("users.name", `%${search}%`)
    }

    const { data, error, count } = await query

    if (error) throw error

    // Fetch gym names for branch column
    const gymIds = [...new Set((data ?? []).map((r: any) => r.gym_id).filter(Boolean))]
    const gymMap = new Map<string, string>()
    if (gymIds.length > 0) {
      const { data: gyms } = await admin.from("gyms").select("id, name").in("id", gymIds)
      for (const g of gyms ?? []) gymMap.set(g.id, g.name)
    }

    const checkIns = (data ?? []).map((row: any) => ({
      id: row.id,
      memberId: row.user_id,
      memberName: (row.users as any)?.name ?? "Member",
      branchName: row.gym_id ? (gymMap.get(row.gym_id) ?? "Gym") : "Gym",
      attendanceDate: row.date,
      checkedInAt: row.check_in_time,
      checkedOutAt: row.check_out_time ?? null,
      distanceMeters: Number(row.distance_meters ?? 0),
    }))

    return ok({ count: count ?? 0, checkIns })
  } catch (error) {
    return fail(error)
  }
}
