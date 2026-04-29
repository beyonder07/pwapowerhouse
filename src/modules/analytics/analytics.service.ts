import type { AuthContext } from "@/src/middleware/auth.middleware"
import { requireRole } from "@/src/middleware/role.middleware"
import type {
  AnalyticsDateRangeQuery,
  InactiveMembersQuery,
  RecentAttendanceQuery,
} from "./analytics.schema"

interface AttendanceRow {
  date: string
  check_ins: number
}

interface RevenueRow {
  date: string
  revenue: number | string
  pending_total: number | string
  paid_payments: number
  pending_payments: number
}

interface MonthlyRevenueRow {
  month_start: string
  revenue: number | string
  pending_total: number | string
}

interface InactiveMemberRow {
  member_id: string
  user_id: string
  full_name: string | null
  email: string | null
  branch_id: string
  last_attendance_date: string | null
  inactive_days: number | null
  total_count: number
}

interface DashboardMetrics {
  totalMembers: number
  activeMembers: number
  activeTrainers: number
  weeklyRevenue: number | string
  monthlyRevenue: number | string
  pendingPaymentsTotal: number | string
  avgDailyAttendance: number | string
  attendanceToday: number
  inactiveMembers: number
  pendingRequests: number
}

interface RecentPaymentRow {
  id: string
  member_id: string
  member_name: string
  amount: number | string
  status: string
  payment_date: string
  created_at: string
}

interface PendingRequestRow {
  id: string
  name: string
  type: string
  created_at: string
}

interface BranchAttendanceRow {
  branch_id: string
  branch_name: string
  total_check_ins: number
  active_members: number
  attendance_rate: number | string
}

interface RecentAttendanceRow {
  id: string
  member_id: string
  member_name: string
  branch_name: string
  attendance_date: string
  checked_in_at: string
  distance_meters: number | string
  total_count: number
}

interface LegacyAttendanceRow {
  id?: string | number
  member_id: string | number
  date: string
  check_in_time?: string
  distance_meters?: number | string | null
  members?: unknown
}

interface LegacyPaymentRow {
  id: string | number
  member_id: string | number
  amount: number | string
  status: string
  date: string
  created_at: string
  members?: unknown
}

interface LegacyMemberRow {
  id: string | number
  user_id: string
  status?: string | null
  users?: unknown
}

interface LegacyRequestRow {
  id: string
  type: string
  data: unknown
  created_at: string
}

function toNumber(value: number | string | null | undefined) {
  if (value === null || value === undefined) return 0
  return Number(value)
}

const DAY_MS = 24 * 60 * 60 * 1000

function isMissingRpcError(error: unknown) {
  const rpcError = error as
    | { code?: string; message?: string; details?: string }
    | null
    | undefined

  return (
    rpcError?.code === "PGRST202" ||
    rpcError?.message?.includes("Could not find the function") === true ||
    rpcError?.details?.includes("Could not find the function") === true
  )
}

function toDateOnly(date: Date) {
  return date.toISOString().slice(0, 10)
}

function todayDate() {
  const now = new Date()
  now.setHours(0, 0, 0, 0)
  return toDateOnly(now)
}

function daysAgo(days: number) {
  const date = new Date()
  date.setHours(0, 0, 0, 0)
  date.setDate(date.getDate() - days)
  return toDateOnly(date)
}

function currentMonthStart() {
  const date = new Date()
  date.setHours(0, 0, 0, 0)
  date.setDate(1)
  return toDateOnly(date)
}

function monthStartFor(value: string) {
  const date = new Date(`${value}T00:00:00.000Z`)
  date.setUTCDate(1)
  return toDateOnly(date)
}

function lastMonthStarts(count: number) {
  const starts: string[] = []
  const date = new Date()
  date.setUTCDate(1)
  date.setUTCHours(0, 0, 0, 0)

  for (let index = count - 1; index >= 0; index -= 1) {
    const month = new Date(date)
    month.setUTCMonth(date.getUTCMonth() - index)
    starts.push(toDateOnly(month))
  }

  return starts
}

