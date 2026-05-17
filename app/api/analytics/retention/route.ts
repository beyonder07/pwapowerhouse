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

    const now = new Date()
    const today = now.toISOString().split("T")[0]!

    // All members
    const { data: allMembers } = await admin
      .from("users")
      .select("id, created_at")
      .eq("role", "client")

    const memberIds = (allMembers ?? []).map((m: any) => m.id)
    if (memberIds.length === 0) {
      return ok({ totalMembers: 0, activeMembers: 0, newThisMonth: 0, churnRate: 0, renewalRate: 0, expiringThisWeek: 0, lifetimeValue: 0, membershipSegments: [] })
    }

    const monthStart = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-01`
    const in7Days = new Date(now.getTime() + 7 * 86400000).toISOString().split("T")[0]!
    const lastMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1).toISOString().split("T")[0]!
    const lastMonthEnd = new Date(now.getFullYear(), now.getMonth(), 0).toISOString().split("T")[0]!

    const [membershipsRes, paymentsRes] = await Promise.all([
      admin.from("memberships").select("user_id, status, start_date, end_date").in("user_id", memberIds),
      admin.from("payments").select("user_id, amount, status, created_at").in("user_id", memberIds).eq("status", "approved"),
    ])

    const memberships = membershipsRes.data ?? []
    const payments = paymentsRes.data ?? []

    // Active: membership not expired
    const activeMemberships = memberships.filter(m => m.end_date >= today && m.status !== "expired")
    const activeIds = new Set(activeMemberships.map(m => m.user_id))

    // New this month
    const newThisMonth = (allMembers ?? []).filter((m: any) => m.created_at >= monthStart).length

    // Expiring this week
    const expiringThisWeek = activeMemberships.filter(m => m.end_date >= today && m.end_date <= in7Days).length

    // Renewal rate: of members whose membership ended last month, how many renewed?
    const expiredLastMonth = memberships.filter(m => m.end_date >= lastMonthStart && m.end_date <= lastMonthEnd)
    const expiredIds = new Set(expiredLastMonth.map(m => m.user_id))
    const renewedIds = memberships.filter(m => m.start_date >= monthStart && expiredIds.has(m.user_id))
    const renewalRate = expiredIds.size > 0 ? Math.round((renewedIds.length / expiredIds.size) * 100) : 0

    // Churn: members with expired membership and no renewal
    const churnedIds = [...expiredIds].filter(id => !renewedIds.some(r => r.user_id === id))
    const churnRate = expiredIds.size > 0 ? Math.round((churnedIds.length / expiredIds.size) * 100) : 0

    // LTV: total approved revenue / total members
    const totalRevenue = payments.reduce((s: number, p: any) => s + Number(p.amount), 0)
    const lifetimeValue = memberIds.length > 0 ? Math.round(totalRevenue / memberIds.length) : 0

    // Membership segments: active / expiring / expired
    const expiredMembers = memberships.filter(m => m.end_date < today || m.status === "expired")
    const expiringMembers = activeMemberships.filter(m => m.end_date <= in7Days)
    const noMembership = memberIds.filter(id => !memberships.some(m => m.user_id === id)).length

    return ok({
      totalMembers: memberIds.length,
      activeMembers: activeIds.size,
      newThisMonth,
      churnRate,
      renewalRate,
      expiringThisWeek,
      lifetimeValue,
      membershipSegments: [
        { label: "Active", count: activeIds.size - expiringMembers.length, color: "#10b981" },
        { label: "Expiring Soon", count: expiringMembers.length, color: "#f59e0b" },
        { label: "Expired", count: expiredMembers.filter(m => !activeIds.has(m.user_id)).length, color: "#ef4444" },
        { label: "No Plan", count: noMembership, color: "#6b7280" },
      ],
    })
  } catch (error) {
    return fail(error)
  }
}
