"use client"

import { useEffect, useState } from "react"
import { AlertCircle, DollarSign, TrendingUp, UserCheck, Users } from "lucide-react"
import {
  AttendanceTrendChart,
  InactiveMembersCard,
  RevenueBarChart,
} from "@/components/analytics"
import { MetricCard, PageIntro, StatusPill, SurfaceCard } from "@/components/powerhouse"
import { toast } from "sonner"

interface DashboardData {
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
  attendance: {
    trend: Array<{ date: string; checkIns: number }>
    total: number
    average: number
  }
  revenue: {
    weekly: Array<{ date: string; revenue: number; pendingTotal: number }>
    weeklyRevenue: number
    monthlyRevenue: number
    pendingPaymentsTotal: number
  }
  inactive: {
    count: number
    members: Array<{
      memberId: string
      fullName: string | null
      email: string | null
      lastAttendanceDate: string | null
    }>
  }
  recentPayments: Array<{
    id: string
    memberName: string
    amount: number
    status: string
    paymentDate: string
  }>
  pendingRequests: Array<{
    id: string
    name: string
    type: string
    createdAt: string
  }>
}

function formatCurrency(value: number) {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(value)
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat("en-IN", {
    dateStyle: "medium",
  }).format(new Date(value))
}

export default function OwnerDashboardPage() {
  const [dashboard, setDashboard] = useState<DashboardData | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    let mounted = true

    async function loadDashboard() {
      try {
        const response = await fetch("/api/analytics/dashboard", {
          credentials: "include",
          cache: "no-store",
        })
        const result = await response.json()

        if (!response.ok || !result.success) {
          throw new Error(result.error || "Unable to load dashboard")
        }

        if (mounted) {
          setDashboard(result.data)
        }
      } catch (error) {
        toast.error("Could not load dashboard", {
          description:
            error instanceof Error
              ? error.message
              : "Please refresh and try again.",
        })
      } finally {
        if (mounted) {
          setIsLoading(false)
        }
      }
    }

    loadDashboard()

    return () => {
      mounted = false
    }
  }, [])

  if (isLoading) {
    return (
      <div className="space-y-6">
        <PageIntro
          title="Dashboard"
          description="Overview of your gym operations and performance"
        />
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
          {Array.from({ length: 4 }).map((_, index) => (
            <div
              key={index}
              className="h-28 animate-pulse rounded-xl border border-border bg-card"
            />
          ))}
        </div>
      </div>
    )
  }

  if (!dashboard) {
    return (
      <div className="space-y-6">
        <PageIntro
          title="Dashboard"
          description="Overview of your gym operations and performance"
        />
        <SurfaceCard>
          <p className="text-sm text-muted-foreground">
            Dashboard data is unavailable.
          </p>
        </SurfaceCard>
      </div>
    )
  }

  return (
    <div className="flex-1 overflow-y-auto">
      <div className="max-w-6xl">
        <PageIntro
          title="Dashboard"
          description="Overview of your gym operations and performance"
        />

        <div className="mb-6 grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
          <MetricCard
            label="Total Members"
            value={dashboard.metrics.totalMembers}
            subValue={`${dashboard.metrics.activeMembers} active`}
            accentColor="red"
            icon={Users}
          />
          <MetricCard
            label="Active Trainers"
            value={dashboard.metrics.activeTrainers}
            accentColor="red"
            icon={UserCheck}
          />
          <MetricCard
            label="This Week Revenue"
            value={formatCurrency(dashboard.metrics.weeklyRevenue)}
            subValue={`${formatCurrency(dashboard.metrics.pendingPaymentsTotal)} pending`}
            accentColor="red"
            icon={DollarSign}
          />
          <MetricCard
            label="Avg. Daily Attendance"
            value={dashboard.metrics.avgDailyAttendance}
            subValue={`${dashboard.metrics.attendanceToday} today`}
            accentColor="red"
            icon={TrendingUp}
          />
        </div>

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
          <div className="space-y-6 lg:col-span-2">
            <RevenueBarChart data={dashboard.revenue.weekly} />
            <AttendanceTrendChart data={dashboard.attendance.trend} />
          </div>

          <div className="space-y-6">
            <InactiveMembersCard count={dashboard.metrics.inactiveMembers} />

            <SurfaceCard>
              <h3 className="mb-4 text-lg font-semibold text-foreground">
                Recent Payments
              </h3>
              {dashboard.recentPayments.length > 0 ? (
                <div className="space-y-3">
                  {dashboard.recentPayments.map((payment) => (
                    <div
                      key={payment.id}
                      className="flex items-center justify-between rounded-lg border border-border bg-background p-3"
                    >
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-medium text-foreground">
                          {payment.memberName}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {formatDate(payment.paymentDate)}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-semibold text-accent">
                          {formatCurrency(payment.amount)}
                        </p>
                        <StatusPill
                          status={payment.status === "paid" ? "completed" : payment.status}
                          label={payment.status}
                          size="sm"
                        />
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">
                  No payments found.
                </p>
              )}
            </SurfaceCard>
          </div>
        </div>

        <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-3">
          <div className="lg:col-span-2">
            <SurfaceCard>
              <h3 className="mb-4 flex items-center gap-2 text-lg font-semibold text-foreground">
                <AlertCircle className="h-5 w-5 text-accent" />
                Pending Requests
              </h3>
              {dashboard.pendingRequests.length > 0 ? (
                <div className="space-y-3">
                  {dashboard.pendingRequests.map((request) => (
                    <div
                      key={`${request.type}-${request.id}`}
                      className="flex items-center justify-between rounded-lg border border-border bg-background p-4 transition-colors hover:border-accent/50"
                    >
                      <div className="min-w-0 flex-1">
                        <p className="truncate font-medium text-foreground">
                          {request.name}
                        </p>
                        <p className="text-sm text-muted-foreground">
                          {request.type}
                        </p>
                      </div>
                      <p className="text-right text-xs text-muted-foreground">
                        {formatDate(request.createdAt)}
                      </p>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">
                  No pending requests.
                </p>
              )}
            </SurfaceCard>
          </div>
        </div>
      </div>
    </div>
  )
}