function eachDate(from: string, to: string) {
  const dates: string[] = []
  const cursor = new Date(`${from}T00:00:00.000Z`)
  const end = new Date(`${to}T00:00:00.000Z`)

  while (cursor <= end && dates.length < 370) {
    dates.push(toDateOnly(cursor))
    cursor.setUTCDate(cursor.getUTCDate() + 1)
  }

  return dates
}

function rangeOrDefault(query: AnalyticsDateRangeQuery, days = 6) {
  return {
    from: query.from ?? daysAgo(days),
    to: query.to ?? todayDate(),
  }
}

function asRecord(value: unknown) {
  return value !== null && typeof value === "object"
    ? (value as Record<string, unknown>)
    : null
}

function firstRecord(value: unknown) {
  if (Array.isArray(value)) return asRecord(value[0])
  return asRecord(value)
}

function stringField(record: Record<string, unknown> | null, key: string) {
  const value = record?.[key]
  return typeof value === "string" && value.trim() ? value.trim() : null
}

function paymentMemberName(payment: LegacyPaymentRow) {
  const member = firstRecord(payment.members)
  const user = firstRecord(member?.users)

  return (
    stringField(user, "name") ??
    stringField(user, "full_name") ??
    stringField(user, "email") ??
    `Member #${payment.member_id}`
  )
}

function memberDisplayName(member: LegacyMemberRow) {
  const user = firstRecord(member.users)

  return (
    stringField(user, "name") ??
    stringField(user, "full_name") ??
    stringField(user, "email") ??
    `Member #${member.id}`
  )
}

function requestDisplayName(request: LegacyRequestRow) {
  const payload = asRecord(request.data)

  return (
    stringField(payload, "name") ??
    stringField(payload, "fullName") ??
    stringField(payload, "full_name") ??
    stringField(payload, "email") ??
    `${request.type} request`
  )
}

export class AnalyticsService {
  constructor(private readonly ctx: AuthContext) {}

  async getAttendance(query: AnalyticsDateRangeQuery) {
    requireRole(this.ctx, ["owner", "trainer"])

    const { data, error } = await this.ctx.supabase.rpc("get_daily_attendance", {
      p_from: query.from ?? null,
      p_to: query.to ?? null,
      p_branch_id: query.branchId ?? null,
    })

    if (error) {
      if (isMissingRpcError(error)) return this.getAttendanceFromTables(query)
      throw error
    }

    const trend = ((data ?? []) as AttendanceRow[]).map((row) => ({
      date: row.date,
      checkIns: Number(row.check_ins),
    }))

    return {
      trend,
      total: trend.reduce((sum, row) => sum + row.checkIns, 0),
      average:
        trend.length > 0
          ? Number(
              (
                trend.reduce((sum, row) => sum + row.checkIns, 0) /
                trend.length
              ).toFixed(2)
            )
          : 0,
    }
  }

