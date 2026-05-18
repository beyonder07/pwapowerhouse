"use client"

import { useEffect, useMemo, useState } from "react"
import {
  AlertCircle,
  CalendarDays,
  CheckCircle2,
  Clock,
  Info,
  IndianRupee,
  Loader2,
  Mail,
  SearchX,
  Shield,
  Users,
  X,
  TrendingDown,
  TrendingUp,
} from "lucide-react"
import { toast } from "sonner"
import { EmptyState, PageIntro, SearchToolbar, StatusPill, SurfaceCard } from "@/components/powerhouse"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"

/* ── Types ─────────────────────────────────────────────────────────────── */
interface OwnerTrainer {
  id: string; name: string; email: string | null; avatarUrl: string | null
  branch: string | null; joinDate: string; specialization: string | null
  experience: string | null; clientCount: number; attendanceToday: boolean
  salaryStatus: "paid" | "processing" | "pending"; currentSalary: number
}

interface CalendarDay {
  date: string
  status: "present" | "late" | "absent" | "half-day"
  checkInTime: string | null
  checkOutTime: string | null
  workDuration: string | null
  isLate: boolean
}

interface TrainerDetail {
  id: string; name: string; email: string | null; phone: string | null
  avatarUrl: string | null; specialization: string | null; experience: string | null
  govtIdUrl: string | null; govtIdType: string | null; joinDate: string
  floorTiming: { startTime: string | null; endTime: string | null; startLabel: string | null; endLabel: string | null }
  attendance: {
    presentDays: number; absentDays: number; lateDays: number; halfDays: number
    workingDays: number; attendanceRate: number; checkedInToday: boolean
    consecutiveAbsences: number; totalHoursWorked: string | null
    avgCheckIn: string | null; avgCheckOut: string | null
    calendar: CalendarDay[]
    payrollSuggestion: { baseSalary: number; workingDays: number; absentDays: number; perDayRate: number; suggestedDeduction: number; finalSalary: number }
    insights: string[]
  }
  clients: Array<{ id: string; name: string; planStatus: string }>
  salaryHistory: Array<{ id: string; monthStart: string; baseSalary: number; bonus: number; total: number; status: string; paidAt: string | null }>
}

/* ── Helpers ────────────────────────────────────────────────────────────── */
function initials(n: string) { return n.split(" ").filter(Boolean).slice(0,2).map(p => p[0]?.toUpperCase()).join("") }
function formatDate(v: string) { return new Intl.DateTimeFormat("en-IN", { dateStyle: "medium" }).format(new Date(v)) }
function formatMonth(v: string) { return new Intl.DateTimeFormat("en-IN", { month: "short", year: "2-digit" }).format(new Date(v + "T00:00:00")) }
function formatCurrency(v: number) { return new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(v) }
function salaryTone(s: string) { return s === "paid" ? "success" : s === "processing" ? "warning" : "error" }
function planTone(s: string) { return s === "active" ? "success" : s === "pending" ? "warning" : "neutral" }

