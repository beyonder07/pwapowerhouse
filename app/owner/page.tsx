"use client"

import { useCallback, useEffect, useState } from "react"
import {
  AlertTriangle,
  ArrowRight,
  Bell,
  CalendarDays,
  CheckCircle2,
  Clock,
  DollarSign,
  IndianRupee,
  Loader2,
  TrendingUp,
  UserCheck,
  Users,
  Zap,
} from "lucide-react"
import { toast } from "sonner"
import Link from "next/link"

import { MetricCard, PageIntro, SurfaceCard } from "@/components/powerhouse"

/* ── Types matching DashboardService.getOwnerDashboard() ─────────────────── */
interface DashboardData {
  metrics: {
    totalRevenue: number
    clients: number
    trainers: number
    attendanceToday: number
  }
  trend: Array<{ date: string; checkIns: number; revenue: number }>
}

interface AlertsData {
  todayCheckIns: number
  monthRevenue: number
  pendingPayments: { count: number; amount: number }
  expiringMemberships: Array<{ userId: string; name: string; endDate: string; daysLeft: number }>
  inactiveMembers: Array<{ id: string; name: string; daysSince: number }>
  recentSignups: Array<{ id: string; name: string; joinedAt: string }>
}

/* ── Helpers ────────────────────────────────────────────────────────────── */
function formatCurrency(value: number) {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(value)
}

function formatTime(value: string) {
  return new Intl.DateTimeFormat("en-IN", {
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value))
}

function daysLeftColor(days: number) {
  if (days <= 2) return "text-red-500"
  if (days <= 5) return "text-amber-500"
  return "text-muted-foreground"
}