  async getRevenue(query: AnalyticsDateRangeQuery) {
    requireRole(this.ctx, ["owner"])

    const [weeklyResult, monthlyResult, metricsResult] = await Promise.all([
      this.ctx.supabase.rpc("get_weekly_revenue", {
        p_from: query.from ?? null,
        p_to: query.to ?? null,
        p_branch_id: query.branchId ?? null,
      }),
      this.ctx.supabase.rpc("get_monthly_revenue", {
        p_months: 6,
        p_branch_id: query.branchId ?? null,
      }),
      this.ctx.supabase.rpc("get_dashboard_metrics", {
        p_branch_id: query.branchId ?? null,
      }),
    ])

    if (
      isMissingRpcError(weeklyResult.error) ||
      isMissingRpcError(monthlyResult.error) ||
      isMissingRpcError(metricsResult.error)
    ) {
      return this.getRevenueFromTables(query)
    }

    if (weeklyResult.error) throw weeklyResult.error
    if (monthlyResult.error) throw monthlyResult.error
    if (metricsResult.error) throw metricsResult.error

    const weekly = ((weeklyResult.data ?? []) as RevenueRow[]).map((row) => ({
      date: row.date,
      revenue: toNumber(row.revenue),
      pendingTotal: toNumber(row.pending_total),
      paidPayments: Number(row.paid_payments),
      pendingPayments: Number(row.pending_payments),
    }))

    const monthly = ((monthlyResult.data ?? []) as MonthlyRevenueRow[]).map(
      (row) => ({
        monthStart: row.month_start,
        revenue: toNumber(row.revenue),
        pendingTotal: toNumber(row.pending_total),
      })
    )

    const metrics = metricsResult.data as DashboardMetrics

    return {
      weekly,
      monthly,
      weeklyRevenue: toNumber(metrics.weeklyRevenue),
      monthlyRevenue: toNumber(metrics.monthlyRevenue),
      pendingPaymentsTotal: toNumber(metrics.pendingPaymentsTotal),
    }
  }

  async getInactiveMembers(query: InactiveMembersQuery) {
    requireRole(this.ctx, ["owner", "trainer"])

    const { data, error } = await this.ctx.supabase.rpc("get_inactive_members", {
      p_days: query.days,
      p_limit: query.limit,
      p_offset: query.offset,
      p_branch_id: query.branchId ?? null,
    })

    if (error) {
      if (isMissingRpcError(error)) return this.getInactiveMembersFromTables(query)
      throw error
    }

    const rows = (data ?? []) as InactiveMemberRow[]

    return {
      count: rows[0]?.total_count ?? 0,
      members: rows.map((row) => ({
        memberId: row.member_id,
        userId: row.user_id,
        fullName: row.full_name,
        email: row.email,
        branchId: row.branch_id,
        lastAttendanceDate: row.last_attendance_date,
        inactiveDays: row.inactive_days,
      })),
      pagination: {
        limit: query.limit,
        offset: query.offset,
      },
    }
  }

  async getBranchAttendance(query: AnalyticsDateRangeQuery) {
    requireRole(this.ctx, ["owner", "trainer"])

    const { data, error } = await this.ctx.supabase.rpc(
      "get_branch_attendance_summary",
      {
        p_from: query.from ?? null,
        p_to: query.to ?? null,
      }
    )

    if (error) {
      if (isMissingRpcError(error)) return { branches: [] }
      throw error
    }

    return {
      branches: ((data ?? []) as BranchAttendanceRow[]).map((row) => ({
        branchId: row.branch_id,
        branchName: row.branch_name,
        totalCheckIns: Number(row.total_check_ins),
        activeMembers: Number(row.active_members),
        attendanceRate: toNumber(row.attendance_rate),
      })),
    }
  }

  async getRecentAttendance(query: RecentAttendanceQuery) {
    requireRole(this.ctx, ["owner", "trainer"])

    const { data, error } = await this.ctx.supabase.rpc("get_recent_attendance", {
      p_limit: query.limit,
      p_offset: query.offset,
      p_search: query.search ?? null,
    })

    if (error) {
      if (isMissingRpcError(error)) return this.getRecentAttendanceFromTables(query)
      throw error
    }

    const rows = (data ?? []) as RecentAttendanceRow[]

    return {
      count: rows[0]?.total_count ?? 0,
      checkIns: rows.map((row) => ({
        id: row.id,
        memberId: row.member_id,
        memberName: row.member_name,
        branchName: row.branch_name,
        attendanceDate: row.attendance_date,
        checkedInAt: row.checked_in_at,
        distanceMeters: toNumber(row.distance_meters),
      })),
      pagination: {
        limit: query.limit,
        offset: query.offset,
      },
    }
  }

