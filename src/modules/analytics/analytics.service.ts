import type { AuthContext } from "@/src/middleware/auth.middleware"
import { requireRole } from "@/src/middleware/role.middleware"
import { createSupabaseServiceRoleClient } from "@/src/services/supabase.service"
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

/** Legacy RPCs reference members.branch_id; fall back to MVP table queries on any RPC failure. */
function shouldUseTableFallback(error: unknown) {
  if (!error) return false
  if (isMissingRpcError(error)) return true

  const rpcError = error as { code?: string; message?: string; details?: string }
  const text = `${rpcError.message ?? ""} ${rpcError.details ?? ""}`.toLowerCase()

  return (
    rpcError.code === "42703" ||
    rpcError.code === "42P01" ||
    rpcError.code === "42883" ||
    text.includes("does not exist") ||
    text.includes("branch_id")
  )
}

function withGymFilter(query: any, gymId?: string | null) {
  return gymId ? query.eq("gym_id", gymId) : query
}

function paymentBucketDate(payment: { created_at?: string }) {
  if (payment.created_at) return payment.created_at.slice(0, 10)
  return todayDate()
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
      if (shouldUseTableFallback(error)) return this.getAttendanceFromTables(query)
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
      shouldUseTableFallback(weeklyResult.error) ||
      shouldUseTableFallback(monthlyResult.error) ||
      shouldUseTableFallback(metricsResult.error)
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
      if (shouldUseTableFallback(error)) return this.getInactiveMembersFromTables(query)
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
    return this.buildOwnerDashboardMvp(query)
  }

  /** MVP schema: no legacy RPCs, members table, or payments.date column. */
  private async buildOwnerDashboardMvp(query: AnalyticsDateRangeQuery) {
    const admin = createSupabaseServiceRoleClient()
    const gymId = query.branchId ?? this.ctx.user.gymId ?? null
    const { from, to } = rangeOrDefault(query)
    const weekDates = eachDate(from, to)
    const today = todayDate()
    const monthStart = currentMonthStart()
    const inactiveCutoff = daysAgo(7)

    const [
      clientsRes,
      activeMembershipsRes,
      trainersRes,
      attendanceRangeRes,
      paymentsWeekRes,
      paymentsMonthRes,
      pendingPaymentsRes,
      requestsCountRes,
      recentPaymentsRes,
      clientsForInactiveRes,
      attendanceAllRes,
      pendingRequestsRes,
    ] = await Promise.all([
      withGymFilter(admin.from("users").select("id").eq("role", "client"), gymId),
      withGymFilter(
        admin.from("memberships").select("user_id").eq("status", "active"),
        gymId
      ),
      withGymFilter(admin.from("users").select("id").eq("role", "trainer"), gymId),
      withGymFilter(
        admin.from("attendance").select("user_id,date").gte("date", from).lte("date", to),
        gymId
      ),
      withGymFilter(
        admin
          .from("payments")
          .select("amount,status,created_at")
          .gte("created_at", `${from}T00:00:00.000Z`)
          .lte("created_at", `${to}T23:59:59.999Z`),
        gymId
      ),
      withGymFilter(
        admin
          .from("payments")
          .select("amount,status,created_at")
          .in("status", ["paid", "approved"])
          .gte("created_at", `${monthStart}T00:00:00.000Z`),
        gymId
      ),
      withGymFilter(admin.from("payments").select("amount").eq("status", "pending"), gymId),
      admin.from("requests").select("id", { count: "exact", head: true }).eq("status", "pending"),
      withGymFilter(
        admin
          .from("payments")
          .select("id,user_id,amount,status,created_at,users(name,email)")
          .order("created_at", { ascending: false })
          .limit(5),
        gymId
      ),
      withGymFilter(
        admin.from("users").select("id,name,email").eq("role", "client"),
        gymId
      ),
      withGymFilter(admin.from("attendance").select("user_id,date"), gymId),
      admin
        .from("requests")
        .select("id,type,data,created_at")
        .eq("status", "pending")
        .order("created_at", { ascending: false })
        .limit(5),
    ])

    const firstError =
      clientsRes.error ??
      activeMembershipsRes.error ??
      trainersRes.error ??
      attendanceRangeRes.error ??
      paymentsWeekRes.error ??
      paymentsMonthRes.error ??
      pendingPaymentsRes.error ??
      requestsCountRes.error ??
      recentPaymentsRes.error ??
      clientsForInactiveRes.error ??
      attendanceAllRes.error ??
      pendingRequestsRes.error

    if (firstError) throw firstError

    const clients = (clientsRes.data ?? []) as Array<{ id: string }>
    const attendanceRange = attendanceRangeRes.data ?? []

    const attendanceCounts = new Map(weekDates.map((date) => [date, 0]))
    for (const row of attendanceRange) {
      attendanceCounts.set(row.date, (attendanceCounts.get(row.date) ?? 0) + 1)
    }

    const attendanceTrend = weekDates.map((date) => ({
      date,
      checkIns: attendanceCounts.get(date) ?? 0,
    }))
    const attendanceTotal = attendanceTrend.reduce((sum, row) => sum + row.checkIns, 0)

    const revenueBuckets = new Map(
      weekDates.map((date) => [
        date,
        { revenue: 0, pendingTotal: 0, paidPayments: 0, pendingPayments: 0 },
      ])
    )

    for (const payment of paymentsWeekRes.data ?? []) {
      const amount = toNumber(payment.amount)
      const bucketDate = paymentBucketDate(payment)
      const bucket = revenueBuckets.get(bucketDate)
      if (!bucket) continue

      if (payment.status === "paid" || payment.status === "approved") {
        bucket.revenue += amount
        bucket.paidPayments += 1
      } else if (payment.status === "pending") {
        bucket.pendingTotal += amount
        bucket.pendingPayments += 1
      }
    }

    const weekly = [...revenueBuckets.entries()].map(([date, bucket]) => ({
      date,
      revenue: bucket.revenue,
      pendingTotal: bucket.pendingTotal,
      paidPayments: bucket.paidPayments,
      pendingPayments: bucket.pendingPayments,
    }))

    const weeklyRevenue = weekly.reduce((sum, day) => sum + day.revenue, 0)
    const monthPayments = (paymentsMonthRes.data ?? []) as Array<{
      amount: number | string
    }>
    const pendingPayments = (pendingPaymentsRes.data ?? []) as Array<{
      amount: number | string
    }>
    const monthlyRevenue = monthPayments.reduce(
      (sum, payment) => sum + toNumber(payment.amount),
      0
    )
    const pendingPaymentsTotal = pendingPayments.reduce(
      (sum, payment) => sum + toNumber(payment.amount),
      0
    )

    const allAttendance = (attendanceAllRes.data ?? []) as Array<{
      user_id: string | null
      date: string
    }>

    const lastAttendance = new Map<string, string>()
    for (const row of allAttendance) {
      if (!row.user_id) continue
      const existing = lastAttendance.get(row.user_id)
      if (!existing || row.date > existing) lastAttendance.set(row.user_id, row.date)
    }

    const inactiveList = (
      (clientsForInactiveRes.data ?? []) as Array<{
        id: string
        name: string | null
        email: string | null
      }>
    )
      .map((client) => {
        const lastAttendanceDate = lastAttendance.get(client.id) ?? null
        return {
          client,
          lastAttendanceDate,
          isInactive: !lastAttendanceDate || lastAttendanceDate < inactiveCutoff,
        }
      })
      .filter((item) => item.isInactive)

    const activeLastWeek = new Set(
      allAttendance
        .filter((row) => row.date >= inactiveCutoff && row.user_id)
        .map((row) => row.user_id as string)
    )

    const recentPayments = (
      (recentPaymentsRes.data ?? []) as Array<{
        id: string | number
        user_id?: string
        amount: number | string
        status: string
        created_at: string
        users?: unknown
      }>
    ).map((payment) => {
      const user = firstRecord(payment.users)
      return {
        id: String(payment.id),
        memberId: payment.user_id ?? "",
        memberName:
          stringField(user, "name") ??
          stringField(user, "email") ??
          "Member",
        amount: toNumber(payment.amount),
        status: payment.status,
        paymentDate: paymentBucketDate(payment),
        createdAt: payment.created_at,
      }
    })

    const pendingRequests = ((pendingRequestsRes.data ?? []) as LegacyRequestRow[]).map(
      (request) => ({
        id: request.id,
        name: requestDisplayName(request),
        type: request.type,
        createdAt: request.created_at,
      })
    )

    return {
      metrics: {
        totalMembers: clients.length,
        activeMembers: (activeMembershipsRes.data ?? []).length,
        activeTrainers: (trainersRes.data ?? []).length,
        weeklyRevenue,
        monthlyRevenue,
        pendingPaymentsTotal,
        avgDailyAttendance:
          weekDates.length > 0
            ? Number((attendanceTotal / weekDates.length).toFixed(2))
            : 0,
        attendanceToday: attendanceCounts.get(today) ?? 0,
        inactiveMembers: clients.filter((client) => !activeLastWeek.has(client.id)).length,
        pendingRequests: requestsCountRes.count ?? 0,
      },
      attendance: {
        trend: attendanceTrend,
        total: attendanceTotal,
        average:
          weekDates.length > 0
            ? Number((attendanceTotal / weekDates.length).toFixed(2))
            : 0,
      },
      revenue: {
        weekly,
        monthly: [],
        weeklyRevenue,
        monthlyRevenue,
        pendingPaymentsTotal,
      },
      inactive: {
        count: inactiveList.length,
        members: inactiveList.slice(0, 5).map(({ client, lastAttendanceDate }) => ({
          memberId: client.id,
          userId: client.id,
          fullName: client.name ?? client.email ?? "Member",
          email: client.email,
          branchId: gymId,
          lastAttendanceDate,
          inactiveDays: lastAttendanceDate
            ? Math.floor(
                (Date.now() -
                  new Date(`${lastAttendanceDate}T00:00:00.000Z`).getTime()) /
                  DAY_MS
              )
            : null,
        })),
        pagination: { limit: 5, offset: 0 },
      },
      recentPayments,
      pendingRequests,
    }
  }

  private async getDashboardMetrics(query: AnalyticsDateRangeQuery) {
    const { data, error } = await this.ctx.supabase.rpc("get_dashboard_metrics", {
      p_branch_id: query.branchId ?? null,
    })

    if (error) {
      if (shouldUseTableFallback(error)) {
        return this.getDashboardMetricsFromTables(query.branchId)
      }
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
      if (shouldUseTableFallback(error)) {
        return this.getRecentPaymentsFromTables(limit, branchId)
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
      if (shouldUseTableFallback(error)) return this.getPendingRequestsFromTables(limit)
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
    const { data, error } = await withGymFilter(
      this.ctx.supabase
        .from("attendance")
        .select("date")
        .gte("date", from)
        .lte("date", to),
      query.branchId
    )

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
      withGymFilter(
        this.ctx.supabase
          .from("payments")
          .select("amount,status,created_at")
          .gte("created_at", `${monthlyFrom}T00:00:00.000Z`)
          .lte("created_at", `${todayDate()}T23:59:59.999Z`),
        query.branchId
      ),
      withGymFilter(
        this.ctx.supabase.from("payments").select("amount").eq("status", "pending"),
        query.branchId
      ),
    ])

    if (paymentsResult.error) throw paymentsResult.error
    if (pendingResult.error) throw pendingResult.error

    const payments = (paymentsResult.data ?? []) as Pick<
      LegacyPaymentRow,
      "amount" | "status" | "created_at"
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
      const bucketDate = paymentBucketDate(payment)
      const weeklyBucket = weeklyBuckets.get(bucketDate)

      if (weeklyBucket) {
        if (payment.status === "paid" || payment.status === "approved") {
          weeklyBucket.revenue += amount
          weeklyBucket.paidPayments += 1
        }

        if (payment.status === "pending") {
          weeklyBucket.pendingTotal += amount
          weeklyBucket.pendingPayments += 1
        }
      }

      const monthlyBucket = monthlyBuckets.get(monthStartFor(bucketDate))
      if (monthlyBucket) {
        if (payment.status === "paid" || payment.status === "approved") {
          monthlyBucket.revenue += amount
        }
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
    const [clientsResult, attendanceResult] = await Promise.all([
      withGymFilter(
        this.ctx.supabase
          .from("users")
          .select("id,name,email")
          .eq("role", "client")
          .order("name", { ascending: true }),
        query.branchId
      ),
      withGymFilter(
        this.ctx.supabase.from("attendance").select("user_id,date"),
        query.branchId
      ),
    ])

    if (clientsResult.error) throw clientsResult.error
    if (attendanceResult.error) throw attendanceResult.error

    const lastAttendance = new Map<string, string>()

    for (const row of (attendanceResult.data ?? []) as Array<{
      user_id: string
      date: string
    }>) {
      if (!row.user_id) continue
      const existing = lastAttendance.get(row.user_id)
      if (!existing || row.date > existing) lastAttendance.set(row.user_id, row.date)
    }

    const inactive = (
      (clientsResult.data ?? []) as Array<{ id: string; name: string | null; email: string | null }>
    )
      .map((client) => {
        const lastAttendanceDate = lastAttendance.get(client.id) ?? null
        return {
          client,
          lastAttendanceDate,
          isInactive: !lastAttendanceDate || lastAttendanceDate < cutoff,
        }
      })
      .filter((item) => item.isInactive)

    return {
      count: inactive.length,
      members: inactive
        .slice(query.offset, query.offset + query.limit)
        .map(({ client, lastAttendanceDate }) => ({
          memberId: client.id,
          userId: client.id,
          fullName: client.name ?? client.email ?? "Member",
          email: client.email,
          branchId: query.branchId ?? null,
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

  private async getDashboardMetricsFromTables(
    gymId?: string | null
  ): Promise<DashboardMetrics> {
    const weekStart = daysAgo(6)
    const monthStart = currentMonthStart()
    const today = todayDate()
    const inactiveCutoff = daysAgo(7)

    const [
      clientsResult,
      activeMembershipsResult,
      trainersResult,
      attendanceResult,
      weeklyPaymentsResult,
      monthlyPaymentsResult,
      pendingPaymentsResult,
      requestsResult,
    ] = await Promise.all([
      withGymFilter(
        this.ctx.supabase.from("users").select("id").eq("role", "client"),
        gymId
      ),
      withGymFilter(
        this.ctx.supabase
          .from("memberships")
          .select("user_id")
          .eq("status", "active"),
        gymId
      ),
      withGymFilter(
        this.ctx.supabase.from("users").select("id").eq("role", "trainer"),
        gymId
      ),
      withGymFilter(
        this.ctx.supabase
          .from("attendance")
          .select("user_id,date")
          .gte("date", weekStart)
          .lte("date", today),
        gymId
      ),
      withGymFilter(
        this.ctx.supabase
          .from("payments")
          .select("amount,status,created_at")
          .in("status", ["paid", "approved"])
          .gte("created_at", `${weekStart}T00:00:00.000Z`),
        gymId
      ),
      withGymFilter(
        this.ctx.supabase
          .from("payments")
          .select("amount,status,created_at")
          .in("status", ["paid", "approved"])
          .gte("created_at", `${monthStart}T00:00:00.000Z`),
        gymId
      ),
      withGymFilter(
        this.ctx.supabase.from("payments").select("amount").eq("status", "pending"),
        gymId
      ),
      this.ctx.supabase.from("requests").select("id").eq("status", "pending"),
    ])

    if (clientsResult.error) throw clientsResult.error
    if (activeMembershipsResult.error) throw activeMembershipsResult.error
    if (trainersResult.error) throw trainersResult.error
    if (attendanceResult.error) throw attendanceResult.error
    if (weeklyPaymentsResult.error) throw weeklyPaymentsResult.error
    if (monthlyPaymentsResult.error) throw monthlyPaymentsResult.error
    if (pendingPaymentsResult.error) throw pendingPaymentsResult.error
    if (requestsResult.error) throw requestsResult.error

    const clients = (clientsResult.data ?? []) as Array<{ id: string }>
    const attendance = (attendanceResult.data ?? []) as Array<{
      user_id: string | null
      date: string
    }>
    const activeLastWeek = new Set(
      attendance
        .filter((row) => row.date >= inactiveCutoff && row.user_id)
        .map((row) => row.user_id as string)
    )
    const attendanceByDate = new Map(eachDate(weekStart, today).map((date) => [date, 0]))

    for (const row of attendance) {
      attendanceByDate.set(row.date, (attendanceByDate.get(row.date) ?? 0) + 1)
    }

    const sumPayments = (
      rows: Array<{ amount: number | string }> | null | undefined
    ) => (rows ?? []).reduce((sum, payment) => sum + toNumber(payment.amount), 0)

    return {
      totalMembers: clients.length,
      activeMembers: (activeMembershipsResult.data ?? []).length,
      activeTrainers: (trainersResult.data ?? []).length,
      weeklyRevenue: sumPayments(weeklyPaymentsResult.data),
      monthlyRevenue: sumPayments(monthlyPaymentsResult.data),
      pendingPaymentsTotal: sumPayments(pendingPaymentsResult.data),
      avgDailyAttendance: Number(
        (
          [...attendanceByDate.values()].reduce((sum, count) => sum + count, 0) /
          Math.max(attendanceByDate.size, 1)
        ).toFixed(2)
      ),
      attendanceToday: attendanceByDate.get(today) ?? 0,
      inactiveMembers: clients.filter((client) => !activeLastWeek.has(client.id)).length,
      pendingRequests: (requestsResult.data ?? []).length,
    }
  }

  private async getRecentPaymentsFromTables(limit: number, gymId?: string | null) {
    const nestedResult = await withGymFilter(
      this.ctx.supabase
        .from("payments")
        .select("id,user_id,member_id,amount,status,created_at,users(name,email)")
        .order("created_at", { ascending: false })
        .limit(limit),
      gymId
    )

    let data = nestedResult.data as unknown[] | null
    let error = nestedResult.error

    if (error) {
      const plainResult = await withGymFilter(
        this.ctx.supabase
          .from("payments")
          .select("id,user_id,member_id,amount,status,created_at")
          .order("created_at", { ascending: false })
          .limit(limit),
        gymId
      )

      data = plainResult.data as unknown[] | null
      error = plainResult.error
    }

    if (error) throw error

    return ((data ?? []) as Array<
      LegacyPaymentRow & { user_id?: string; users?: unknown }
    >).map((payment) => {
      const user = firstRecord(payment.users)
      const memberName =
        stringField(user, "name") ??
        stringField(user, "email") ??
        paymentMemberName(payment)

      return {
        id: String(payment.id),
        memberId: String(payment.user_id ?? payment.member_id),
        memberName,
        amount: toNumber(payment.amount),
        status: payment.status,
        paymentDate: paymentBucketDate(payment),
        createdAt: payment.created_at,
      }
    })
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