/* ── Rich Attendance Calendar ───────────────────────────────────────────── */
function RichCalendar({ calendar }: { calendar: CalendarDay[] }) {
  const [selectedDay, setSelectedDay] = useState<CalendarDay | null>(calendar[calendar.length - 1] ?? null)

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
      {/* Calendar Grid */}
      <div className="flex flex-wrap gap-1.5">
        {calendar.map(day => {
          const isSelected = selectedDay?.date === day.date
          return (
            <button
              key={day.date}
              onClick={() => setSelectedDay(day)}
              className={`h-7 w-7 rounded-md border text-[10px] font-bold text-white transition-all ${getColor(day.status)} ${isSelected ? "ring-2 ring-primary ring-offset-1 ring-offset-card" : ""}`}
            >
              {parseInt(day.date.split("-")[2]!)}
            </button>
          )
        })}
      </div>

      {/* Legend */}
      <div className="flex flex-wrap gap-x-4 gap-y-2 text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
        <div className="flex items-center gap-1.5"><div className="h-2 w-2 rounded-sm bg-emerald-500" /> Present</div>
        <div className="flex items-center gap-1.5"><div className="h-2 w-2 rounded-sm bg-amber-500" /> Late</div>
        <div className="flex items-center gap-1.5"><div className="h-2 w-2 rounded-sm bg-blue-500" /> Half Day</div>
        <div className="flex items-center gap-1.5"><div className="h-2 w-2 rounded-sm bg-red-500/30" /> Absent</div>
      </div>

      {/* Selected Day Details */}
      {selectedDay && (
        <div className="mt-4 rounded-xl border border-border bg-background p-4">
          <div className="mb-3 flex items-center justify-between">
            <p className="font-bold text-foreground">{formatDate(selectedDay.date)}</p>
            <StatusPill 
              status={selectedDay.status === "present" ? "success" : selectedDay.status === "late" ? "warning" : selectedDay.status === "half-day" ? "neutral" : "error"} 
              label={selectedDay.status} 
              size="sm" 
            />
          </div>
          
          {selectedDay.status !== "absent" ? (
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Check In</p>
                <p className={`mt-0.5 font-bold ${selectedDay.isLate ? "text-amber-500" : "text-foreground"}`}>
                  {selectedDay.checkInTime ?? "—"}
                  {selectedDay.isLate && <span className="ml-1 text-[10px]">(Late)</span>}
                </p>
              </div>
              <div>
                <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Check Out</p>
                <p className="mt-0.5 font-bold text-foreground">{selectedDay.checkOutTime ?? "—"}</p>
              </div>
              {selectedDay.workDuration && (
                <div className="col-span-2 rounded-lg bg-secondary/50 p-2 text-center">
                  <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Duration</p>
                  <p className="font-bold text-foreground">{selectedDay.workDuration}</p>
                </div>
              )}
            </div>
          ) : (
            <div className="flex items-center justify-center py-4 text-sm text-muted-foreground">
              Trainer was absent on this day.
            </div>
          )}
        </div>
      )}
    </div>
  )
}