  async getDashboard(query: AnalyticsDateRangeQuery) {
    requireRole(this.ctx, ["owner"])

    const [
      metrics,
      attendance,
      revenue,
      inactive,
      recentPayments,
      pendingRequests,
    ] = await Promise.all([
      this.getDashboardMetrics(query),
      this.getAttendance(query),
      this.getRevenue(query),
      this.getInactiveMembers({
        days: 7,
        limit: 5,
        offset: 0,
        branchId: query.branchId,
      }),
      this.getRecentPayments(5, query.branchId),
      this.getPendingRequests(5),
    ])

    return {
      metrics: {
        totalMembers: Number(metrics.totalMembers ?? 0),
        activeMembers: Number(metrics.activeMembers ?? 0),
        activeTrainers: Number(metrics.activeTrainers ?? 0),
        weeklyRevenue: toNumber(metrics.weeklyRevenue),
        monthlyRevenue: toNumber(metrics.monthlyRevenue),
        pendingPaymentsTotal: toNumber(metrics.pendingPaymentsTotal),
        avgDailyAttendance: toNumber(metrics.avgDailyAttendance),
        attendanceToday: Number(metrics.attendanceToday ?? 0),
        inactiveMembers: Number(metrics.inactiveMembers ?? 0),
        pendingRequests: Number(metrics.pendingRequests ?? 0),
      },
      attendance,
      revenue,
      inactive,
      recentPayments,
      pendingRequests,
    }
  }

  private async getDashboardMetrics(query: AnalyticsDateRangeQuery) {
    const { data, error } = await this.ctx.supabase.rpc("get_dashboard_metrics", {
      p_branch_id: query.branchId ?? null,
    })

    if (error) {
      if (isMissingRpcError(error)) return this.getDashboardMetricsFromTables()
      throw error
    }

    return data as DashboardMetrics
  }

  private async getRecentPayments(limit: number, branchId?: string) {
    const { data, error } = await this.ctx.supabase.rpc("get_recent_payments", {
      p_limit: limit,
      p_branch_id: branchId ?? null,
    })

    if (error) {
      if (isMissingRpcError(error)) {
        return this.getRecentPaymentsFromTables(limit)
      }
      throw error
    }

    return ((data ?? []) as RecentPaymentRow[]).map((payment) => ({
      id: payment.id,
      memberId: payment.member_id,
      memberName: payment.member_name,
      amount: toNumber(payment.amount),
      status: payment.status,
      paymentDate: payment.payment_date,
      createdAt: payment.created_at,
    }))
  }

  private async getPendingRequests(limit: number) {
    const { data, error } = await this.ctx.supabase.rpc("get_pending_requests", {
      p_limit: limit,
    })

    if (error) {
      if (isMissingRpcError(error)) return this.getPendingRequestsFromTables(limit)
      throw error
    }

    return ((data ?? []) as PendingRequestRow[]).map((request) => ({
      id: request.id,
      name: request.name,
      type: request.type,
      createdAt: request.created_at,
    }))
  }

  private async getAttendanceFromTables(query: AnalyticsDateRangeQuery) {
    const { from, to } = rangeOrDefault(query)
    const { data, error } = await this.ctx.supabase
      .from("attendance")
      .select("date")
      .gte("date", from)
      .lte("date", to)

    if (error) throw error

    const counts = new Map(eachDate(from, to).map((date) => [date, 0]))

    for (const row of (data ?? []) as Pick<LegacyAttendanceRow, "date">[]) {
      counts.set(row.date, (counts.get(row.date) ?? 0) + 1)
    }

    const trend = [...counts.entries()].map(([date, checkIns]) => ({
      date,
      checkIns,
    }))
    const total = trend.reduce((sum, row) => sum + row.checkIns, 0)

    return {
      trend,
      total,
      average:
        trend.length > 0 ? Number((total / trend.length).toFixed(2)) : 0,
    }
  }

