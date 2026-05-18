"use client"

import { useEffect, useMemo, useState } from "react"
import {
  CalendarCheck,
  CheckCircle2,
  Clock,
  Loader2,
  LogOut,
  MapPin,
  ShieldCheck,
  XCircle,
} from "lucide-react"
import { toast } from "sonner"
import { MetricCard, PageIntro, StatusPill, SurfaceCard } from "@/components/powerhouse"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

type AttendanceStatus = "present" | "late" | "absent" | "half-day" | "not_marked"
type AttendanceAction = "check_in" | "check_out"

interface AttendanceDay {
  date: string
  day: number
  status: AttendanceStatus
  checkInTime: string | null
  checkOutTime: string | null
  workDuration: string | null
  isLate: boolean
  gpsVerified: boolean
}

interface AttendanceHistoryRow {
  id: string
  date: string
  checkInTime: string | null
  checkOutTime: string | null
  status: "present" | "late" | "half-day"
  isLate: boolean
  workDuration: string | null
  gpsVerified: boolean
}

interface AttendanceData {
  floorTiming: {
    start: string | null
    end: string | null
    startLabel: string | null
    endLabel: string | null
  }
  operatingWindows: Array<{
    key: string
    label: string
    windowLabel: string
  }>
  today: {
    checkedIn: boolean
    checkedOut: boolean
    status: AttendanceStatus
    checkInTime: string | null
    checkOutTime: string | null
    workDuration: string | null
    isLate: boolean
    gpsVerified: boolean
  }
  summary: {
    presentDays: number
    absentDays: number
    attendancePercent: number
    streak: number
    lateCheckIns: number
  }
  calendar: AttendanceDay[]
  history: AttendanceHistoryRow[]
}

const statusStyles = {
  present: "border-emerald-500/40 bg-emerald-500/15 text-emerald-300",
  late: "border-amber-500/40 bg-amber-500/15 text-amber-300",
  "half-day": "border-blue-500/40 bg-blue-500/15 text-blue-300",
  absent: "border-red-500/40 bg-red-500/15 text-red-300",
  not_marked: "border-border bg-secondary text-muted-foreground",
}

const dotStyles = {
  present: "bg-emerald-400",
  late: "bg-amber-400",
  "half-day": "bg-blue-400",
  absent: "bg-red-400",
  not_marked: "bg-muted-foreground/50",
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat("en-IN", { dateStyle: "medium" }).format(
    new Date(`${value}T00:00:00`)
  )
}

function formatTime(value: string | null) {
  if (!value) return "—"
  return new Intl.DateTimeFormat("en-IN", {
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date(value))
}

function statusLabel(status: AttendanceStatus | AttendanceHistoryRow["status"]) {
  if (status === "not_marked") return "Not Marked"
  if (status === "half-day") return "Half Day"
  return status.charAt(0).toUpperCase() + status.slice(1)
}

function statusTone(status: AttendanceStatus) {
  if (status === "present") return "success"
  if (status === "late") return "warning"
  if (status === "half-day") return "info"
  if (status === "absent") return "error"
  return "neutral"
}

function nextAction(today: AttendanceData["today"]): AttendanceAction | null {
  if (!today.checkedIn) return "check_in"
  if (!today.checkedOut) return "check_out"
  return null
}

function isWithinCheckInWindow(now = new Date()) {
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone: "Asia/Kolkata",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).formatToParts(now)
  const values = Object.fromEntries(parts.map((p) => [p.type, p.value]))
  const mins = Number(values.hour) * 60 + Number(values.minute)
  return (
    (mins >= 360 && mins <= 600) || (mins >= 960 && mins <= 1320)
  )
}