/* ══════════════════════════════════════════════════════════════════════════
   Page
══════════════════════════════════════════════════════════════════════════ */
export default function OwnerDashboardPage() {
  const [dashboard, setDashboard] = useState<DashboardData | null>(null)
  const [alerts, setAlerts] = useState<AlertsData | null>(null)
  const [loadingDash, setLoadingDash] = useState(true)
  const [loadingAlerts, setLoadingAlerts] = useState(true)

  const loadAll = useCallback(async () => {
    // Fire both requests in parallel — owner/dashboard is the reliable one
    const [dashRes, alertsRes] = await Promise.allSettled([
      fetch("/api/owner/dashboard", {
        credentials: "include",
        cache: "no-store",
      }).then((r) => r.json()),
      fetch("/api/owner/alerts", {
        credentials: "include",
        cache: "no-store",
      }).then((r) => r.json()),
    ])

    if (dashRes.status === "fulfilled" && dashRes.value?.success) {
      setDashboard(dashRes.value.data)
    } else {
      const msg =
        dashRes.status === "fulfilled"
          ? dashRes.value?.error ?? "Server error"
          : (dashRes.reason as Error)?.message ?? "Network error"
      toast.error("Dashboard unavailable", { description: msg })
    }
    setLoadingDash(false)

    if (alertsRes.status === "fulfilled" && alertsRes.value?.success) {
      setAlerts(alertsRes.value.data)
    }
    setLoadingAlerts(false)
  }, [])

  useEffect(() => {
    loadAll()
  }, [loadAll])

  /* ── Pulse Bar ──────────────────────────────────────────────────────── */
  const todayCheckIns = alerts?.todayCheckIns ?? dashboard?.metrics?.attendanceToday ?? 0
  const monthRevenue = alerts?.monthRevenue ?? 0
  const pendingCount = alerts?.pendingPayments?.count ?? 0
  const expiringCount = alerts?.expiringMemberships?.length ?? 0

  /* ── Skeleton ───────────────────────────────────────────────────────── */
  if (loadingDash && !dashboard) {
    return (
      <div className="max-w-6xl space-y-6 animate-pulse">
        <PageIntro title="Dashboard" description="Loading command center…" />
        <div className="h-12 rounded-xl border border-border bg-card" />
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-24 rounded-xl border border-border bg-card" />
          ))}
        </div>
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          {[1, 2].map((i) => (
            <div key={i} className="h-64 rounded-xl border border-border bg-card" />
          ))}
        </div>
      </div>
    )
  }

  const m = dashboard?.metrics

  return (
    <div className="max-w-6xl">
        <PageIntro
          title="Dashboard"
          description="Gym command center — live pulse, trends, and alerts"
        />

        {/* ── Live Pulse Bar ─────────────────────────────────────────── */}
        <div className="mb-6 flex flex-wrap items-center gap-3 rounded-xl border border-border bg-card px-4 py-3">
          <div className="flex items-center gap-1.5">
            <span className="relative flex h-2.5 w-2.5">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
              <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-emerald-500" />
            </span>
            <span className="text-xs font-semibold text-emerald-500">Live</span>
          </div>

          <div className="h-4 w-px bg-border" />
          <span className="text-sm text-muted-foreground">
            <span className="font-bold text-foreground">
              {loadingAlerts ? "—" : todayCheckIns}
            </span>{" "}
            check-ins today
          </span>

          <div className="h-4 w-px bg-border" />
          <span className="text-sm text-muted-foreground">
            <span className="font-bold text-foreground">
              {loadingAlerts ? "—" : formatCurrency(monthRevenue)}
            </span>{" "}
            this month
          </span>

          {!loadingAlerts && pendingCount > 0 && (
            <>
              <div className="h-4 w-px bg-border" />
              <Link
                href="/owner/payments"
                className="flex items-center gap-1 text-sm text-amber-500 hover:underline"
              >
                <Bell className="h-3 w-3" />
                {pendingCount} payment{pendingCount !== 1 ? "s" : ""} pending
              </Link>
            </>
          )}

          {!loadingAlerts && expiringCount > 0 && (
            <>
              <div className="h-4 w-px bg-border" />
              <span className="flex items-center gap-1 text-sm text-red-500">
                <AlertTriangle className="h-3 w-3" />
                {expiringCount} expiring this week
              </span>
            </>
          )}
        </div>

        {/* ── Core Metrics ───────────────────────────────────────────── */}
        <div className="mb-6 grid grid-cols-2 gap-4 lg:grid-cols-4">
          <MetricCard
            label="Members"
            value={m?.clients ?? 0}
            subValue="Registered clients"
            icon={Users}
            accentColor="red"
          />
          <MetricCard
            label="Trainers"
            value={m?.trainers ?? 0}
            subValue="Active staff"
            icon={UserCheck}
            accentColor="red"
          />
          <MetricCard
            label="Total Revenue"
            value={formatCurrency(m?.totalRevenue ?? 0)}
            subValue={
              pendingCount > 0
                ? `${formatCurrency(alerts?.pendingPayments?.amount ?? 0)} pending`
                : "All-time approved"
            }
            icon={IndianRupee}
            accentColor="green"
          />
          <MetricCard
            label="Check-ins Today"
            value={todayCheckIns}
            subValue="Live attendance"
            icon={TrendingUp}
            accentColor="red"
          />
        </div>


        {/* ── Alerts Row ─────────────────────────────────────────────── */}
        <div className="mb-6 grid grid-cols-1 gap-6 lg:grid-cols-2">
          {/* Expiring memberships */}
          <SurfaceCard>
            <div className="mb-4 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <CalendarDays className="h-4 w-4 text-amber-500" />
                <h3 className="text-sm font-bold uppercase tracking-widest text-muted-foreground">
                  Expiring This Week
                </h3>
              </div>
              <Link
                href="/owner/members?status=expiring"
                className="flex items-center gap-1 text-xs text-primary hover:underline"
              >
                All <ArrowRight className="h-3 w-3" />
              </Link>
            </div>

            {loadingAlerts ? (
              <div className="flex h-24 items-center justify-center">
                <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
              </div>
            ) : (alerts?.expiringMemberships?.length ?? 0) === 0 ? (
              <div className="flex flex-col items-center gap-2 py-6 text-center">
                <CheckCircle2 className="h-8 w-8 text-emerald-500 opacity-40" />
                <p className="text-sm text-muted-foreground">
                  No memberships expiring this week
                </p>
              </div>
            ) : (
              <div className="space-y-2">
                {alerts!.expiringMemberships.map((m) => (
                  <div
                    key={m.userId}
                    className="flex items-center justify-between rounded-lg border border-border bg-background px-3 py-2"
                  >
                    <p className="text-sm font-medium text-foreground">{m.name}</p>
                    <span className={`text-xs font-bold ${daysLeftColor(m.daysLeft)}`}>
                      {m.daysLeft === 0
                        ? "Expires today"
                        : m.daysLeft === 1
                          ? "1 day left"
                          : `${m.daysLeft} days left`}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </SurfaceCard>

          {/* Inactive members */}
          <SurfaceCard>
            <div className="mb-4 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Zap className="h-4 w-4 text-red-500" />
                <h3 className="text-sm font-bold uppercase tracking-widest text-muted-foreground">
                  Inactive Members
                </h3>
              </div>
              <Link
                href="/owner/members"
                className="flex items-center gap-1 text-xs text-primary hover:underline"
              >
                All <ArrowRight className="h-3 w-3" />
              </Link>
            </div>

            {loadingAlerts ? (
              <div className="flex h-24 items-center justify-center">
                <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
              </div>
            ) : (alerts?.inactiveMembers?.length ?? 0) === 0 ? (
              <div className="flex flex-col items-center gap-2 py-6 text-center">
                <CheckCircle2 className="h-8 w-8 text-emerald-500 opacity-40" />
                <p className="text-sm text-muted-foreground">
                  All members active in the last 7 days
                </p>
              </div>
            ) : (
              <div className="space-y-2">
                {alerts!.inactiveMembers.slice(0, 6).map((m) => (
                  <div
                    key={m.id}
                    className="flex items-center justify-between rounded-lg border border-border bg-background px-3 py-2"
                  >
                    <p className="text-sm font-medium text-foreground">{m.name}</p>
                    <span
                      className={`text-xs font-bold ${
                        m.daysSince >= 30 ? "text-red-500" : "text-amber-500"
                      }`}
                    >
                      {m.daysSince >= 999 ? "Never visited" : `${m.daysSince} days ago`}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </SurfaceCard>
        </div>

        {/* ── Recent Signups + Month Revenue quick stat ──────────────── */}
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          <SurfaceCard>
            <div className="mb-4 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <DollarSign className="h-4 w-4 text-emerald-500" />
                <h3 className="text-sm font-bold uppercase tracking-widest text-muted-foreground">
                  Month Revenue
                </h3>
              </div>
              <Link
                href="/owner/payments"
                className="flex items-center gap-1 text-xs text-primary hover:underline"
              >
                Payments <ArrowRight className="h-3 w-3" />
              </Link>
            </div>
            <div className="flex flex-col items-center justify-center py-6 text-center">
              <p className="text-4xl font-bold text-foreground tabular-nums">
                {loadingAlerts ? "—" : formatCurrency(monthRevenue)}
              </p>
              <p className="mt-2 text-sm text-muted-foreground">Approved this month</p>
              {pendingCount > 0 && (
                <p className="mt-1 text-sm text-amber-500">
                  +{formatCurrency(alerts?.pendingPayments?.amount ?? 0)} pending approval
                </p>
              )}
            </div>
          </SurfaceCard>

          <SurfaceCard>
            <div className="mb-4 flex items-center gap-2">
              <Clock className="h-4 w-4 text-primary" />
              <h3 className="text-sm font-bold uppercase tracking-widest text-muted-foreground">
                Quick Links
              </h3>
            </div>
            <div className="grid grid-cols-2 gap-2">
              {[
                { label: "Pending Payments", href: "/owner/payments", icon: DollarSign, highlight: pendingCount > 0, badge: pendingCount > 0 ? String(pendingCount) : null },
                { label: "View Analytics", href: "/owner/analytics", icon: TrendingUp, highlight: false, badge: null },
                { label: "All Members", href: "/owner/members", icon: Users, highlight: false, badge: null },
                { label: "Salary Payroll", href: "/owner/salary", icon: IndianRupee, highlight: false, badge: null },
              ].map(({ label, href, icon: Icon, highlight, badge }) => (
                <Link
                  key={href}
                  href={href}
                  className={`relative flex flex-col items-center gap-2 rounded-lg border px-3 py-4 text-center text-xs font-medium transition-colors ${
                    highlight
                      ? "border-amber-500/30 bg-amber-500/10 text-amber-500 hover:bg-amber-500/20"
                      : "border-border bg-background text-muted-foreground hover:border-primary/30 hover:text-foreground"
                  }`}
                >
                  {badge && (
                    <span className="absolute right-2 top-2 flex h-4 w-4 items-center justify-center rounded-full bg-amber-500 text-[9px] font-bold text-black">
                      {badge}
                    </span>
                  )}
                  <Icon className="h-5 w-5" />
                  {label}
                </Link>
              ))}
            </div>
          </SurfaceCard>
        </div>
      </div>
  )
}