  private async getRevenueFromTables(query: AnalyticsDateRangeQuery) {
    const { from, to } = rangeOrDefault(query)
    const monthStarts = lastMonthStarts(6)
    const monthlyFrom = monthStarts[0] ?? currentMonthStart()

    const [paymentsResult, pendingResult] = await Promise.all([
      this.ctx.supabase
        .from("payments")
        .select("amount,status,date")
        .gte("date", monthlyFrom)
        .lte("date", todayDate()),
      this.ctx.supabase
        .from("payments")
        .select("amount")
        .eq("status", "pending"),
    ])

    if (paymentsResult.error) throw paymentsResult.error
    if (pendingResult.error) throw pendingResult.error

    const payments = (paymentsResult.data ?? []) as Pick<
      LegacyPaymentRow,
      "amount" | "status" | "date"
    >[]
    const pendingPaymentsTotal = ((pendingResult.data ?? []) as Pick<
      LegacyPaymentRow,
      "amount"
    >[]).reduce((sum, payment) => sum + toNumber(payment.amount), 0)

    const weeklyBuckets = new Map(
      eachDate(from, to).map((date) => [
        date,
        {
          revenue: 0,
          pendingTotal: 0,
          paidPayments: 0,
          pendingPayments: 0,
        },
      ])
    )
    const monthlyBuckets = new Map(
      monthStarts.map((monthStart) => [
        monthStart,
        {
          revenue: 0,
          pendingTotal: 0,
        },
      ])
    )

    for (const payment of payments) {
      const amount = toNumber(payment.amount)
      const weeklyBucket = weeklyBuckets.get(payment.date)

      if (weeklyBucket) {
        if (payment.status === "paid") {
          weeklyBucket.revenue += amount
          weeklyBucket.paidPayments += 1
        }

        if (payment.status === "pending") {
          weeklyBucket.pendingTotal += amount
          weeklyBucket.pendingPayments += 1
        }
      }

      const monthlyBucket = monthlyBuckets.get(monthStartFor(payment.date))
      if (monthlyBucket) {
        if (payment.status === "paid") monthlyBucket.revenue += amount
        if (payment.status === "pending") monthlyBucket.pendingTotal += amount
      }
    }

    const weekly = [...weeklyBuckets.entries()].map(([date, bucket]) => ({
      date,
      revenue: bucket.revenue,
      pendingTotal: bucket.pendingTotal,
      paidPayments: bucket.paidPayments,
      pendingPayments: bucket.pendingPayments,
    }))
    const monthly = [...monthlyBuckets.entries()].map(([monthStart, bucket]) => ({
      monthStart,
      revenue: bucket.revenue,
      pendingTotal: bucket.pendingTotal,
    }))

    return {
      weekly,
      monthly,
      weeklyRevenue: weekly.reduce((sum, day) => sum + day.revenue, 0),
      monthlyRevenue:
        monthly.find((month) => month.monthStart === currentMonthStart())
          ?.revenue ?? 0,
      pendingPaymentsTotal,
    }
  }