/* ── Detail Drawer ─────────────────────────────────────────────────────── */
function TrainerDrawer({ trainerId, onClose }: { trainerId: string; onClose: () => void }) {
  const [detail, setDetail] = useState<TrainerDetail | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch(`/api/owner/trainers/${trainerId}`, { credentials: "include", cache: "no-store" })
      .then(r => r.json())
      .then(r => { if (r.success) setDetail(r.data); else toast.error("Failed to load trainer detail") })
      .catch(() => toast.error("Failed to load trainer detail"))
      .finally(() => setLoading(false))
  }, [trainerId])

  return (
    <div className="fixed inset-0 z-50 flex justify-end" onClick={e => { if (e.target === e.currentTarget) onClose() }}>
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div className="relative z-10 flex h-full w-full max-w-[500px] flex-col overflow-hidden border-l border-border bg-background shadow-2xl">
        <div className="flex items-center justify-between border-b border-border bg-card px-5 py-4">
          <h2 className="text-base font-bold text-foreground">Operational Profile</h2>
          <button onClick={onClose} className="rounded-lg p-1.5 text-muted-foreground hover:bg-secondary hover:text-foreground transition-colors">
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-5 space-y-6">
          {loading ? (
            <div className="flex h-48 items-center justify-center"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>
          ) : !detail ? (
            <p className="text-sm text-muted-foreground">Profile unavailable.</p>
          ) : (
            <>
              {/* Identity */}
              <div className="flex items-start gap-4">
                <Avatar className="h-16 w-16 shrink-0">
                  <AvatarFallback className="bg-primary/10 text-lg font-bold text-primary">{initials(detail.name)}</AvatarFallback>
                </Avatar>
                <div className="min-w-0 flex-1">
                  <h3 className="text-xl font-black text-foreground">{detail.name}</h3>
                  <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                    {detail.specialization && <span className="font-semibold text-primary">{detail.specialization}</span>}
                    {detail.experience && <span>· {detail.experience} exp</span>}
                  </div>
                  {detail.floorTiming.startLabel && (
                    <div className="mt-2 inline-flex items-center gap-1.5 rounded-md bg-secondary px-2 py-1 text-[10px] font-bold text-foreground">
                      <Clock className="h-3 w-3 text-muted-foreground" />
                      Expected: {detail.floorTiming.startLabel} - {detail.floorTiming.endLabel}
                    </div>
                  )}
                </div>
              </div>

              {/* Smart Insights */}
              {detail.attendance.insights.length > 0 && (
                <div className="rounded-xl border border-amber-500/30 bg-amber-500/5 p-4">
                  <div className="mb-2 flex items-center gap-2 text-amber-500">
                    <AlertCircle className="h-4 w-4" />
                    <p className="text-xs font-bold uppercase tracking-widest">Operational Alerts</p>
                  </div>
                  <ul className="space-y-1.5 pl-6 text-sm text-foreground list-disc marker:text-amber-500">
                    {detail.attendance.insights.map((insight, i) => (
                      <li key={i}>{insight}</li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Attendance Analytics Matrix */}
              <div>
                <p className="mb-3 text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Performance Metrics</p>
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                  <div className="rounded-xl border border-border bg-card p-3 text-center">
                    <p className="text-2xl font-black text-emerald-500">{detail.attendance.attendanceRate}%</p>
                    <p className="mt-1 text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Rate</p>
                  </div>
                  <div className="rounded-xl border border-border bg-card p-3 text-center">
                    <p className="text-2xl font-black text-foreground">{detail.attendance.presentDays}</p>
                    <p className="mt-1 text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Present</p>
                  </div>
                  <div className={`rounded-xl border border-border bg-card p-3 text-center ${detail.attendance.absentDays > 0 ? "border-red-500/30 bg-red-500/5" : ""}`}>
                    <p className={`text-2xl font-black ${detail.attendance.absentDays > 0 ? "text-red-500" : "text-foreground"}`}>{detail.attendance.absentDays}</p>
                    <p className="mt-1 text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Absent</p>
                  </div>
                  <div className={`rounded-xl border border-border bg-card p-3 text-center ${detail.attendance.lateDays > 0 ? "border-amber-500/30 bg-amber-500/5" : ""}`}>
                    <p className={`text-2xl font-black ${detail.attendance.lateDays > 0 ? "text-amber-500" : "text-foreground"}`}>{detail.attendance.lateDays}</p>
                    <p className="mt-1 text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Late</p>
                  </div>
                </div>

                <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
                  <div className="flex items-center justify-between rounded-xl border border-border bg-card px-4 py-3">
                    <div>
                      <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Avg In Time</p>
                      <p className="font-bold text-foreground">{detail.attendance.avgCheckIn ?? "—"}</p>
                    </div>
                    <Clock className="h-4 w-4 text-muted-foreground" />
                  </div>
                  <div className="flex items-center justify-between rounded-xl border border-border bg-card px-4 py-3">
                    <div>
                      <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Total Hours</p>
                      <p className="font-bold text-foreground">{detail.attendance.totalHoursWorked ?? "—"}</p>
                    </div>
                    <TrendingUp className="h-4 w-4 text-muted-foreground" />
                  </div>
                </div>
              </div>

              {/* Attendance Log */}
              <div className="rounded-xl border border-border bg-card p-1">
                <div className="px-4 py-3 pb-2 border-b border-border">
                  <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Daily Log</p>
                </div>
                <div className="p-4">
                  <RichCalendar calendar={detail.attendance.calendar} />
                </div>
              </div>

              {/* Clients */}
              {detail.clients.length > 0 && (
                <div>
                  <p className="mb-2 text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Active Clients ({detail.clients.length})</p>
                  <div className="space-y-1.5">
                    {detail.clients.map(c => (
                      <div key={c.id} className="flex items-center justify-between rounded-lg border border-border bg-background px-3 py-2">
                         <p className="text-sm font-medium text-foreground">{c.name}</p>
                        <StatusPill status={planTone(c.planStatus)} label={c.planStatus} size="sm" />
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Govt ID */}
              {detail.govtIdUrl && (
                <div>
                  <p className="mb-2 text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Verification</p>
                  <div className="flex items-center justify-between rounded-xl border border-emerald-500/20 bg-emerald-500/5 px-4 py-3">
                    <div className="flex items-center gap-2">
                      <Shield className="h-4 w-4 text-emerald-500" />
                      <div>
                        <p className="text-sm font-semibold text-foreground">{detail.govtIdType ?? "Government ID"}</p>
                        <p className="text-xs text-emerald-500">Verified</p>
                      </div>
                    </div>
                    <a href={detail.govtIdUrl} target="_blank" rel="noreferrer" className="text-xs font-bold text-primary hover:underline">View</a>
                  </div>
                </div>
              )}

            </>
          )}
        </div>
      </div>
    </div>
  )
}

/* ══════════════════════════════════════════════════════════════════════════
   Page
══════════════════════════════════════════════════════════════════════════ */
export default function OwnerTrainersPage() {
  const [trainers, setTrainers] = useState<OwnerTrainer[]>([])
  const [search, setSearch] = useState("")
  const [isLoading, setIsLoading] = useState(true)
  const [selectedId, setSelectedId] = useState<string | null>(null)

  const queryString = useMemo(() => {
    const p = new URLSearchParams(); if (search.trim()) p.set("search", search.trim()); return p.toString()
  }, [search])

  useEffect(() => {
    let mounted = true; setIsLoading(true)
    fetch(`/api/owner/trainers?${queryString}`, { credentials: "include", cache: "no-store" })
      .then(r => r.json())
      .then(r => { if (!mounted) return; if (r.success) setTrainers(r.data.trainers); else toast.error("Trainers unavailable") })
      .catch(() => toast.error("Trainers unavailable"))
      .finally(() => { if (mounted) setIsLoading(false) })
    return () => { mounted = false }
  }, [queryString])

  const presentCount = trainers.filter(t => t.attendanceToday).length

  return (
    <div className="flex-1 overflow-y-auto">
      <div className="max-w-6xl">
        <PageIntro title="Trainers" description="All trainers — click any card for full profile and attendance" />

        {!isLoading && trainers.length > 0 && (
          <div className="mb-6 grid grid-cols-3 gap-4">
            {[
              { label: "Total Trainers", value: trainers.length, color: "#ef4444" },
              { label: "Present Today", value: presentCount, color: "#10b981" },
              { label: "Salary Pending", value: trainers.filter(t => t.salaryStatus === "pending").length, color: "#f59e0b" },
            ].map(stat => (
              <div key={stat.label} className="rounded-xl border border-border bg-card p-4" style={{ borderLeftWidth: 4, borderLeftColor: stat.color }}>
                <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">{stat.label}</p>
                <p className="mt-1 text-2xl font-bold text-foreground" style={{ color: stat.color }}>{stat.value}</p>
              </div>
            ))}
          </div>
        )}

        <SurfaceCard className="mb-6">
          <SearchToolbar value={search} onChange={setSearch} placeholder="Search by trainer name…" />
        </SurfaceCard>

        <div className="space-y-3">
          {isLoading ? Array.from({ length: 4 }).map((_, i) => <div key={i} className="h-20 animate-pulse rounded-xl border border-border bg-card" />)
          : trainers.length === 0 ? (
            <EmptyState icon={search.trim() ? SearchX : Users} title={search.trim() ? "No trainers found" : "No trainers yet"}
              description={search.trim() ? "Try a different search." : "Trainers appear here once approved."} />
          ) : trainers.map(t => (
            <button key={t.id} onClick={() => setSelectedId(t.id)} className="w-full text-left">
              <SurfaceCard interactive className="hover:border-primary/40">
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-3 min-w-0 flex-1">
                    <Avatar className="h-10 w-10 shrink-0">
                      <AvatarFallback className="bg-primary/10 text-xs font-bold text-primary">{initials(t.name)}</AvatarFallback>
                    </Avatar>
                    <div className="min-w-0 flex-1">
                      <div className="mb-0.5 flex flex-wrap items-center gap-2">
                        <span className="font-bold text-foreground">{t.name}</span>
                        {/* Single attendance pill — neutral gray when absent, green when present */}
                        <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold ${
                          t.attendanceToday
                            ? "bg-emerald-500/15 text-emerald-400"
                            : "bg-secondary text-muted-foreground"
                        }`}>
                          <span className={`h-1.5 w-1.5 rounded-full ${
                            t.attendanceToday ? "bg-emerald-400" : "bg-muted-foreground"
                          }`} />
                          {t.attendanceToday ? "Present" : "Absent"}
                        </span>
                      </div>
                      <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                        <span>{t.specialization ?? "Trainer"}{t.experience ? ` · ${t.experience}` : ""}</span>
                        {/* Salary status — small amber text, not a red pill */}
                        {t.salaryStatus !== "paid" && (
                          <span className={`font-medium ${
                            t.salaryStatus === "processing" ? "text-blue-400" : "text-amber-500"
                          }`}>
                            · Salary {t.salaryStatus}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                  {/* Only show salary if > 0 */}
                  {t.currentSalary > 0 && (
                    <div className="shrink-0 text-right">
                      <p className="text-sm font-bold text-foreground">{formatCurrency(t.currentSalary)}</p>
                      <p className="text-xs text-muted-foreground">this month</p>
                    </div>
                  )}
                </div>
              </SurfaceCard>
            </button>
          ))}
        </div>
      </div>

      {selectedId && <TrainerDrawer trainerId={selectedId} onClose={() => setSelectedId(null)} />}
    </div>
  )
}