export default function TrainerAttendancePage() {
  const [attendance, setAttendance] = useState<AttendanceData | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [pendingAction, setPendingAction] = useState<AttendanceAction | null>(null)

  async function loadAttendance() {
    try {
      const response = await fetch("/api/trainer/attendance", {
        credentials: "include",
        cache: "no-store",
      })
      const result = await response.json()
      if (!response.ok || !result.success) {
        throw new Error(result.error || "Unable to load attendance")
      }
      setAttendance(result.data)
    } catch (error) {
      toast.error("Attendance unavailable", {
        description:
          error instanceof Error ? error.message : "Please refresh and try again.",
      })
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    loadAttendance()
  }, [])

  const activeAction = useMemo(
    () => (attendance ? nextAction(attendance.today) : null),
    [attendance]
  )

  const canCheckInNow =
    activeAction !== "check_in" || isWithinCheckInWindow()

  const handleAttendanceAction = () => {
    if (!activeAction) return
    if (!navigator.onLine) {
      toast.error("Offline mode", {
        description: "Connect to the internet before marking attendance.",
      })
      return
    }
    if (!navigator.geolocation) {
      toast.error("Location permission required")
      return
    }

    setPendingAction(activeAction)
    navigator.geolocation.getCurrentPosition(
      async (position) => {
        try {
          const response = await fetch("/api/trainer/attendance", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              "Idempotency-Key": crypto.randomUUID(),
            },
            credentials: "include",
            body: JSON.stringify({
              action: activeAction,
              latitude: position.coords.latitude,
              longitude: position.coords.longitude,
              clientTimestamp: new Date().toISOString(),
            }),
          })
          const result = await response.json()
          if (!response.ok || !result.success) {
            throw new Error(result.error || "Unable to mark attendance")
          }
          toast.success(
            activeAction === "check_in" ? "Checked in successfully" : "Checked out successfully"
          )
          await loadAttendance()
        } catch (error) {
          toast.error(activeAction === "check_in" ? "Check-in failed" : "Checkout failed", {
            description: error instanceof Error ? error.message : "Please try again.",
          })
        } finally {
          setPendingAction(null)
        }
      },
      () => {
        setPendingAction(null)
        toast.error("Location permission required")
      },
      { enableHighAccuracy: true, maximumAge: 0, timeout: 10000 }
    )
  }

  if (isLoading) {
    return (
      <AttendanceLayout>
        <div className="flex h-48 items-center justify-center rounded-xl border border-border bg-card">
          <Loader2 className="h-6 w-6 animate-spin text-primary" />
        </div>
      </AttendanceLayout>
    )
  }

  if (!attendance) {
    return (
      <AttendanceLayout>
        <SurfaceCard>
          <p className="text-sm text-muted-foreground">Attendance data is unavailable.</p>
        </SurfaceCard>
      </AttendanceLayout>
    )
  }

  const { today, operatingWindows } = attendance
  const description =
    operatingWindows.length > 0
      ? `Check-in windows: ${operatingWindows.map((w) => w.windowLabel).join(" · ")}`
      : "Check-in 6:00–10:00 AM · 4:00–10:00 PM"

  const buttonLabel = !activeAction
    ? today.checkedOut
      ? "Day complete"
      : "Already checked in"
    : activeAction === "check_in"
      ? canCheckInNow
        ? "Check In"
        : "Outside check-in hours"
      : "Check Out"

  return (
    <AttendanceLayout description={description}>
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="hidden sm:block" />
        <Button
          onClick={handleAttendanceAction}
          disabled={Boolean(pendingAction) || !activeAction || !canCheckInNow}
          className="h-11 w-full sm:w-auto"
        >
          {pendingAction ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Checking location...
            </>
          ) : activeAction === "check_out" ? (
            <>
              <LogOut className="mr-2 h-4 w-4" />
              {buttonLabel}
            </>
          ) : activeAction === "check_in" ? (
            <>
              <MapPin className="mr-2 h-4 w-4" />
              {buttonLabel}
            </>
          ) : (
            <>
              <CheckCircle2 className="mr-2 h-4 w-4" />
              {buttonLabel}
            </>
          )}
        </Button>
      </div>

      <SurfaceCard>
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <TodaySummary today={today} />
          <TodayTimes today={today} />
        </div>
      </SurfaceCard>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-5">
        <MetricCard label="Present Days" value={attendance.summary.presentDays} icon={CheckCircle2} accentColor="green" />
        <MetricCard label="Absent Days" value={attendance.summary.absentDays} icon={XCircle} accentColor="red" />
        <MetricCard label="Attendance" value={`${attendance.summary.attendancePercent}%`} subValue="this month" icon={CalendarCheck} accentColor="green" />
        <MetricCard label="Streak" value={attendance.summary.streak} subValue="days" icon={ShieldCheck} accentColor="red" />
        <MetricCard label="Late Check-ins" value={attendance.summary.lateCheckIns} icon={Clock} accentColor="amber" />
      </div>

      <SurfaceCard>
        <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-lg font-semibold text-foreground">Attendance Calendar</h2>
            <p className="text-sm text-muted-foreground">Current month</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <StatusPill status="success" label="Present" size="sm" />
            <StatusPill status="warning" label="Late" size="sm" />
            <StatusPill status="info" label="Half Day" size="sm" />
            <StatusPill status="error" label="Absent" size="sm" />
          </div>
        </div>
        <div className="mx-auto max-w-sm sm:max-w-md">
          <AttendanceCalendar days={attendance.calendar} />
        </div>
      </SurfaceCard>

      <SurfaceCard>
        <h2 className="mb-4 text-lg font-semibold text-foreground">Attendance History</h2>
        {attendance.history.length === 0 ? (
          <p className="text-sm text-muted-foreground">No attendance history for this month.</p>
        ) : (
          <div className="space-y-3">
            {attendance.history.map((row) => (
              <HistoryRow key={row.id} row={row} />
            ))}
          </div>
        )}
      </SurfaceCard>
    </AttendanceLayout>
  )
}

