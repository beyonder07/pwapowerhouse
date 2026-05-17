"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { toast } from "sonner"
import { CalendarCheck, Loader2, MapPin, ShieldCheck } from "lucide-react"
import { Button } from "@/components/ui/button"
import { PageIntro, StatusPill, SurfaceCard } from "@/components/powerhouse"
import { AttendanceCheckIn } from "@/components/attendance/attendance-check-in"

interface AttendanceData {
  needsGymAssignment?: boolean
  gym: {
    name: string
    radius: number
  } | null
  membership: {
    status: "active" | "expired"
    endDate: string
    daysRemaining: number
  } | null
  todayAttendance: {
    checkedIn: boolean
    checkedInAt: string | null
    checkedOut?: boolean
    checkedOutAt?: string | null
    status?: string
  }
  streak: number
}

function formatDateTime(value?: string | null) {
  if (!value) return "Not checked in today"
  return new Intl.DateTimeFormat("en-IN", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value))
}

export default function ClientAttendancePage() {
  const [data, setData] = useState<AttendanceData | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [loadFailed, setLoadFailed] = useState(false)

  async function loadAttendance() {
    const response = await fetch("/api/client/dashboard", {
      credentials: "include",
      cache: "no-store",
    })
    const result = await response.json()

    if (!response.ok || !result.success) {
      throw new Error(result.error || "Unable to load attendance")
    }

    setData(result.data)
    setLoadFailed(false)
  }

  useEffect(() => {
    let mounted = true

    loadAttendance()
      .catch((error) => {
        if (!mounted) return
        setLoadFailed(true)
        toast.error("Attendance unavailable", {
          description:
            error instanceof Error ? error.message : "Please refresh the page.",
        })
      })
      .finally(() => {
        if (mounted) setIsLoading(false)
      })

    return () => {
      mounted = false
    }
  }, [])

  if (isLoading) {
    return (
      <SurfaceCard>
        <div className="flex min-h-40 items-center justify-center">
          <Loader2 className="h-6 w-6 animate-spin text-primary" />
        </div>
      </SurfaceCard>
    )
  }

  if (loadFailed || !data) {
    return (
      <div className="space-y-6">
        <PageIntro
          title="Attendance"
          subtitle="Mark your gym attendance using secure GPS verification"
        />
        <SurfaceCard className="text-center">
          <p className="text-muted-foreground">Could not load attendance data.</p>
          <Button className="mt-4" onClick={() => { setIsLoading(true); void loadAttendance().finally(() => setIsLoading(false)) }}>
            Retry
          </Button>
        </SurfaceCard>
      </div>
    )
  }

  if (data.needsGymAssignment) {
    return (
      <div className="space-y-6">
        <PageIntro title="Attendance" subtitle="Assign your branch before checking in" />
        <SurfaceCard className="text-center space-y-4">
          <p className="text-muted-foreground">
            Choose your gym branch in Settings to enable GPS check-in.
          </p>
          <Button asChild>
            <Link href="/client/settings">Go to Settings</Link>
          </Button>
        </SurfaceCard>
      </div>
    )
  }

  const checkedIn = data.todayAttendance.checkedIn
  const checkedOut = data.todayAttendance.checkedOut ?? false

  return (
    <div className="space-y-6">
      <PageIntro
        title="Attendance"
        subtitle="Mark your gym attendance using secure GPS verification"
      />

      <SurfaceCard glow>
        <div className="space-y-5">
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="text-xl font-semibold text-foreground">Today&apos;s Session</h2>
            <StatusPill status={checkedOut ? "success" : checkedIn ? "warning" : "pending"}>
              {checkedOut ? "Completed" : checkedIn ? "Checked In" : "Pending"}
            </StatusPill>
          </div>
          <p className="text-sm text-muted-foreground">
            {formatDateTime(data.todayAttendance.checkedInAt)}
          </p>
          <AttendanceCheckIn
            gymRadius={data.gym?.radius ?? 150}
            isCheckedIn={checkedIn}
            isCheckedOut={checkedOut}
            onSuccess={loadAttendance}
          />
        </div>
      </SurfaceCard>

      <div className="grid gap-4 md:grid-cols-3">
        <SurfaceCard>
          <MapPin className="mb-3 h-5 w-5 text-primary" />
          <p className="text-sm text-muted-foreground">Assigned Branch</p>
          <p className="mt-1 font-semibold text-foreground">{data.gym?.name ?? "Not assigned"}</p>
          <p className="mt-1 text-xs text-muted-foreground">Radius: {data.gym?.radius ?? 150} meters</p>
        </SurfaceCard>
        <SurfaceCard>
          <ShieldCheck className="mb-3 h-5 w-5 text-primary" />
          <p className="text-sm text-muted-foreground">Membership</p>
          <p className="mt-1 font-semibold text-foreground">{data.membership?.status ?? "expired"}</p>
          <p className="mt-1 text-xs text-muted-foreground">
            {data.membership ? `${data.membership.daysRemaining} days remaining` : "No active plan"}
          </p>
        </SurfaceCard>
        <SurfaceCard>
          <CalendarCheck className="mb-3 h-5 w-5 text-primary" />
          <p className="text-sm text-muted-foreground">Current Streak</p>
          <p className="mt-1 font-semibold text-foreground">
            {data.streak ?? 0} day{data.streak === 1 ? "" : "s"}
          </p>
        </SurfaceCard>
      </div>

      <SurfaceCard>
        <h2 className="mb-2 text-lg font-semibold text-foreground">Check-In Rules</h2>
        <div className="grid gap-3 text-sm text-muted-foreground md:grid-cols-3">
          <p>Active membership and branch assignment are verified server-side.</p>
          <p>GPS distance is calculated against your assigned branch.</p>
          <p>Check out when you leave to complete your session.</p>
        </div>
      </SurfaceCard>
    </div>
  )
}
