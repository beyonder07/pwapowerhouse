import type { AuthContext } from "@/src/middleware/auth.middleware"
import { ForbiddenError } from "@/src/utils/errors"

export class DashboardService {
  constructor(private readonly ctx: AuthContext) {}

  /**
   * Trainer Dashboard: 
   * Provides visibility into the branch's active clients and daily activity.
   */
  async getTrainerDashboard() {
    const gymId = this.ctx.user.gymId
    if (!gymId) throw new ForbiddenError("No gym branch assigned")

    const today = new Date().toISOString().split("T")[0]

    const [activeClientsRes, todayAttendanceRes, pendingPaymentsRes] = await Promise.all([
      this.ctx.supabase
        .from("memberships")
        .select("user_id", { count: "exact", head: true })
        .eq("gym_id", gymId)
        .eq("status", "active"),
      
      this.ctx.supabase
        .from("attendance")
        .select(`
          id,
          check_in_time,
          users (id, name)
        `)
        .eq("gym_id", gymId)
        .eq("date", today)
        .order("check_in_time", { ascending: false })
        .limit(10),

      this.ctx.supabase
        .from("payments")
        .select(`
          id,
          amount,
          created_at,
          users!payments_user_id_fkey (id, name)
        `)
        .eq("gym_id", gymId)
        .eq("status", "pending")
        .limit(5)
    ])

    return {
      stats: {
        activeClients: activeClientsRes.count ?? 0,
        todayCheckIns: todayAttendanceRes.data?.length ?? 0,
        pendingApprovals: pendingPaymentsRes.data?.length ?? 0
      },
      recentActivity: (todayAttendanceRes.data ?? []).map(a => ({
        id: a.id,
        userName: (a.users as any)?.name,
        time: a.check_in_time
      })),
      pendingPayments: (pendingPaymentsRes.data ?? []).map(p => ({
        id: p.id,
        userName: (p.users as any)?.name,
        amount: p.amount,
        createdAt: p.created_at
      }))
    }
  }

  /**
   * Owner Dashboard: 
   * Aggregated health and trend metrics.
   */
  async getOwnerDashboard() {
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split("T")[0]

    const [revenueRes, totalUsersRes, attendanceTrendRes, revenueTrendRes] = await Promise.all([
      this.ctx.supabase.from("payments").select("amount").eq("status", "approved"),
      this.ctx.supabase.from("users").select("role"),
      this.ctx.supabase.from("attendance").select("date").gte("date", sevenDaysAgo),
      this.ctx.supabase.from("payments").select("amount, created_at").eq("status", "approved").gte("created_at", sevenDaysAgo)
    ])

    const totalRevenue = (revenueRes.data ?? []).reduce((sum, p) => sum + Number(p.amount), 0)
    const users = totalUsersRes.data ?? []
    
    // Group attendance by date
    const attendanceByDate = (attendanceTrendRes.data ?? []).reduce((acc: any, curr) => {
      acc[curr.date] = (acc[curr.date] || 0) + 1
      return acc
    }, {})

    // Group revenue by date
    const revenueByDate = (revenueTrendRes.data ?? []).reduce((acc: any, curr) => {
      const date = curr.created_at.split("T")[0]
      acc[date] = (acc[date] || 0) + Number(curr.amount)
      return acc
    }, {})

    // Generate 7-day series
    const trend = []
    for (let i = 6; i >= 0; i--) {
      const d = new Date()
      d.setDate(d.getDate() - i)
      const dateStr = d.toISOString().split("T")[0]
      trend.push({
        date: dateStr,
        checkIns: attendanceByDate[dateStr] || 0,
        revenue: revenueByDate[dateStr] || 0
      })
    }

    return {
      metrics: {
        totalRevenue,
        clients: users.filter(u => u.role === "client").length,
        trainers: users.filter(u => u.role === "trainer").length,
        attendanceToday: attendanceByDate[new Date().toISOString().split("T")[0]] || 0
      },
      trend
    }
  }
}
