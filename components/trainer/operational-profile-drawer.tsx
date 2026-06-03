"use client"

import { useEffect, useState } from "react"
import {
  AlertCircle,
  Clock,
  Shield,
  TrendingUp,
  Users,
  X,
  Loader2,
} from "lucide-react"
import { toast } from "sonner"
import { StatusPill } from "@/components/powerhouse"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"

interface CalendarDay {
  date: string
  status: "present" | "late" | "absent" | "half-day"
  checkInTime: string | null
  checkOutTime: string | null
  workDuration: string | null
  isLate: boolean
}

interface OperationalProfile {
  id: string
  name: string
  email: string | null
  phone: string | null
  avatarUrl: string | null
  specialization: string | null
  experience: string | null
  govtIdUrl: string | null
  govtIdType: string | null
  joinDate: string
  floorTiming: {
    startTime: string | null
    endTime: string | null
    startLabel: string | null
    endLabel: string | null
  }
  attendance: {
    presentDays: number
    absentDays: number
    lateDays: number
    halfDays: number
    workingDays: number
    attendanceRate: number
    checkedInToday: boolean
    consecutiveAbsences: number
    totalHoursWorked: string | null
    avgCheckIn: string | null
    avgCheckOut: string | null
    calendar: CalendarDay[]
    insights: string[]
  }
  clients: Array<{ id: string; name: string; planStatus: string }>
}

function initials(n: string) {
  return n.split(" ").filter(Boolean).slice(0, 2).map(p => p[0]?.toUpperCase()).join("")
}

function formatDate(v: string) {
  return new Intl.DateTimeFormat("en-IN", { dateStyle: "medium" }).format(new Date(v))
}

function planTone(s: string) {
  return s === "active" ? "success" : s === "pending" ? "warning" : "neutral" as any
}

