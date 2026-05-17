"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts"
import {
  ArrowDownRight,
  ArrowUpRight,
  Clock,
  Download,
  IndianRupee,
  Loader2,
  RotateCcw,
  TrendingUp,
  UserCheck,
  Users,
  Zap,
} from "lucide-react"
import { toast } from "sonner"
import { PageIntro, SurfaceCard } from "@/components/powerhouse"
import { Button } from "@/components/ui/button"

/* ── Types ─────────────────────────────────────────────────────────────── */
type Tab = "revenue" | "attendance" | "retention"

interface RevenueData {
  weekly: Array<{ date: string; revenue: number; pendingTotal: number; paidPayments: number; pendingPayments: number }>
  monthly: Array<{ monthStart: string; revenue: number; pendingTotal: number }>
  weeklyRevenue: number
  monthlyRevenue: number
  pendingPaymentsTotal: number
}

interface AttendanceData {
  trend: Array<{ date: string; checkIns: number }>
  total: number
  average: number
}

interface PeakHoursData {
  byDow: Array<{ day: string; checkIns: number }>
  byHour: Array<{ hour: string; checkIns: number }>
  avgDurationMinutes: number | null
}

interface RetentionData {
  totalMembers: number
  activeMembers: number
  newThisMonth: number
  churnRate: number
  renewalRate: number
  expiringThisWeek: number
  lifetimeValue: number
  membershipSegments: Array<{ label: string; count: number; color: string }>
}

interface InactiveData {
  count: number
  members: Array<{ memberId: string; fullName: string | null; email: string | null; lastAttendanceDate: string | null; inactiveDays: number | null }>
}

/* ── Helpers ────────────────────────────────────────────────────────────── */
const CHART_COLORS = { grid: "#1f2937", axis: "#4b5563", tooltip: { bg: "#111827", border: "#1f2937" } }

function formatCurrency(v: number) {
  return new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(v)
}

function formatMonth(v: string) {
  return new Intl.DateTimeFormat("en-IN", { month: "short", year: "2-digit" }).format(new Date(v + "T00:00:00"))
}

function formatChartDate(v: string) {
  return new Intl.DateTimeFormat("en-IN", { weekday: "short", day: "2-digit" }).format(new Date(v))
}

function StatCard({ label, value, sub, icon: Icon, accent = "default", delta }: {
  label: string; value: string | number; sub?: string
  icon?: React.ElementType; accent?: "green" | "red" | "amber" | "default"
  delta?: number
}) {
  const colors = { green: "#10b981", red: "#ef4444", amber: "#f59e0b", default: "#6b7280" }
  const color = colors[accent]
  return (
    <div className="rounded-xl border border-border bg-card p-4" style={{ borderLeftWidth: 4, borderLeftColor: color }}>
      <div className="flex items-start justify-between">
        <div>
          <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">{label}</p>
          <p className="mt-1.5 text-2xl font-bold text-foreground tabular-nums">{value}</p>
          {sub && <p className="mt-0.5 text-xs text-muted-foreground">{sub}</p>}
          {delta !== undefined && (
            <div className={`mt-1 flex items-center gap-0.5 text-xs font-bold ${delta >= 0 ? "text-emerald-500" : "text-red-500"}`}>
              {delta >= 0 ? <ArrowUpRight className="h-3 w-3" /> : <ArrowDownRight className="h-3 w-3" />}
              {Math.abs(delta)}%
            </div>
          )}
        </div>
        {Icon && <div className="rounded-lg bg-secondary p-2"><Icon className="h-5 w-5" style={{ color }} /></div>}
      </div>
    </div>
  )
}