  private async getInactiveMembersFromTables(query: InactiveMembersQuery) {
    const cutoff = daysAgo(query.days)
    const [membersResult, attendanceResult] = await Promise.all([
      this.ctx.supabase
        .from("members")
        .select("id,user_id,status,users(name,email)")
        .order("id", { ascending: true }),
      this.ctx.supabase.from("attendance").select("member_id,date"),
    ])

    if (membersResult.error) throw membersResult.error
    if (attendanceResult.error) throw attendanceResult.error

    const lastAttendance = new Map<string, string>()

    for (const row of (attendanceResult.data ?? []) as Pick<
      LegacyAttendanceRow,
      "member_id" | "date"
    >[]) {
      const memberId = String(row.member_id)
      const existing = lastAttendance.get(memberId)
      if (!existing || row.date > existing) lastAttendance.set(memberId, row.date)
    }

    const inactive = ((membersResult.data ?? []) as LegacyMemberRow[])
      .map((member) => {
        const lastAttendanceDate = lastAttendance.get(String(member.id)) ?? null
        return {
          member,
          lastAttendanceDate,
          isInactive: !lastAttendanceDate || lastAttendanceDate < cutoff,
        }
      })
      .filter((item) => item.isInactive)

    return {
      count: inactive.length,
      members: inactive
        .slice(query.offset, query.offset + query.limit)
        .map(({ member, lastAttendanceDate }) => ({
          memberId: String(member.id),
          userId: member.user_id,
          fullName: memberDisplayName(member),
          email: stringField(firstRecord(member.users), "email"),
          branchId: null,
          lastAttendanceDate,
          inactiveDays: lastAttendanceDate
            ? Math.floor(
                (Date.now() -
                  new Date(`${lastAttendanceDate}T00:00:00.000Z`).getTime()) /
                  DAY_MS
              )
            : null,
        })),
      pagination: {
        limit: query.limit,
        offset: query.offset,
      },
    }
  }

  private async getDashboardMetricsFromTables(): Promise<DashboardMetrics> {
    const weekStart = daysAgo(6)
    const monthStart = currentMonthStart()
    const today = todayDate()
    const inactiveCutoff = daysAgo(7)

    const [
      membersResult,
      trainersResult,
      attendanceResult,
      weeklyPaymentsResult,
      monthlyPaymentsResult,
      pendingPaymentsResult,
      requestsResult,
    ] = await Promise.all([
      this.ctx.supabase.from("members").select("id,status"),
      this.ctx.supabase.from("trainers").select("id"),
      this.ctx.supabase
        .from("attendance")
        .select("member_id,date")
        .gte("date", weekStart)
        .lte("date", today),
      this.ctx.supabase
        .from("payments")
        .select("amount,status,date")
        .eq("status", "paid")
        .gte("date", weekStart),
      this.ctx.supabase
        .from("payments")
        .select("amount,status,date")
        .eq("status", "paid")
        .gte("date", monthStart),
      this.ctx.supabase
        .from("payments")
        .select("amount")
        .eq("status", "pending"),
      this.ctx.supabase.from("requests").select("id").eq("status", "pending"),
    ])

    if (membersResult.error) throw membersResult.error
    if (trainersResult.error) throw trainersResult.error
    if (attendanceResult.error) throw attendanceResult.error
    if (weeklyPaymentsResult.error) throw weeklyPaymentsResult.error
    if (monthlyPaymentsResult.error) throw monthlyPaymentsResult.error
    if (pendingPaymentsResult.error) throw pendingPaymentsResult.error
    if (requestsResult.error) throw requestsResult.error

    const members = (membersResult.data ?? []) as Pick<
      LegacyMemberRow,
      "id" | "status"
    >[]
    const attendance = (attendanceResult.data ?? []) as Pick<
      LegacyAttendanceRow,
      "member_id" | "date"
    >[]
    const activeLastWeek = new Set(
      attendance
        .filter((row) => row.date >= inactiveCutoff)
        .map((row) => String(row.member_id))
    )
    const attendanceByDate = new Map(eachDate(weekStart, today).map((date) => [date, 0]))

    for (const row of attendance) {
      attendanceByDate.set(row.date, (attendanceByDate.get(row.date) ?? 0) + 1)
    }

    return {
      totalMembers: members.length,
      activeMembers: members.filter((member) => member.status === "active").length,
      activeTrainers: (trainersResult.data ?? []).length,
      weeklyRevenue: ((weeklyPaymentsResult.data ?? []) as Pick<
        LegacyPaymentRow,
        "amount"
      >[]).reduce((sum, payment) => sum + toNumber(payment.amount), 0),
      monthlyRevenue: ((monthlyPaymentsResult.data ?? []) as Pick<
        LegacyPaymentRow,
        "amount"
      >[]).reduce((sum, payment) => sum + toNumber(payment.amount), 0),
      pendingPaymentsTotal: ((pendingPaymentsResult.data ?? []) as Pick<
        LegacyPaymentRow,
        "amount"
      >[]).reduce((sum, payment) => sum + toNumber(payment.amount), 0),
      avgDailyAttendance: Number(
        (
          [...attendanceByDate.values()].reduce((sum, count) => sum + count, 0) /
          Math.max(attendanceByDate.size, 1)
        ).toFixed(2)
      ),
      attendanceToday: attendanceByDate.get(today) ?? 0,
      inactiveMembers: members.filter(
        (member) => !activeLastWeek.has(String(member.id))
      ).length,
      pendingRequests: (requestsResult.data ?? []).length,
    }
  }

