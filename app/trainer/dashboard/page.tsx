"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import {
  CalendarCheck,
  Dumbbell,
  IndianRupee,
  Loader2,
  UserRoundCheck,
  Users,
  BarChart2,
} from "lucide-react"
import { toast } from "sonner"
import { MetricCard, PageIntro, StatusPill, SurfaceCard } from "@/components/powerhouse"
import { Button } from "@/components/ui/button"
import { OperationalProfileDrawer } from "@/components/trainer/operational-profile-drawer"

interface TrainerDashboardData {
  summary: {
    totalMembers: number
    presentToday: number
    inactiveMembers: number
    workoutPlansPending: number
    salaryStatus: "paid" | "processing" | "pending"
  }
  attendance: {
    checkedInToday: boolean
    todayStatus: string
  }
  activity: Array<{
    label: string
    tone: "success" | "warning" | "error"
  }>
}

function salaryTone(status: TrainerDashboardData["summary"]["salaryStatus"]) {
  if (status === "paid") return "success"
  if (status === "processing") return "warning"
  return "error"
}

export default function TrainerDashboardPage() {
  const [dashboard, setDashboard] = useState<TrainerDashboardData | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [showProfile, setShowProfile] = useState(false)

  useEffect(() => {
    let mounted = true

    async function loadDashboard() {
      try {
        const response = await fetch("/api/trainer/dashboard", {
          credentials: "include",
          cache: "no-store",
        })
        const result = await response.json()

        if (!response.ok || !result.success) {
          throw new Error(result.error || "Unable to load dashboard")
        }

        if (mounted) setDashboard(result.data)
      } catch (error) {
        toast.error("Dashboard unavailable", {
          description:
            error instanceof Error
              ? error.message
              : "Please refresh and try again.",
        })
      } finally {
        if (mounted) setIsLoading(false)
      }
    }

    loadDashboard()

    return () => {
      mounted = false
    }
  }, [])

  if (isLoading) {
    return (
      <div className="space-y-5">
        <PageIntro
          title="Trainer Dashboard"
          description="Daily coaching overview and member follow-ups"
        />
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-5">
          {Array.from({ length: 5 }).map((_, index) => (
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
      <div className="space-y-5">
        <PageIntro
          title="Trainer Dashboard"
          description="Daily coaching overview and member follow-ups"
        />
        <SurfaceCard>
          <p className="text-sm text-muted-foreground">
            Dashboard data is unavailable right now.
          </p>
        </SurfaceCard>
      </div>
    )
  }

  return (
    <div className="space-y-5">
      <PageIntro
        title="Trainer Dashboard"
        description="Daily coaching overview and member follow-ups"
      />

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-5">
        <MetricCard
          label="Total Members"
          value={dashboard.summary.totalMembers}
          icon={Users}
          accentColor="red"
        />
        <MetricCard
          label="Present Today"
          value={dashboard.summary.presentToday}
          icon={UserRoundCheck}
          accentColor="green"
        />
        <MetricCard
          label="Inactive"
          value={dashboard.summary.inactiveMembers}
          subValue="Needs follow-up"
          icon={CalendarCheck}
          accentColor="amber"
        />
        <MetricCard
          label="Plans Pending"
          value={dashboard.summary.workoutPlansPending}
          subValue="Workout updates"
          icon={Dumbbell}
          accentColor="amber"
        />
        <MetricCard
          label="Salary Status"
          value={dashboard.summary.salaryStatus}
          icon={IndianRupee}
          accentColor={dashboard.summary.salaryStatus === "paid" ? "green" : "amber"}
        />
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <SurfaceCard className="lg:col-span-2">
          <div className="mb-4 flex items-center justify-between gap-3">
            <div>
              <h2 className="text-lg font-semibold text-foreground">
                Today's Member Activity
              </h2>
              <p className="text-sm text-muted-foreground">
                Quick signals for coaching follow-up.
              </p>
            </div>
            <StatusPill
              status={dashboard.attendance.checkedInToday ? "success" : "warning"}
              label={
                dashboard.attendance.checkedInToday
                  ? "Checked in"
                  : "Attendance pending"
              }
            />
          </div>

          <div className="space-y-3">
            {dashboard.activity.map((item) => (
              <div
                key={item.label}
                className="flex items-center justify-between rounded-lg border border-border bg-background p-3"
              >
                <p className="text-sm font-medium text-foreground">{item.label}</p>
                <StatusPill
                  status={
                    item.tone === "success"
                      ? "success"
                      : item.tone === "warning"
                        ? "warning"
                        : "error"
                  }
                  label={item.tone === "success" ? "Clear" : "Review"}
                  size="sm"
                />
              </div>
            ))}
          </div>
        </SurfaceCard>

        <SurfaceCard>
          <h2 className="mb-4 text-lg font-semibold text-foreground">
            Quick Actions
          </h2>
          <div className="space-y-3">
            <Button asChild className="h-11 w-full justify-start">
              <Link href="/trainer/members">
                <Users className="mr-2 h-4 w-4" />
                Open Members
              </Link>
            </Button>
            <Button asChild variant="outline" className="h-11 w-full justify-start">
              <Link href="/trainer/attendance">
                <CalendarCheck className="mr-2 h-4 w-4" />
                Mark My Attendance
              </Link>
            </Button>
            <Button asChild variant="outline" className="h-11 w-full justify-start">
              <Link href="/trainer/workouts">
                <Dumbbell className="mr-2 h-4 w-4" />
                Update Workout Plans
              </Link>
            </Button>
            <Button
              variant="outline"
              className="h-11 w-full justify-start"
              onClick={() => setShowProfile(true)}
            >
              <BarChart2 className="mr-2 h-4 w-4" />
              View My Operational Profile
            </Button>
          </div>
        </SurfaceCard>
      </div>

      {showProfile && <OperationalProfileDrawer onClose={() => setShowProfile(false)} />}
    </div>
  )
}
