"use client"

import { useEffect, useMemo, useState } from "react"
import {
  CalendarCheck,
  CheckCircle2,
  Clock,
  Loader2,
  LogIn,
  LogOut,
  MapPin,
  ShieldCheck,
  XCircle,
} from "lucide-react"
import { toast } from "sonner"
import { MetricCard, PageIntro, StatusPill, SurfaceCard } from "@/components/powerhouse"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

type AttendanceStatus = "present" | "late" | "absent" | "not_marked"
type SessionKey = "morning" | "evening"
type SessionAction = "check_in" | "check_out"

interface AttendanceSession {
  key: SessionKey
  label: string
  windowLabel: string
  lateAfterLabel: string
  status: AttendanceStatus
  checkInTime: string | null
  checkOutTime: string | null
  gpsVerified: boolean
}

interface AttendanceDay {
  date: string
  day: number
  status: AttendanceStatus
  checkInTime: string | null
  checkOutTime: string | null
  gpsVerified: boolean
  sessions: AttendanceSession[]
}

interface AttendanceHistoryRow {
  id: string
  date: string
  session: SessionKey
  sessionLabel: string
  windowLabel: string
  checkInTime: string | null
  checkOutTime: string | null
  status: "present" | "late"
  gpsVerified: boolean
}

interface AttendanceData {
  today: {
    checkedIn: boolean
    status: AttendanceStatus
    checkInTime: string | null
    checkOutTime: string | null
    sessions: AttendanceSession[]
    currentSession: AttendanceSession | null
  }
  summary: {
    presentDays: number
    absentDays: number
    attendancePercent: number
    streak: number
    lateCheckIns: number
    completedSessions?: number
    totalSessions?: number
  }
  calendar: AttendanceDay[]
  history: AttendanceHistoryRow[]
}

const statusStyles = {
  present: "border-emerald-500/40 bg-emerald-500/15 text-emerald-300",
  late: "border-amber-500/40 bg-amber-500/15 text-amber-300",
  absent: "border-red-500/40 bg-red-500/15 text-red-300",
  not_marked: "border-border bg-secondary text-muted-foreground",
}

const dotStyles = {
  present: "bg-emerald-400",
  late: "bg-amber-400",
  absent: "bg-red-400",
  not_marked: "bg-muted-foreground/50",
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat("en-IN", {
    dateStyle: "medium",
  }).format(new Date(`${value}T00:00:00`))
}

function formatTime(value: string | null) {
  if (!value) return "Not marked"
  return new Intl.DateTimeFormat("en-IN", {
    hour: "numeric",
    minute: "2-digit",
    second: "2-digit",
  }).format(new Date(value))
}

function statusLabel(status: AttendanceStatus | AttendanceHistoryRow["status"]) {
  if (status === "not_marked") return "Not Marked"
  return status.charAt(0).toUpperCase() + status.slice(1)
}

function statusTone(status: AttendanceStatus) {
  if (status === "present") return "success"
  if (status === "late") return "warning"
  if (status === "absent") return "error"
  return "neutral"
}

function nextSessionAction(session: AttendanceSession | null): SessionAction | null {
  if (!session) return null
  if (!session.checkInTime) return "check_in"
  if (!session.checkOutTime) return "check_out"
  return null
}