  private async getRecentPaymentsFromTables(limit: number) {
    const nestedResult = await this.ctx.supabase
      .from("payments")
      .select("id,member_id,amount,status,date,created_at,members(users(name,email))")
      .order("created_at", { ascending: false })
      .limit(limit)

    let data = nestedResult.data as unknown[] | null
    let error = nestedResult.error

    if (error) {
      const plainResult = await this.ctx.supabase
        .from("payments")
        .select("id,member_id,amount,status,date,created_at")
        .order("created_at", { ascending: false })
        .limit(limit)

      data = plainResult.data as unknown[] | null
      error = plainResult.error
    }

    if (error) throw error

    return ((data ?? []) as LegacyPaymentRow[]).map((payment) => ({
      id: String(payment.id),
      memberId: String(payment.member_id),
      memberName: paymentMemberName(payment),
      amount: toNumber(payment.amount),
      status: payment.status,
      paymentDate: payment.date,
      createdAt: payment.created_at,
    }))
  }

  private async getPendingRequestsFromTables(limit: number) {
    const { data, error } = await this.ctx.supabase
      .from("requests")
      .select("id,type,data,created_at")
      .eq("status", "pending")
      .order("created_at", { ascending: false })
      .limit(limit)

    if (error) throw error

    return ((data ?? []) as LegacyRequestRow[]).map((request) => ({
      id: request.id,
      name: requestDisplayName(request),
      type: request.type,
      createdAt: request.created_at,
    }))
  }

  private async getRecentAttendanceFromTables(query: RecentAttendanceQuery) {
    const nestedResult = await this.ctx.supabase
      .from("attendance")
      .select("id,member_id,date,check_in_time,distance_meters,members(users(name,email))")
      .order("check_in_time", { ascending: false })

    let data = nestedResult.data as unknown[] | null
    let error = nestedResult.error

    if (error) {
      const plainResult = await this.ctx.supabase
        .from("attendance")
        .select("id,member_id,date,check_in_time")
        .order("check_in_time", { ascending: false })

      data = plainResult.data as unknown[] | null
      error = plainResult.error
    }

    if (error) throw error

    const normalized = ((data ?? []) as LegacyAttendanceRow[]).map((row) => {
      const member = firstRecord(row.members)
      const user = firstRecord(member?.users)
      const memberName =
        stringField(user, "name") ??
        stringField(user, "full_name") ??
        stringField(user, "email") ??
        `Member #${row.member_id}`

      return {
        id: String(row.id ?? `${row.member_id}-${row.date}`),
        memberId: String(row.member_id),
        memberName,
        branchName: "PowerHouse Gym",
        attendanceDate: row.date,
        checkedInAt: row.check_in_time ?? `${row.date}T00:00:00.000Z`,
        distanceMeters: toNumber(row.distance_meters),
      }
    })

    const search = query.search?.toLowerCase()
    const filtered = search
      ? normalized.filter((row) => row.memberName.toLowerCase().includes(search))
      : normalized

    return {
      count: filtered.length,
      checkIns: filtered.slice(query.offset, query.offset + query.limit),
      pagination: {
        limit: query.limit,
        offset: query.offset,
      },
    }
  }
}