/* ══════════════════════════════════════════════════════════════════════════
   Revenue Tab
══════════════════════════════════════════════════════════════════════════ */
function RevenueTab() {
  const [data, setData] = useState<RevenueData | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch("/api/analytics/revenue", { credentials: "include", cache: "no-store" })
      .then(r => r.json())
      .then(r => { if (r.success) setData(r.data); else toast.error("Revenue data unavailable") })
      .catch(() => toast.error("Revenue data unavailable"))
      .finally(() => setLoading(false))
  }, [])

  if (loading) return <div className="flex h-64 items-center justify-center"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>
  if (!data) return null

  const weeklyData = (data.weekly ?? []).map(d => ({ ...d, date: formatChartDate(d.date) }))
  const monthlyData = (data.monthly ?? []).map(d => ({ ...d, month: formatMonth(d.monthStart) }))

  // MoM delta
  const months = data.monthly ?? []
  const thisM = months[months.length - 1]?.revenue ?? 0
  const lastM = months[months.length - 2]?.revenue ?? 0
  const mom = lastM > 0 ? Math.round(((thisM - lastM) / lastM) * 100) : 0

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-3">
        <StatCard label="This Month" value={formatCurrency(data.monthlyRevenue)} sub="Approved payments" icon={IndianRupee} accent="green" delta={mom} />
        <StatCard label="This Week" value={formatCurrency(data.weeklyRevenue)} sub="7-day window" icon={TrendingUp} accent="green" />
        <StatCard label="Pending" value={formatCurrency(data.pendingPaymentsTotal)} sub="Awaiting approval" icon={Clock} accent="amber" />
      </div>

      {/* Weekly chart */}
      <SurfaceCard>
        <h3 className="mb-4 text-sm font-bold uppercase tracking-widest text-muted-foreground">Daily Revenue (7 Days)</h3>
        <ResponsiveContainer width="100%" height={260}>
          <BarChart data={weeklyData} barGap={4}>
            <CartesianGrid strokeDasharray="3 3" stroke={CHART_COLORS.grid} vertical={false} />
            <XAxis dataKey="date" stroke={CHART_COLORS.axis} tick={{ fontSize: 11 }} />
            <YAxis stroke={CHART_COLORS.axis} tick={{ fontSize: 11 }} tickFormatter={v => `₹${(v/1000).toFixed(0)}k`} />
            <Tooltip contentStyle={{ backgroundColor: CHART_COLORS.tooltip.bg, border: `1px solid ${CHART_COLORS.tooltip.border}`, borderRadius: 8 }}
              formatter={(v: number) => [formatCurrency(v)]} />
            <Bar dataKey="revenue" fill="#10b981" name="Paid" radius={[4,4,0,0]} />
            <Bar dataKey="pendingTotal" fill="#f59e0b" name="Pending" radius={[4,4,0,0]} />
          </BarChart>
        </ResponsiveContainer>
        <div className="mt-2 flex gap-4 text-xs text-muted-foreground">
          <span className="flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-sm bg-emerald-500" />Paid</span>
          <span className="flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-sm bg-amber-500" />Pending</span>
        </div>
      </SurfaceCard>

      {/* 6-month trend */}
      <SurfaceCard>
        <h3 className="mb-4 text-sm font-bold uppercase tracking-widest text-muted-foreground">6-Month Revenue Trend</h3>
        <ResponsiveContainer width="100%" height={240}>
          <AreaChart data={monthlyData}>
            <defs>
              <linearGradient id="revenueGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#10b981" stopOpacity={0.3} />
                <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke={CHART_COLORS.grid} vertical={false} />
            <XAxis dataKey="month" stroke={CHART_COLORS.axis} tick={{ fontSize: 11 }} />
            <YAxis stroke={CHART_COLORS.axis} tick={{ fontSize: 11 }} tickFormatter={v => `₹${(v/1000).toFixed(0)}k`} />
            <Tooltip contentStyle={{ backgroundColor: CHART_COLORS.tooltip.bg, border: `1px solid ${CHART_COLORS.tooltip.border}`, borderRadius: 8 }}
              formatter={(v: number) => [formatCurrency(v)]} />
            <Area type="monotone" dataKey="revenue" stroke="#10b981" fill="url(#revenueGrad)" strokeWidth={2} name="Revenue" />
          </AreaChart>
        </ResponsiveContainer>
      </SurfaceCard>
    </div>
  )
}

