/** Maps analytics dashboard API payload to owner UI contract. */
export function mapOwnerDashboardPayload(raw: {
  metrics: {
    totalMembers: number
    activeMembers: number
    activeTrainers: number
    weeklyRevenue: number
    monthlyRevenue: number
    pendingPaymentsTotal: number
    avgDailyAttendance: number
    attendanceToday: number
    inactiveMembers: number
    pendingRequests: number
  }
  attendance?: { trend?: Array<{ date: string; checkIns: number }> }
  revenue?: { weekly?: Array<{ date: string; revenue: number }> }
  recentPayments?: Array<{
    id: string
    memberName: string
    amount: number
    status: string
    createdAt: string
  }>
  pendingRequests?: Array<{ id: string; name: string; type: string; createdAt: string }>
}) {
  const attendanceTrend = raw.attendance?.trend ?? []
  const revenueWeekly = raw.revenue?.weekly ?? []

  const byDate = new Map<string, { date: string; checkIns: number; revenue: number }>()

  for (const row of attendanceTrend) {
    byDate.set(row.date, { date: row.date, checkIns: row.checkIns, revenue: 0 })
  }
  for (const row of revenueWeekly) {
    const existing = byDate.get(row.date)
    if (existing) {
      existing.revenue = row.revenue
    } else {
      byDate.set(row.date, { date: row.date, checkIns: 0, revenue: row.revenue })
    }
  }

  const trend = [...byDate.values()].sort((a, b) => a.date.localeCompare(b.date))

  return {
    metrics: {
      totalRevenue: raw.metrics.monthlyRevenue,
      clients: raw.metrics.totalMembers,
      trainers: raw.metrics.activeTrainers,
      attendanceToday: raw.metrics.attendanceToday,
      monthlyRevenue: raw.metrics.monthlyRevenue,
      weeklyRevenue: raw.metrics.weeklyRevenue,
      pendingPaymentsTotal: raw.metrics.pendingPaymentsTotal,
      inactiveMembers: raw.metrics.inactiveMembers,
      pendingRequests: raw.metrics.pendingRequests,
      avgDailyAttendance: raw.metrics.avgDailyAttendance,
    },
    trend,
    recentPayments: raw.recentPayments ?? [],
    pendingRequests: raw.pendingRequests ?? [],
  }
}