function AttendanceLayout({
  children,
  description = "Mark and review your own attendance",
}: {
  children: React.ReactNode
  description?: string
}) {
  return (
    <div className="space-y-5">
      <PageIntro title="My Attendance" description={description} />
      {children}
    </div>
  )
}

function TodaySummary({ today }: { today: AttendanceData["today"] }) {
  return (
    <div>
      <div className="mb-2 flex flex-wrap items-center gap-2">
        <StatusPill status={statusTone(today.status)} label={statusLabel(today.status)} />
        {today.isLate && (
          <span className="rounded-full bg-amber-500/15 px-2 py-0.5 text-[10px] font-semibold text-amber-400">
            Late
          </span>
        )}
      </div>
      <p className="text-sm text-muted-foreground">
        {today.checkedIn
          ? `Checked in at ${formatTime(today.checkInTime)}`
          : "Not checked in yet today"}
      </p>
      {today.checkedOut && today.workDuration && (
        <p className="mt-1 text-sm font-semibold text-foreground">
          Worked {today.workDuration}
        </p>
      )}
    </div>
  )
}

function TodayTimes({ today }: { today: AttendanceData["today"] }) {
  return (
    <div className="grid grid-cols-2 gap-6">
      <div>
        <p className="text-xs text-muted-foreground">IN</p>
        <p className="text-sm font-semibold text-foreground">{formatTime(today.checkInTime)}</p>
      </div>
      <TodayTimesOut today={today} />
    </div>
  )
}

function TodayTimesOut({ today }: { today: AttendanceData["today"] }) {
  return (
    <div>
      <p className="text-xs text-muted-foreground">OUT</p>
      <p className="text-sm font-semibold text-foreground">{formatTime(today.checkOutTime)}</p>
    </div>
  )
}

function AttendanceCalendar({ days }: { days: AttendanceDay[] }) {
  return (
    <div className="grid grid-cols-7 gap-1">
      {days.map((day) => (
        <div
          key={day.date}
          className={cn(
            "flex h-8 flex-col items-center justify-center rounded-md border text-[11px] font-semibold leading-none",
            statusStyles[day.status]
          )}
          title={`${formatDate(day.date)} - ${statusLabel(day.status)}`}
        >
          <span>{day.day}</span>
          <span className={cn("mt-1 h-1 w-1 rounded-full", dotStyles[day.status])} />
        </div>
      ))}
    </div>
  )
}

function HistoryRow({ row }: { row: AttendanceHistoryRow }) {
  return (
    <div className="grid gap-3 rounded-lg border border-border bg-background p-3 sm:grid-cols-[1fr_1fr_1fr_auto] sm:items-center">
      <div>
        <p className="text-sm font-medium text-foreground">{formatDate(row.date)}</p>
        {row.workDuration && (
          <p className="text-xs text-muted-foreground">Worked {row.workDuration}</p>
        )}
      </div>
      <div>
        <p className="text-sm font-medium text-foreground">{formatTime(row.checkInTime)}</p>
        <p className="text-xs text-muted-foreground">Check-in</p>
      </div>
      <div>
        <p className="text-sm font-medium text-foreground">{formatTime(row.checkOutTime)}</p>
        <p className="text-xs text-muted-foreground">Checkout</p>
      </div>
      <StatusPill
        status={row.status === "late" ? "warning" : row.status === "half-day" ? "info" : "success"}
        label={statusLabel(row.status)}
        size="sm"
      />
    </div>
  )
}
