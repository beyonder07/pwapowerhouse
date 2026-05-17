import { NextRequest } from "next/server"
import { authenticateRequest } from "@/src/middleware/auth.middleware"
import { requireRole } from "@/src/middleware/role.middleware"
import { createSupabaseServiceRoleClient } from "@/src/services/supabase.service"
import { getOwnerGymId } from "@/src/utils/owner-gym"
import { fail, ok } from "@/src/utils/response"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

const admin = createSupabaseServiceRoleClient()

export async function GET(req: NextRequest) {
  try {
    const auth = await authenticateRequest(req)
    requireRole(auth, ["owner"])

    const now = new Date()
    const today = now.toISOString().split("T")[0]!
    const monthStart = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-01`
    const ownerGymId = getOwnerGymId(auth)

    const in7Days = new Date(now.getTime() + 7 * 86400000).toISOString().split("T")[0]!

    let expiringQuery = admin
      .from("memberships")
      .select("user_id, end_date, users!inner(name)")
      .eq("status", "active")
      .gte("end_date", today)
      .lte("end_date", in7Days)
      .order("end_date")

    let inactiveQuery = admin.from("users").select("id, name").eq("role", "client").limit(200)
    let pendingPaymentsQuery = admin
      .from("payments")
      .select("id, amount, users!inner(name)")
      .eq("status", "pending")
      .order("created_at", { ascending: true })
    let todayCheckInsQuery = admin
      .from("attendance")
      .select("user_id", { count: "exact", head: true })
      .eq("date", today)
    let monthRevenueQuery = admin
      .from("payments")
      .select("amount")
      .eq("status", "approved")
      .gte("created_at", monthStart)

    if (ownerGymId) {
      expiringQuery = expiringQuery.eq("gym_id", ownerGymId)
      inactiveQuery = inactiveQuery.eq("gym_id", ownerGymId)
      pendingPaymentsQuery = pendingPaymentsQuery.eq("gym_id", ownerGymId)
      todayCheckInsQuery = todayCheckInsQuery.eq("gym_id", ownerGymId)
      monthRevenueQuery = monthRevenueQuery.eq("gym_id", ownerGymId)
    }

    const [expiringRes, inactiveRes, pendingPaymentsRes, todayCheckInsRes, monthRevenueRes] =
      await Promise.all([
        expiringQuery,
        inactiveQuery,
        pendingPaymentsQuery,
        todayCheckInsQuery,
        monthRevenueQuery,
      ])

    // Get last attendance dates for inactive detection
    const allClientIds = (inactiveRes.data ?? []).map((u: any) => u.id)
    let inactiveMembers: Array<{ id: string; name: string; daysSince: number }> = []

    if (allClientIds.length > 0) {
      const attendanceRes = await admin
        .from("attendance")
        .select("user_id, date")
        .in("user_id", allClientIds)
        .gte("date", new Date(now.getTime() - 90 * 86400000).toISOString().split("T")[0]!)
        .order("date", { ascending: false })

      const lastByUser = new Map<string, string>()
      for (const a of (attendanceRes.data ?? [])) {
        if (!lastByUser.has(a.user_id)) lastByUser.set(a.user_id, a.date)
      }

      const cutoff = new Date(now.getTime() - 7 * 86400000).toISOString().split("T")[0]!
      inactiveMembers = (inactiveRes.data ?? [])
        .map((u: any) => {
          const last = lastByUser.get(u.id) ?? null
          const daysSince = last
            ? Math.floor((now.getTime() - new Date(last + "T00:00:00").getTime()) / 86400000)
            : 999
          return { id: u.id, name: u.name ?? "Member", daysSince, last }
        })
        .filter(u => u.daysSince >= 7)
        .sort((a, b) => b.daysSince - a.daysSince)
        .slice(0, 8)
        .map(({ id, name, daysSince }) => ({ id, name, daysSince }))
    }

    const monthRevenue = (monthRevenueRes.data ?? []).reduce((s: number, p: any) => s + Number(p.amount), 0)
    const pendingCount = (pendingPaymentsRes.data ?? []).length
    const pendingAmount = (pendingPaymentsRes.data ?? []).reduce((s: number, p: any) => s + Number(p.amount), 0)

    return ok({
      todayCheckIns: todayCheckInsRes.count ?? 0,
      monthRevenue,
      pendingPayments: { count: pendingCount, amount: pendingAmount },
      expiringMemberships: (expiringRes.data ?? []).map((m: any) => ({
        userId: m.user_id,
        name: (m.users as any)?.name ?? "Member",
        endDate: m.end_date,
        daysLeft: Math.ceil((new Date(m.end_date + "T23:59:59").getTime() - Date.now()) / 86400000),
      })),
      inactiveMembers,
    })
  } catch (error) {
    return fail(error)
  }
}
