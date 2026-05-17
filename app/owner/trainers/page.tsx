"use client"

import { useEffect, useMemo, useState } from "react"
import {
  CalendarDays,
  CheckCircle2,
  IndianRupee,
  Loader2,
  Mail,
  SearchX,
  Shield,
  Users,
  X,
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

interface TrainerDetail {
  id: string; name: string; email: string | null; phone: string | null
  avatarUrl: string | null; specialization: string | null; experience: string | null
  govtIdUrl: string | null; govtIdType: string | null; joinDate: string
  attendance: { presentDays: number; workingDays: number; attendanceRate: number; lateDays: number; checkedInToday: boolean; calendar: Array<{ date: string; present: boolean }> }
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

/* ── Attendance Calendar ────────────────────────────────────────────────── */
function AttendanceCalendar({ calendar }: { calendar: Array<{ date: string; present: boolean }> }) {
  return (
    <div className="flex flex-wrap gap-1">
      {calendar.map(day => (
        <div key={day.date} title={day.date}
          className={`h-5 w-5 rounded-sm ${day.present ? "bg-emerald-500" : "bg-muted"}`} />
      ))}
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
      <div className="relative z-10 flex h-full w-full max-w-md flex-col overflow-hidden border-l border-border bg-background shadow-2xl">
        <div className="flex items-center justify-between border-b border-border px-5 py-4">
          <h2 className="text-base font-bold text-foreground">Trainer Profile</h2>
          <button onClick={onClose} className="rounded-lg p-1.5 text-muted-foreground hover:bg-secondary hover:text-foreground transition-colors">
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-5 space-y-5">
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
                <div>
                  <h3 className="text-lg font-bold text-foreground">{detail.name}</h3>
                  {detail.specialization && <p className="text-sm text-primary">{detail.specialization}</p>}
                  {detail.experience && <p className="text-xs text-muted-foreground">{detail.experience} experience</p>}
                  {detail.email && <p className="text-xs text-muted-foreground mt-0.5">{detail.email}</p>}
                  <p className="mt-1 text-xs text-muted-foreground">Joined {formatDate(detail.joinDate)}</p>
                </div>
              </div>

              {/* Attendance This Month */}
              <div>
                <p className="mb-2 text-[10px] font-bold uppercase tracking-widest text-muted-foreground">This Month's Attendance</p>
                <div className="rounded-xl border border-border bg-card p-4 space-y-3">
                  <div className="grid grid-cols-3 gap-2">
                    {[
                      { label: "Present", value: detail.attendance.presentDays },
                      { label: "Of working", value: detail.attendance.workingDays },
                      { label: "Rate", value: `${detail.attendance.attendanceRate}%` },
                    ].map(stat => (
                      <div key={stat.label} className="rounded-lg bg-background p-2 text-center">
                        <p className="text-lg font-bold text-foreground">{stat.value}</p>
                        <p className="text-[10px] text-muted-foreground">{stat.label}</p>
                      </div>
                    ))}
                  </div>
                  <div>
                    <p className="mb-2 text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Calendar</p>
                    <AttendanceCalendar calendar={detail.attendance.calendar} />
                  </div>
                  {detail.attendance.lateDays > 0 && (
                    <p className="text-xs text-amber-500">{detail.attendance.lateDays} late check-in{detail.attendance.lateDays !== 1 ? "s" : ""} this month</p>
                  )}
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

              {/* Salary History */}
              {detail.salaryHistory.length > 0 && (
                <div>
                  <p className="mb-2 text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Salary History</p>
                  <div className="space-y-2">
                    {detail.salaryHistory.map(s => (
                      <div key={s.id} className="flex items-center justify-between rounded-lg border border-border bg-background px-3 py-2">
                        <div>
                          <p className="text-sm font-semibold text-foreground">{formatMonth(s.monthStart)}</p>
                          <p className="text-xs text-muted-foreground">Base {formatCurrency(s.baseSalary)} + {formatCurrency(s.bonus)} bonus</p>
                        </div>
                        <div className="text-right">
                          <p className="text-sm font-bold text-foreground">{formatCurrency(s.total)}</p>
                          <StatusPill status={salaryTone(s.status)} label={s.status} size="sm" />
                        </div>
                      </div>
                    ))}
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
