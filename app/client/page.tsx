"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import {
  CalendarCheck,
  CalendarDays,
  Target,
  Trophy,
  TrendingUp,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { MetricCard, SurfaceCard } from "@/components/powerhouse"
import { AttendanceCalendar } from "@/components/attendance/attendance-calendar"
import { toast } from "sonner"
import { AttendanceCheckIn } from "@/components/attendance/attendance-check-in"
import { format } from "date-fns"

interface DashboardData {
  needsGymAssignment?: boolean
  user: {
    name: string
    gymId: string | null
  }
  gym: {
    name: string
    radius: number
  } | null
  membership: {
    status: string
    startDate: string
    endDate: string
    daysRemaining: number
  } | null
  todayAttendance: {
    checkedIn: boolean
    checkedInAt?: string
    checkedOut: boolean
    checkedOutAt?: string
    status: string
  }
  streak: number
  recentPayments: Array<{
    id: string
    amount: number
    status: string
    createdAt: string
  }>
}

export default function ClientDashboard() {
  const [dashboard, setDashboard] = useState<DashboardData | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  async function loadDashboard() {
    try {
      const response = await fetch("/api/client/dashboard", {
        credentials: "include",
        cache: "no-store",
      })
      const result = await response.json()

      if (!response.ok || !result.success) {
        throw new Error(result.error || "Unable to load dashboard")
      }

      setDashboard(result.data)
    } catch (error) {
      toast.error("Dashboard unavailable", {
        description: error instanceof Error ? error.message : "Please try again later.",
      })
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    loadDashboard()
  }, [])

  if (isLoading) {
    return (
      <div className="flex-1 animate-pulse space-y-6">
        <div className="h-8 w-48 bg-muted rounded-lg" />
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-32 bg-muted rounded-xl" />
          ))}
        </div>
      </div>
    )
  }

  if (!dashboard) {
    return (
      <div className="flex-1 flex items-center justify-center text-muted-foreground p-6 text-center border-2 border-dashed border-border rounded-2xl">
        <div className="space-y-4">
          <p className="text-lg font-medium text-foreground">Client Dashboard</p>
          <p>Your data could not be loaded</p>
          <SurfaceCard className="max-w-md mx-auto">
            <p className="text-sm">Refresh the page after your account and membership are configured.</p>
          </SurfaceCard>
          <Button variant="outline" onClick={() => { setIsLoading(true); void loadDashboard() }}>
            Retry
          </Button>
        </div>
      </div>
    )
  }

  if (dashboard.needsGymAssignment) {
    return (
      <div className="flex-1 space-y-6 pb-10">
        <div className="space-y-1">
          <h1 className="text-3xl font-bold tracking-tight">Welcome, {dashboard.user.name}</h1>
          <p className="text-muted-foreground">Complete setup to unlock your dashboard</p>
        </div>
        <SurfaceCard className="max-w-lg space-y-4">
          <p className="text-sm text-muted-foreground">
            Assign your gym branch in Settings to view membership, attendance, and payments.
          </p>
          <Button asChild>
            <Link href="/client/settings">Assign Branch in Settings</Link>
          </Button>
        </SurfaceCard>
      </div>
    )
  }

  if (!dashboard.gym) {
    return null
  }

  const formatTime = (iso?: string) => {
    if (!iso) return ""
    return format(new Date(iso), "h:mm a")
  }

  const attendanceStatus = dashboard.todayAttendance.checkedOut 
    ? "Completed" 
    : dashboard.todayAttendance.checkedIn 
      ? "Checked in" 
      : "Not marked"

  const attendanceSubValue = dashboard.todayAttendance.checkedOut
    ? `Out: ${formatTime(dashboard.todayAttendance.checkedOutAt)}`
    : dashboard.todayAttendance.checkedIn
      ? `In: ${formatTime(dashboard.todayAttendance.checkedInAt)}`
      : "No activity yet"

  // Anti-Gravity: Clean up display name
  const gymName = dashboard.gym.name.toLowerCase().includes("branch") 
    ? dashboard.gym.name 
    : `${dashboard.gym.name} Branch`

  return (
    <div className="flex-1 overflow-y-auto pb-10">
      <div className="max-w-6xl space-y-8">
        {/* Welcome Section */}
        <div className="space-y-1">
          <h1 className="text-3xl font-bold tracking-tight text-foreground">
            Welcome, {dashboard.user.name}
          </h1>
          <p className="text-muted-foreground flex items-center gap-2">
            <span className="inline-block w-2 h-2 rounded-full bg-emerald-500" />
            {gymName}
          </p>
        </div>

        {/* Quick Stats Grid */}
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
          <MetricCard
            label="Membership"
            value={dashboard.membership?.status === "active" ? "Active" : "No Plan"}
            subValue={dashboard.membership ? `${dashboard.membership.daysRemaining} days remaining` : "Contact branch"}
            icon={Target}
            accentColor={dashboard.membership?.status === "active" ? "green" : "red"}
          />
          <MetricCard
            label="Attendance Today"
            value={attendanceStatus}
            subValue={attendanceSubValue}
            icon={CalendarCheck}
            accentColor={dashboard.todayAttendance.checkedOut ? "amber" : dashboard.todayAttendance.checkedIn ? "green" : "default"}
          />
          <MetricCard
            label="Current Streak"
            value={`${dashboard.streak} day${dashboard.streak === 1 ? "" : "s"}`}
            subValue="Based on consecutive check-ins"
            icon={Trophy}
            accentColor="default"
          />
          <MetricCard
            label="Gym Radius"
            value={`${dashboard.gym.radius} m`}
            subValue="GPS check-in boundary"
            icon={TrendingUp}
            accentColor="default"
          />
        </div>

        {/* Main Action Area */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-3">
            <AttendanceCheckIn 
              gymRadius={dashboard.gym.radius}
              isCheckedIn={dashboard.todayAttendance.checkedIn}
              isCheckedOut={dashboard.todayAttendance.checkedOut}
              onSuccess={loadDashboard}
            />
          </div>

          <div className="lg:col-span-2 space-y-6">
            <SurfaceCard className="p-0 overflow-hidden">
              <div className="p-6 border-b border-border flex items-center justify-between">
                <div className="space-y-1">
                  <h3 className="text-lg font-semibold flex items-center gap-2">
                    <CalendarDays className="h-5 w-5 text-emerald-500" />
                    Membership Tracking
                  </h3>
                  <p className="text-sm text-muted-foreground">Your current plan and renewal window.</p>
                </div>
                <div className={cn(
                  "px-2.5 py-0.5 rounded-full text-xs font-medium border capitalize",
                  dashboard.membership?.status === "active" 
                    ? "bg-emerald-500/10 text-emerald-500 border-emerald-500/20" 
                    : "bg-red-500/10 text-red-500 border-red-500/20"
                )}>
                  {dashboard.membership?.status ?? "Inactive"}
                </div>
              </div>
              <div className="p-6 space-y-4">
                <div className="grid grid-cols-2 gap-y-4 text-sm">
                  <span className="text-muted-foreground uppercase text-[10px] font-bold tracking-wider">Start Date</span>
                  <span className="text-right font-medium">{dashboard.membership ? format(new Date(dashboard.membership.startDate), "d MMM yyyy") : "-"}</span>
                  <span className="text-muted-foreground uppercase text-[10px] font-bold tracking-wider">End Date</span>
                  <span className="text-right font-medium">{dashboard.membership ? format(new Date(dashboard.membership.endDate), "d MMM yyyy") : "-"}</span>
                  <div className="col-span-2 h-px bg-border my-2" />
                  <span className="text-muted-foreground uppercase text-[10px] font-bold tracking-wider">Days Left</span>
                  <span className={cn(
                    "text-right font-bold text-lg", 
                    dashboard.membership?.daysRemaining && dashboard.membership.daysRemaining < 7 ? "text-red-500" : "text-emerald-500"
                  )}>
                    {dashboard.membership?.daysRemaining ?? 0}
                  </span>
                </div>
              </div>
            </SurfaceCard>
          </div>

          <div className="lg:col-span-1">
            <AttendanceCalendar streak={dashboard.streak} />
          </div>
        </div>
      </div>
    </div>
  )
}

function cn(...classes: any[]) {
  return classes.filter(Boolean).join(" ")
}