function CalendarGrid({ calendar }: { calendar: CalendarDay[] }) {
  const [selected, setSelected] = useState<CalendarDay | null>(calendar[calendar.length - 1] ?? null)

  const getColor = (status: string) => {
    switch (status) {
      case "present": return "bg-emerald-500 hover:bg-emerald-400 border-emerald-600"
      case "late": return "bg-amber-500 hover:bg-amber-400 border-amber-600"
      case "half-day": return "bg-blue-500 hover:bg-blue-400 border-blue-600"
      case "absent": return "bg-red-500/20 hover:bg-red-500/40 border-red-500/30"
      default: return "bg-muted"
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-1.5">
        {calendar.map(day => {
          const isSelected = selected?.date === day.date
          return (
            <button
              key={day.date}
              onClick={() => setSelected(day)}
              className={`h-7 w-7 rounded-md border text-[10px] font-bold text-white transition-all ${getColor(day.status)} ${isSelected ? "ring-2 ring-primary ring-offset-1 ring-offset-card" : ""}`}
            >
              {parseInt(day.date.split("-")[2]!)}
            </button>
          )
        })}
      </div>

      <div className="flex flex-wrap gap-x-4 gap-y-2 text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
        <div className="flex items-center gap-1.5"><div className="h-2 w-2 rounded-sm bg-emerald-500" /> Present</div>
        <div className="flex items-center gap-1.5"><div className="h-2 w-2 rounded-sm bg-amber-500" /> Late</div>
        <div className="flex items-center gap-1.5"><div className="h-2 w-2 rounded-sm bg-blue-500" /> Half Day</div>
        <div className="flex items-center gap-1.5"><div className="h-2 w-2 rounded-sm bg-red-500/30" /> Absent</div>
      </div>

      {selected && (
        <div className="mt-4 rounded-xl border border-border bg-background p-4">
          <div className="mb-3 flex items-center justify-between">
            <p className="font-bold text-foreground">{formatDate(selected.date)}</p>
            <StatusPill
              status={selected.status === "present" ? "success" : selected.status === "late" ? "warning" : selected.status === "half-day" ? "neutral" : "error"}
              label={selected.status}
              size="sm"
            />
          </div>
          {selected.status !== "absent" ? (
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Check In</p>
                <p className={`mt-0.5 font-bold ${selected.isLate ? "text-amber-500" : "text-foreground"}`}>
                  {selected.checkInTime ?? "—"}
                  {selected.isLate && <span className="ml-1 text-[10px]">(Late)</span>}
                </p>
              </div>
              <div>
                <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Check Out</p>
                <p className="mt-0.5 font-bold text-foreground">{selected.checkOutTime ?? "—"}</p>
              </div>
              {selected.workDuration && (
                <div className="col-span-2 rounded-lg bg-secondary/50 p-2 text-center">
                  <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Duration</p>
                  <p className="font-bold text-foreground">{selected.workDuration}</p>
                </div>
              )}
            </div>
          ) : (
            <div className="flex items-center justify-center py-4 text-sm text-muted-foreground">
              You were absent on this day.
            </div>
          )}
        </div>
      )}
    </div>
  )
}

export function OperationalProfileDrawer({ onClose }: { onClose: () => void }) {
  const [profile, setProfile] = useState<OperationalProfile | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch("/api/trainer/operational-profile", { credentials: "include", cache: "no-store" })
      .then(r => r.json())
      .then(r => { if (r.success) setProfile(r.data); else toast.error("Failed to load operational profile") })
      .catch(() => toast.error("Failed to load operational profile"))
      .finally(() => setLoading(false))
  }, [])

  return (
    <div className="fixed inset-0 z-50" onClick={e => { if (e.target === e.currentTarget) onClose() }}>
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />

      {/* Panel — bottom sheet on mobile, side panel on md+ */}
      <div className="absolute inset-x-0 bottom-0 z-10 flex max-h-[92dvh] flex-col overflow-hidden rounded-t-2xl border-t border-border bg-background shadow-2xl md:inset-y-0 md:left-auto md:right-0 md:max-h-full md:w-[500px] md:rounded-none md:border-l md:border-t-0">
        {/* Handle bar (mobile only) */}
        <div className="flex justify-center pt-3 pb-1 md:hidden">
          <div className="h-1 w-10 rounded-full bg-border" />
        </div>

        {/* Header */}
        <div className="flex items-center justify-between border-b border-border px-4 py-3">
          <h2 className="text-base font-bold text-foreground">My Operational Profile</h2>
          <button onClick={onClose} className="rounded-lg p-1.5 text-muted-foreground hover:bg-secondary hover:text-foreground transition-colors">
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto overscroll-contain">
          <div className="space-y-6 p-4 pb-safe">
            {loading ? (
              <div className="flex h-48 items-center justify-center">
                <Loader2 className="h-6 w-6 animate-spin text-primary" />
              </div>
            ) : !profile ? (
              <p className="text-sm text-muted-foreground">Profile unavailable.</p>
            ) : (
              <>
                {/* Identity */}
                <div className="flex items-center gap-3">
                  <Avatar className="h-14 w-14 shrink-0">
                    {profile.avatarUrl && <AvatarImage src={profile.avatarUrl} alt={profile.name} />}
                    <AvatarFallback className="bg-primary/10 text-base font-bold text-primary">{initials(profile.name)}</AvatarFallback>
                  </Avatar>
                  <div className="min-w-0 flex-1">
                    <h3 className="text-base font-bold text-foreground truncate">{profile.name}</h3>
                    <div className="mt-1 flex flex-wrap items-center gap-2 text-[11px] font-medium text-muted-foreground">
                      {profile.specialization && <span className="font-semibold text-primary">{profile.specialization}</span>}
                      {profile.experience && <span>· {profile.experience} exp</span>}
                    </div>
                    {profile.floorTiming.startLabel && (
                      <div className="mt-2 inline-flex items-center gap-1.5 rounded-md bg-secondary px-2 py-1 text-[10px] font-bold text-foreground">
                        <Clock className="h-3 w-3 text-muted-foreground" />
                        Expected: {profile.floorTiming.startLabel} - {profile.floorTiming.endLabel}
                      </div>
                    )}
                  </div>
                </div>

                {/* Today's status pill */}
                <div className="flex items-center justify-between rounded-xl border border-border bg-card px-4 py-3">
                  <p className="text-sm font-semibold text-foreground">Today's Attendance</p>
                  <StatusPill
                    status={profile.attendance.checkedInToday ? "success" : "warning"}
                    label={profile.attendance.checkedInToday ? "Checked in" : "Pending"}
                  />
                </div>

                {/* Operational alerts */}
                {profile.attendance.insights.length > 0 && (
                  <div className="rounded-xl border border-amber-500/30 bg-amber-500/5 p-4">
                    <div className="mb-2 flex items-center gap-2 text-amber-500">
                      <AlertCircle className="h-4 w-4" />
                      <p className="text-[10px] font-bold uppercase tracking-widest">Performance Alerts</p>
                    </div>
                    <ul className="space-y-1 pl-5 text-sm text-foreground list-disc marker:text-amber-500">
                      {profile.attendance.insights.map((insight, i) => (
                        <li key={i}>{insight}</li>
                      ))}
                    </ul>
                  </div>
                )}

                {/* Metrics */}
                <div>
                  <p className="mb-1.5 text-[10px] font-bold uppercase tracking-widest text-muted-foreground/70">This Month</p>
                  <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                    {[
                      { label: "Rate", value: `${profile.attendance.attendanceRate}%`, color: "text-emerald-500" },
                      { label: "Present", value: profile.attendance.presentDays, color: "text-foreground" },
                      { label: "Absent", value: profile.attendance.absentDays, color: profile.attendance.absentDays > 0 ? "text-red-500" : "text-foreground" },
                      { label: "Late", value: profile.attendance.lateDays, color: profile.attendance.lateDays > 0 ? "text-amber-500" : "text-foreground" },
                    ].map(stat => (
                      <div key={stat.label} className="flex flex-col justify-center rounded-xl border border-border bg-card p-3 h-[72px] shadow-sm">
                        <p className="text-[10px] font-medium text-muted-foreground/80 text-center">{stat.label}</p>
                        <p className={`mt-0.5 text-xl font-bold leading-none text-center ${stat.color}`}>{stat.value}</p>
                      </div>
                    ))}
                  </div>

                  <div className="mt-2 grid grid-cols-1 gap-2 sm:grid-cols-2">
                    <div className="flex items-center justify-between rounded-xl border border-border bg-card px-4 py-3">
                      <div>
                        <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground/70">Avg In Time</p>
                        <p className="font-bold text-foreground mt-0.5">{profile.attendance.avgCheckIn ?? "—"}</p>
                      </div>
                      <Clock className="h-4 w-4 text-muted-foreground/50" />
                    </div>
                    <div className="flex items-center justify-between rounded-xl border border-border bg-card px-4 py-3">
                      <div>
                        <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground/70">Total Hours</p>
                        <p className="font-bold text-foreground mt-0.5">{profile.attendance.totalHoursWorked ?? "—"}</p>
                      </div>
                      <TrendingUp className="h-4 w-4 text-muted-foreground/50" />
                    </div>
                  </div>
                </div>

                {/* Daily Log Calendar */}
                {profile.attendance.calendar.length > 0 && (
                  <div className="rounded-xl border border-border bg-card p-1 shadow-sm">
                    <div className="px-4 py-3 pb-2 border-b border-border">
                      <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground/70">Daily Log</p>
                    </div>
                    <div className="p-4">
                      <CalendarGrid calendar={profile.attendance.calendar} />
                    </div>
                  </div>
                )}

                {/* Clients */}
                {profile.clients.length > 0 && (
                  <div>
                    <p className="mb-1.5 text-[10px] font-bold uppercase tracking-widest text-muted-foreground/70">
                      My Clients ({profile.clients.length})
                    </p>
                    <div className="space-y-1.5">
                      {profile.clients.map(c => (
                        <div key={c.id} className="flex items-center justify-between rounded-xl border border-border bg-card shadow-sm px-3 py-2.5">
                          <div className="flex items-center gap-2">
                            <Users className="h-3.5 w-3.5 text-muted-foreground" />
                            <p className="text-sm font-semibold text-foreground">{c.name}</p>
                          </div>
                          <StatusPill status={planTone(c.planStatus)} label={c.planStatus} size="sm" />
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Govt ID verification */}
                {profile.govtIdUrl && (
                  <div>
                    <p className="mb-1.5 text-[10px] font-bold uppercase tracking-widest text-muted-foreground/70">Verification</p>
                    <div className="flex items-center justify-between rounded-xl border border-emerald-500/20 bg-emerald-500/5 px-4 py-3">
                      <div className="flex items-center gap-2">
                        <Shield className="h-4 w-4 text-emerald-500" />
                        <div>
                          <p className="text-sm font-semibold text-foreground">{profile.govtIdType ?? "Government ID"}</p>
                          <p className="text-[11px] font-bold text-emerald-500 mt-0.5">Verified</p>
                        </div>
                      </div>
                      <a href={profile.govtIdUrl} target="_blank" rel="noreferrer" className="text-xs font-bold text-primary hover:underline">View</a>
                    </div>
                  </div>
                )}

                <div className="h-24 md:h-8" />
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