/* ══════════════════════════════════════════════════════════════════════════
   Attendance Tab
══════════════════════════════════════════════════════════════════════════ */
function AttendanceTab() {
  const [trend, setTrend] = useState<AttendanceData | null>(null)
  const [peaks, setPeaks] = useState<PeakHoursData | null>(null)
  const [days, setDays] = useState(30)
  const [loading, setLoading] = useState(true)

  const load = useCallback(async (d: number) => {
    setLoading(true)
    const from = new Date(Date.now() - d * 86400000).toISOString().split("T")[0]!
    const to = new Date().toISOString().split("T")[0]!
    try {
      const [trendRes, peaksRes] = await Promise.all([
        fetch(`/api/analytics/attendance?from=${from}&to=${to}`, { credentials: "include", cache: "no-store" }).then(r => r.json()),
        fetch(`/api/analytics/peak-hours?from=${from}&to=${to}`, { credentials: "include", cache: "no-store" }).then(r => r.json()),
      ])
      if (trendRes.success) setTrend(trendRes.data)
      if (peaksRes.success) setPeaks(peaksRes.data)
    } catch { toast.error("Attendance data unavailable") }
    finally { setLoading(false) }
  }, [])

  useEffect(() => { load(days) }, [days, load])

  const trendData = useMemo(() => (trend?.trend ?? []).map(d => ({ ...d, date: formatChartDate(d.date) })), [trend])

  return (
    <div className="space-y-6">
      {/* Range selector */}
      <div className="flex items-center gap-2">
        {[7, 30, 90].map(d => (
          <Button key={d} size="sm" variant={days === d ? "default" : "outline"}
            className={days === d ? "bg-primary text-background" : "border-border"}
            onClick={() => setDays(d)}>
            {d}d
          </Button>
        ))}
        {loading && <Loader2 className="ml-2 h-4 w-4 animate-spin text-muted-foreground" />}
      </div>

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-3">
        <StatCard label="Total Check-ins" value={trend?.total ?? 0} sub={`Last ${days} days`} icon={TrendingUp} accent="red" />
        <StatCard label="Daily Average" value={trend?.average ?? 0} sub="Check-ins per day" icon={Users} />
        <StatCard label="Avg Session" value={peaks?.avgDurationMinutes ? `${peaks.avgDurationMinutes}m` : "N/A"} sub="Check-in to out" icon={Clock} accent="amber" />
      </div>

      {/* Trend chart */}
      <SurfaceCard>
        <h3 className="mb-4 text-sm font-bold uppercase tracking-widest text-muted-foreground">Attendance Trend</h3>
        <ResponsiveContainer width="100%" height={260}>
          <AreaChart data={trendData}>
            <defs>
              <linearGradient id="attendGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#ef4444" stopOpacity={0.3} />
                <stop offset="95%" stopColor="#ef4444" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke={CHART_COLORS.grid} vertical={false} />
            <XAxis dataKey="date" stroke={CHART_COLORS.axis} tick={{ fontSize: 10 }} interval="preserveStartEnd" />
            <YAxis stroke={CHART_COLORS.axis} tick={{ fontSize: 11 }} allowDecimals={false} />
            <Tooltip contentStyle={{ backgroundColor: CHART_COLORS.tooltip.bg, border: `1px solid ${CHART_COLORS.tooltip.border}`, borderRadius: 8 }} />
            <Area type="monotone" dataKey="checkIns" stroke="#ef4444" fill="url(#attendGrad)" strokeWidth={2} name="Check-ins" />
          </AreaChart>
        </ResponsiveContainer>
      </SurfaceCard>

      {/* Day of week + Hour of day */}
      <div className="grid gap-6 lg:grid-cols-2">
        <SurfaceCard>
          <h3 className="mb-4 text-sm font-bold uppercase tracking-widest text-muted-foreground">Busiest Day of Week</h3>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={peaks?.byDow ?? []} barSize={28}>
              <CartesianGrid strokeDasharray="3 3" stroke={CHART_COLORS.grid} vertical={false} />
              <XAxis dataKey="day" stroke={CHART_COLORS.axis} tick={{ fontSize: 11 }} />
              <YAxis stroke={CHART_COLORS.axis} tick={{ fontSize: 11 }} allowDecimals={false} />
              <Tooltip contentStyle={{ backgroundColor: CHART_COLORS.tooltip.bg, border: `1px solid ${CHART_COLORS.tooltip.border}`, borderRadius: 8 }} />
              <Bar dataKey="checkIns" name="Check-ins" radius={[4,4,0,0]}>
                {(peaks?.byDow ?? []).map((_, i) => (
                  <Cell key={i} fill={i === (peaks?.byDow ?? []).reduce((mi, v, j, a) => v.checkIns > a[mi].checkIns ? j : mi, 0) ? "#ef4444" : "#374151"} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </SurfaceCard>

        <SurfaceCard>
          <h3 className="mb-4 text-sm font-bold uppercase tracking-widest text-muted-foreground">Peak Hours</h3>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={peaks?.byHour ?? []} barSize={14}>
              <CartesianGrid strokeDasharray="3 3" stroke={CHART_COLORS.grid} vertical={false} />
              <XAxis dataKey="hour" stroke={CHART_COLORS.axis} tick={{ fontSize: 9 }} interval={1} />
              <YAxis stroke={CHART_COLORS.axis} tick={{ fontSize: 11 }} allowDecimals={false} />
              <Tooltip contentStyle={{ backgroundColor: CHART_COLORS.tooltip.bg, border: `1px solid ${CHART_COLORS.tooltip.border}`, borderRadius: 8 }} />
              <Bar dataKey="checkIns" name="Check-ins" radius={[3,3,0,0]}>
                {(peaks?.byHour ?? []).map((_, i) => (
                  <Cell key={i} fill={i === (peaks?.byHour ?? []).reduce((mi, v, j, a) => v.checkIns > a[mi].checkIns ? j : mi, 0) ? "#ef4444" : "#374151"} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </SurfaceCard>
      </div>
    </div>
  )
}

/* ══════════════════════════════════════════════════════════════════════════
   Retention Tab
══════════════════════════════════════════════════════════════════════════ */
function RetentionTab() {
  const [data, setData] = useState<RetentionData | null>(null)
  const [inactive, setInactive] = useState<InactiveData | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    Promise.all([
      fetch("/api/analytics/retention", { credentials: "include", cache: "no-store" }).then(r => r.json()),
      fetch("/api/analytics/inactive-members?days=14&limit=20", { credentials: "include", cache: "no-store" }).then(r => r.json()),
    ]).then(([ret, inact]) => {
      if (ret.success) setData(ret.data)
      if (inact.success) setInactive(inact.data)
    }).catch(() => toast.error("Retention data unavailable"))
      .finally(() => setLoading(false))
  }, [])

  if (loading) return <div className="flex h-64 items-center justify-center"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>

  const segments = data?.membershipSegments ?? []
  const total = segments.reduce((s, seg) => s + seg.count, 0)

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard label="Total Members" value={data?.totalMembers ?? 0} icon={Users} />
        <StatCard label="Active" value={data?.activeMembers ?? 0} sub="Valid membership" icon={UserCheck} accent="green" />
        <StatCard label="New This Month" value={data?.newThisMonth ?? 0} sub="Signups" icon={TrendingUp} accent="green" />
        <StatCard label="Avg Lifetime Value" value={formatCurrency(data?.lifetimeValue ?? 0)} sub="Per member" icon={IndianRupee} accent="amber" />
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Segment donut */}
        <SurfaceCard>
          <h3 className="mb-4 text-sm font-bold uppercase tracking-widest text-muted-foreground">Membership Breakdown</h3>
          <div className="flex items-center gap-6">
            <ResponsiveContainer width={180} height={180}>
              <PieChart>
                <Pie data={segments} dataKey="count" cx="50%" cy="50%" innerRadius={50} outerRadius={80} paddingAngle={3}>
                  {segments.map((seg, i) => <Cell key={i} fill={seg.color} />)}
                </Pie>
                <Tooltip contentStyle={{ backgroundColor: CHART_COLORS.tooltip.bg, border: `1px solid ${CHART_COLORS.tooltip.border}`, borderRadius: 8 }} />
              </PieChart>
            </ResponsiveContainer>
            <div className="flex-1 space-y-2">
              {segments.map((seg, i) => (
                <div key={i} className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2">
                    <div className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: seg.color }} />
                    <span className="text-sm text-muted-foreground">{seg.label}</span>
                  </div>
                  <div className="text-right">
                    <span className="text-sm font-bold text-foreground">{seg.count}</span>
                    <span className="ml-1 text-xs text-muted-foreground">{total > 0 ? `${Math.round(seg.count / total * 100)}%` : "0%"}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </SurfaceCard>

        {/* Renewal / Churn */}
        <SurfaceCard>
          <h3 className="mb-4 text-sm font-bold uppercase tracking-widest text-muted-foreground">Retention Health</h3>
          <div className="space-y-4">
            <div>
              <div className="mb-1 flex justify-between text-sm">
                <span className="text-muted-foreground">Renewal Rate</span>
                <span className="font-bold text-emerald-500">{data?.renewalRate ?? 0}%</span>
              </div>
              <div className="h-2 rounded-full bg-muted">
                <div className="h-2 rounded-full bg-emerald-500 transition-all" style={{ width: `${data?.renewalRate ?? 0}%` }} />
              </div>
            </div>
            <div>
              <div className="mb-1 flex justify-between text-sm">
                <span className="text-muted-foreground">Churn Rate</span>
                <span className="font-bold text-red-500">{data?.churnRate ?? 0}%</span>
              </div>
              <div className="h-2 rounded-full bg-muted">
                <div className="h-2 rounded-full bg-red-500 transition-all" style={{ width: `${data?.churnRate ?? 0}%` }} />
              </div>
            </div>
            <div className="rounded-lg border border-border bg-background p-3">
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Expiring This Week</span>
                <span className="text-sm font-bold text-amber-500">{data?.expiringThisWeek ?? 0} members</span>
              </div>
            </div>
          </div>
        </SurfaceCard>
      </div>

      {/* Inactive list */}
      {(inactive?.members?.length ?? 0) > 0 && (
        <SurfaceCard>
          <div className="mb-4 flex items-center gap-2">
            <Zap className="h-4 w-4 text-amber-500" />
            <h3 className="text-sm font-bold uppercase tracking-widest text-muted-foreground">
              Inactive Members (14+ Days)
            </h3>
          </div>
          <div className="space-y-2">
            {inactive!.members.map((m, i) => (
              <div key={i} className="flex items-center justify-between rounded-lg border border-border bg-background px-3 py-2">
                <div>
                  <p className="text-sm font-medium text-foreground">{m.fullName ?? "Member"}</p>
                  {m.email && <p className="text-xs text-muted-foreground">{m.email}</p>}
                </div>
                <div className="text-right">
                  <span className={`text-sm font-bold ${(m.inactiveDays ?? 0) >= 30 ? "text-red-500" : "text-amber-500"}`}>
                    {m.inactiveDays != null ? `${m.inactiveDays}d ago` : "Never"}
                  </span>
                  {m.lastAttendanceDate && (
                    <p className="text-xs text-muted-foreground">{m.lastAttendanceDate}</p>
                  )}
                </div>
              </div>
            ))}
          </div>
        </SurfaceCard>
      )}
    </div>
  )
}

/* ══════════════════════════════════════════════════════════════════════════
   Page Shell
══════════════════════════════════════════════════════════════════════════ */
export default function OwnerAnalyticsPage() {
  const [tab, setTab] = useState<Tab>("revenue")
  const [downloading, setDownloading] = useState(false)

  const now = new Date()
  const defaultMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`
  const [reportMonth, setReportMonth] = useState(defaultMonth)

  async function downloadReport() {
    setDownloading(true)
    try {
      const res = await fetch(`/api/owner/reports/monthly?month=${reportMonth}`, {
        credentials: "include",
      })
      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        throw new Error(err?.error ?? "Download failed")
      }
      const blob = await res.blob()
      const url = URL.createObjectURL(blob)
      const a = document.createElement("a")
      a.href = url
      a.download = `PowerHouse_Report_${reportMonth}.xlsx`
      document.body.appendChild(a)
      a.click()
      a.remove()
      URL.revokeObjectURL(url)
    } catch (error) {
      toast.error("Download failed", {
        description: error instanceof Error ? error.message : "Please try again.",
      })
    } finally {
      setDownloading(false)
    }
  }

  const tabs: Array<{ id: Tab; label: string; icon: React.ElementType }> = [
    { id: "revenue", label: "Revenue", icon: IndianRupee },
    { id: "attendance", label: "Attendance", icon: TrendingUp },
    { id: "retention", label: "Retention", icon: RotateCcw },
  ]

  return (
    <div className="flex-1 overflow-y-auto">
      <div className="max-w-6xl">
        <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <PageIntro title="Analytics" description="Revenue trends, attendance patterns, and member retention" />

          {/* Download Report */}
          <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row sm:items-center">
            <input
              type="month"
              value={reportMonth}
              onChange={(e) => setReportMonth(e.target.value)}
              className="h-10 w-full rounded-lg border border-border bg-card px-3 text-sm text-foreground focus:border-primary focus:outline-none sm:w-auto"
            />
            <Button
              size="sm"
              className="h-10 w-full gap-2 bg-primary text-background hover:bg-primary/90 sm:w-auto"
              onClick={downloadReport}
              disabled={downloading}
            >
              {downloading
                ? <Loader2 className="h-4 w-4 animate-spin" />
                : <Download className="h-4 w-4" />}
              {downloading ? "Generating…" : "Download Report"}
            </Button>
          </div>
        </div>

        {/* Tab bar */}
        <div className="mb-6 flex gap-1 rounded-xl border border-border bg-card p-1">
          {tabs.map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              onClick={() => setTab(id)}
              className={`flex flex-1 items-center justify-center gap-2 rounded-lg px-4 py-2.5 text-sm font-semibold transition-all ${
                tab === id
                  ? "bg-primary text-background shadow"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <Icon className="h-4 w-4" />
              {label}
            </button>
          ))}
        </div>

        {tab === "revenue" && <RevenueTab />}
        {tab === "attendance" && <AttendanceTab />}
        {tab === "retention" && <RetentionTab />}
      </div>
    </div>
  )
}