export default function TrainerAttendancePage() {
  const [attendance, setAttendance] = useState<AttendanceData | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [pendingAction, setPendingAction] = useState<SessionAction | null>(null)

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

  const activeSession = attendance?.today.currentSession ?? null
  const activeAction = useMemo(
    () => nextSessionAction(activeSession),
    [activeSession]
  )

  const submitAttendance = async (
    coords: GeolocationCoordinates,
    session: AttendanceSession,
    action: SessionAction
  ) => {
    const response = await fetch("/api/trainer/attendance", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Idempotency-Key": crypto.randomUUID(),
      },
      credentials: "include",
      body: JSON.stringify({
        session: session.key,
        action,
        latitude: coords.latitude,
        longitude: coords.longitude,
        clientTimestamp: new Date().toISOString(),
      }),
    })
    const result = await response.json()

    if (!response.ok || !result.success) {
      throw new Error(result.error || "Unable to mark attendance")
    }

    return result.data
  }

  const handleAttendanceAction = () => {
    if (!activeSession || !activeAction) {
      toast.info("Outside session hours", {
        description: "Attendance opens at 5:00 AM and 4:00 PM.",
      })
      return
    }

    if (!navigator.onLine) {
      toast.error("Offline mode", {
        description: "Connect to the internet before marking attendance.",
      })
      return
    }

    if (!navigator.geolocation) {
      toast.error("Location permission required", {
        description: "This device does not support location services.",
      })
      return
    }

    setPendingAction(activeAction)
    navigator.geolocation.getCurrentPosition(
      async (position) => {
        try {
          await submitAttendance(position.coords, activeSession, activeAction)
          toast.success(
            activeAction === "check_in"
              ? "Attendance marked successfully"
              : "Checkout time stored"
          )
          await loadAttendance()
        } catch (error) {
          toast.error(
            activeAction === "check_in" ? "Check-in failed" : "Checkout failed",
            {
              description:
                error instanceof Error
                  ? error.message
                  : "Please try again from inside the gym.",
            }
          )
        } finally {
          setPendingAction(null)
        }
      },
      () => {
        setPendingAction(null)
        toast.error("Location permission required", {
          description: "Allow location access to verify you are at the gym.",
        })
      },
      {
        enableHighAccuracy: true,
        maximumAge: 0,
        timeout: 10000,
      }
    )
  }

  if (isLoading) {
    return (
      <div className="space-y-5">
        <PageIntro
          title="My Attendance"
          description="Mark and review your own attendance"
        />
        <div className="flex h-48 items-center justify-center rounded-xl border border-border bg-card">
          <Loader2 className="h-6 w-6 animate-spin text-primary" />
        </div>
      </div>
    )
  }

  if (!attendance) {
    return (
      <div className="space-y-5">
        <PageIntro
          title="My Attendance"
          description="Mark and review your own attendance"
        />
        <SurfaceCard>
          <p className="text-sm text-muted-foreground">
            Attendance data is unavailable right now.
          </p>
        </SurfaceCard>
      </div>
    )
  }

  const primaryButtonLabel = !activeSession
    ? "Outside session hours"
    : !activeAction
      ? `${activeSession.label} complete`
      : activeAction === "check_in"
        ? `${activeSession.label} Check In`
        : `${activeSession.label} Check Out`

  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <PageIntro
          title="My Attendance"
          description="Morning 5:00-11:00, evening 4:00-10:00"
        />
        <Button
          onClick={handleAttendanceAction}
          disabled={Boolean(pendingAction) || !activeAction}
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
              {primaryButtonLabel}
            </>
          ) : activeAction === "check_in" ? (
            <>
              <MapPin className="mr-2 h-4 w-4" />
              {primaryButtonLabel}
            </>
          ) : (
            <>
              <CheckCircle2 className="mr-2 h-4 w-4" />
              {primaryButtonLabel}
            </>
          )}
        </Button>
      </div>

      <div className="grid gap-3 md:grid-cols-2">
        {attendance.today.sessions.map((session) => (
          <div
            key={session.key}
            className="rounded-lg border border-border bg-card p-4"
          >
            <div className="flex items-start justify-between gap-3">
              <div>
                <h2 className="text-base font-semibold text-foreground">
                  {session.label}
                </h2>
                <p className="text-xs text-muted-foreground">
                  {session.windowLabel} · Late after {session.lateAfterLabel}
                </p>
              </div>
              <StatusPill
                status={statusTone(session.status)}
                label={statusLabel(session.status)}
                size="sm"
              />
            </div>
            <div className="mt-4 grid grid-cols-2 gap-3">
              <div>
                <p className="text-xs text-muted-foreground">Check-in</p>
                <p className="mt-1 text-sm font-semibold text-foreground">
                  {formatTime(session.checkInTime)}
                </p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Checkout</p>
                <p className="mt-1 text-sm font-semibold text-foreground">
                  {formatTime(session.checkOutTime)}
                </p>
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-5">
        <MetricCard
          label="Present Days"
          value={attendance.summary.presentDays}
          icon={CheckCircle2}
          accentColor="green"
        />
        <MetricCard
          label="Absent Days"
          value={attendance.summary.absentDays}
          icon={XCircle}
          accentColor="red"
        />
        <MetricCard
          label="Attendance"
          value={`${attendance.summary.attendancePercent}%`}
          subValue={
            attendance.summary.totalSessions
              ? `${attendance.summary.completedSessions ?? 0}/${attendance.summary.totalSessions} sessions`
              : "sessions"
          }
          icon={CalendarCheck}
          accentColor="green"
        />
        <MetricCard
          label="Streak"
          value={attendance.summary.streak}
          subValue="days"
          icon={ShieldCheck}
          accentColor="red"
        />
        <MetricCard
          label="Late Check-ins"
          value={attendance.summary.lateCheckIns}
          icon={Clock}
          accentColor="amber"
        />
      </div>

      <SurfaceCard>
        <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-lg font-semibold text-foreground">
              Attendance Calendar
            </h2>
            <p className="text-sm text-muted-foreground">
              Compact current month view.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <StatusPill status="success" label="Present" size="sm" />
            <StatusPill status="warning" label="Late" size="sm" />
            <StatusPill status="error" label="Absent" size="sm" />
            <StatusPill status="neutral" label="Not Marked" size="sm" />
          </div>
        </div>

        <div className="mx-auto max-w-sm sm:max-w-md">
          <div className="grid grid-cols-7 gap-1">
            {attendance.calendar.map((day) => (
              <div
                key={day.date}
                className={cn(
                  "flex h-8 flex-col items-center justify-center rounded-md border text-[11px] font-semibold leading-none",
                  statusStyles[day.status]
                )}
                title={`${formatDate(day.date)} - ${statusLabel(day.status)}`}
              >
                <span>{day.day}</span>
                <span
                  className={cn(
                    "mt-1 h-1 w-1 rounded-full",
                    dotStyles[day.status]
                  )}
                />
              </div>
            ))}
          </div>
        </div>
      </SurfaceCard>

      <SurfaceCard>
        <h2 className="mb-4 text-lg font-semibold text-foreground">
          Attendance History
        </h2>
        {attendance.history.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            No attendance history for this month.
          </p>
        ) : (
          <div className="space-y-3">
            {attendance.history.map((row) => (
              <div
                key={row.id}
                className="grid gap-3 rounded-lg border border-border bg-background p-3 sm:grid-cols-[1fr_1fr_1fr_auto_auto] sm:items-center"
              >
                <div>
                  <p className="text-sm font-medium text-foreground">
                    {formatDate(row.date)}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {row.sessionLabel}
                  </p>
                </div>
                <div>
                  <p className="text-sm font-medium text-foreground">
                    {formatTime(row.checkInTime)}
                  </p>
                  <p className="text-xs text-muted-foreground">Check-in</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-foreground">
                    {formatTime(row.checkOutTime)}
                  </p>
                  <p className="text-xs text-muted-foreground">Checkout</p>
                </div>
                <StatusPill
                  status={row.status === "late" ? "warning" : "success"}
                  label={statusLabel(row.status)}
                  size="sm"
                />
                <StatusPill
                  status={row.gpsVerified ? "info" : "neutral"}
                  label={row.gpsVerified ? "GPS verified" : "Manual"}
                  size="sm"
                />
              </div>
            ))}
          </div>
        )}
      </SurfaceCard>
    </div>
  )
}
