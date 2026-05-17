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
    requireRole(auth, ["owner", "trainer"])

    const { searchParams } = new URL(req.url)
    const from =
      searchParams.get("from") ??
      new Date(Date.now() - 6 * 86400000).toISOString().split("T")[0]!
    const to =
      searchParams.get("to") ??
      new Date().toISOString().split("T")[0]!

    // Get all gyms
    const { data: gyms, error: gymsError } = await admin
      .from("gyms")
      .select("id, name")

    if (gymsError) throw gymsError

    if (!gyms || gyms.length === 0) {
      return ok({ branches: [] })
    }

    // Attendance counts per gym in range
    const { data: attendance, error: attError } = await admin
      .from("attendance")
      .select("gym_id")
      .gte("date", from)
      .lte("date", to)
      .not("gym_id", "is", null)

    if (attError) throw attError

    // Active members per gym (valid membership)
    const today = new Date().toISOString().split("T")[0]!
    const { data: memberships, error: memError } = await admin
      .from("memberships")
      .select("gym_id")
      .eq("status", "active")
      .gte("end_date", today)

    if (memError) throw memError

    // Aggregate per gym
    const checkInsByGym = new Map<string, number>()
    for (const a of attendance ?? []) {
      if (a.gym_id) {
        checkInsByGym.set(a.gym_id, (checkInsByGym.get(a.gym_id) ?? 0) + 1)
      }
    }

    const membersByGym = new Map<string, number>()
    for (const m of memberships ?? []) {
      if (m.gym_id) {
        membersByGym.set(m.gym_id, (membersByGym.get(m.gym_id) ?? 0) + 1)
      }
    }

    const branches = gyms.map((gym) => {
      const totalCheckIns = checkInsByGym.get(gym.id) ?? 0
      const activeMembers = membersByGym.get(gym.id) ?? 0
      const attendanceRate =
        activeMembers > 0
          ? Number(((totalCheckIns / activeMembers) * 100).toFixed(1))
          : 0

      return {
        branchId: gym.id,
        branchName: gym.name,
        totalCheckIns,
        activeMembers,
        attendanceRate,
      }
    })

    return ok({ branches })
  } catch (error) {
    return fail(error)
  }
}
