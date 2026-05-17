"use client"

import { useEffect, useMemo, useState } from "react"
import { useSearchParams } from "next/navigation"
import {
  Calendar,
  CalendarDays,
  CheckCircle2,
  Clock,
  Dumbbell,
  IndianRupee,
  Loader2,
  Mail,
  Phone,
  SearchX,
  Users,
  X,
} from "lucide-react"
import { toast } from "sonner"
import { EmptyState, PageIntro, SearchToolbar, StatusPill, SurfaceCard } from "@/components/powerhouse"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"

/* ── Types ─────────────────────────────────────────────────────────────── */
interface OwnerMember {
  id: string; name: string; email: string | null; phone: string | null
  avatarUrl: string | null; branch: string | null; joinDate: string
  membershipStatus: "active" | "expiring" | "expired"
  daysRemaining: number; lastCheckInRelative: string
}

interface MemberDetail {
  id: string; name: string; email: string | null; phone: string | null; avatarUrl: string | null; joinDate: string
  membership: { status: string; startDate: string; endDate: string; daysLeft: number } | null
  attendance: { total: number; thisMonth: number; streak: number; avgDurationMinutes: number | null; lastDate: string | null }
  workoutPlan: { title: string; status: string; dayCount: number; exerciseCount: number; updatedAt: string } | null
  payments: Array<{ id: string; amount: number; planDuration: number; status: string; paymentMode: string; createdAt: string; approvedAt: string | null }>
}

/* ── Helpers ────────────────────────────────────────────────────────────── */
function initials(n: string) { return n.split(" ").filter(Boolean).slice(0,2).map(p => p[0]?.toUpperCase()).join("") }
function formatDate(v: string) { return new Intl.DateTimeFormat("en-IN", { dateStyle: "medium" }).format(new Date(v)) }
function formatCurrency(v: number) { return new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(v) }
function membershipTone(s: OwnerMember["membershipStatus"]) { return s === "active" ? "success" : s === "expiring" ? "warning" : "error" }
function paymentTone(s: string) { return s === "approved" ? "success" : s === "pending" ? "warning" : "error" }

function MemberDrawer({ memberId, onClose }: { memberId: string; onClose: () => void }) {
  const [detail, setDetail] = useState<MemberDetail | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch(`/api/owner/members/${memberId}`, { credentials: "include", cache: "no-store" })
      .then(r => r.json())
      .then(r => { if (r.success) setDetail(r.data); else toast.error("Failed to load member detail") })
      .catch(() => toast.error("Failed to load member detail"))
      .finally(() => setLoading(false))
  }, [memberId])

  return (
    // Backdrop
    <div className="fixed inset-0 z-50" onClick={e => { if (e.target === e.currentTarget) onClose() }}>
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />

      {/* Panel — full-screen on mobile, right-side panel on md+ */}
      <div className="absolute inset-x-0 bottom-0 z-10 flex max-h-[92dvh] flex-col overflow-hidden rounded-t-2xl border-t border-border bg-background shadow-2xl md:inset-y-0 md:left-auto md:right-0 md:max-h-full md:w-[420px] md:rounded-none md:border-l md:border-t-0">
        {/* Handle bar (mobile only) */}
        <div className="flex justify-center pt-3 pb-1 md:hidden">
          <div className="h-1 w-10 rounded-full bg-border" />
        </div>

        {/* Header */}
        <div className="flex items-center justify-between border-b border-border px-4 py-3">
          <h2 className="text-base font-bold text-foreground">Member Profile</h2>
          <button onClick={onClose} className="rounded-lg p-1.5 text-muted-foreground hover:bg-secondary hover:text-foreground transition-colors">
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Scrollable content */}
        <div className="flex-1 overflow-y-auto overscroll-contain">
          <div className="space-y-4 p-4 pb-safe">
            {loading ? (
              <div className="flex h-48 items-center justify-center"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>
            ) : !detail ? (
              <p className="text-sm text-muted-foreground">Profile unavailable.</p>
            ) : (
              <>
                {/* Identity */}
                <div className="flex items-center gap-3">
                  <Avatar className="h-14 w-14 shrink-0">
                    <AvatarFallback className="bg-primary/10 text-base font-bold text-primary">{initials(detail.name)}</AvatarFallback>
                  </Avatar>
                  <div className="min-w-0 flex-1">
                    <h3 className="text-base font-bold text-foreground truncate">{detail.name}</h3>
                    {detail.email && (
                      <a href={`mailto:${detail.email}`} className="block truncate text-xs text-primary hover:underline">{detail.email}</a>
                    )}
                    {detail.phone && (
                      <a href={`tel:${detail.phone}`} className="block text-xs text-muted-foreground hover:text-foreground">{detail.phone}</a>
                    )}
                    <p className="text-xs text-muted-foreground">Joined {formatDate(detail.joinDate)}</p>
                  </div>
                </div>

                {/* Membership */}
                <div>
                  <p className="mb-2 text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Membership</p>
                  {detail.membership ? (
                    <div className="rounded-xl border border-border bg-card p-3 space-y-3">
                      <div className="flex justify-between items-center">
                        <StatusPill
                          status={detail.membership.daysLeft <= 0 ? "error" : detail.membership.daysLeft <= 14 ? "warning" : "success"}
                          label={detail.membership.daysLeft <= 0 ? "Expired" : detail.membership.daysLeft <= 14 ? "Expiring Soon" : "Active"} />
                        <span className={`text-sm font-bold ${detail.membership.daysLeft <= 0 ? "text-red-500" : detail.membership.daysLeft <= 14 ? "text-amber-500" : "text-emerald-500"}`}>
                          {detail.membership.daysLeft > 0 ? `${detail.membership.daysLeft}d left` : "Expired"}
                        </span>
                      </div>
                      <div className="grid grid-cols-2 gap-2 text-xs">
                        <div className="rounded-lg bg-background p-2.5">
                          <p className="text-muted-foreground">Start</p>
                          <p className="mt-0.5 font-semibold text-foreground">{formatDate(detail.membership.startDate)}</p>
                        </div>
                        <div className="rounded-lg bg-background p-2.5">
                          <p className="text-muted-foreground">End</p>
                          <p className="mt-0.5 font-semibold text-foreground">{formatDate(detail.membership.endDate)}</p>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <p className="text-sm text-muted-foreground rounded-lg border border-dashed border-border p-3">No membership on record</p>
                  )}
                </div>

                {/* Attendance stats */}
                <div>
                  <p className="mb-2 text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Attendance</p>
                  <div className="grid grid-cols-2 gap-2">
                    {[
                      { label: "Total visits", value: detail.attendance.total },
                      { label: "This month", value: detail.attendance.thisMonth },
                      { label: "Current streak", value: `${detail.attendance.streak}d` },
                      { label: "Avg session", value: detail.attendance.avgDurationMinutes ? `${detail.attendance.avgDurationMinutes}m` : "N/A" },
                    ].map(stat => (
                      <div key={stat.label} className="rounded-xl border border-border bg-card p-3">
                        <p className="text-[10px] text-muted-foreground">{stat.label}</p>
                        <p className="mt-0.5 text-lg font-bold text-foreground">{stat.value}</p>
                      </div>
                    ))}
                  </div>
                  {detail.attendance.lastDate && (
                    <p className="mt-2 text-xs text-muted-foreground">Last check-in: {formatDate(detail.attendance.lastDate)}</p>
                  )}
                </div>

                {/* Workout Plan */}
                <div>
                  <p className="mb-2 text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Workout Plan</p>
                  {detail.workoutPlan ? (
                    <div className="rounded-xl border border-border bg-card p-3">
                      <div className="mb-1 flex items-center justify-between">
                        <p className="font-semibold text-foreground text-sm">{detail.workoutPlan.title}</p>
                        <StatusPill status={detail.workoutPlan.status === "active" ? "success" : "warning"} label={detail.workoutPlan.status} size="sm" />
                      </div>
                      <div className="flex gap-2 text-xs text-muted-foreground">
                        <span>{detail.workoutPlan.dayCount} days</span>
                        <span>·</span>
                        <span>{detail.workoutPlan.exerciseCount} exercises</span>
                        <span>·</span>
                        <span>Updated {formatDate(detail.workoutPlan.updatedAt)}</span>
                      </div>
                    </div>
                  ) : (
                    <p className="text-sm text-muted-foreground rounded-lg border border-dashed border-border p-3">No workout plan assigned</p>
                  )}
                </div>

                {/* Payments */}
                {detail.payments.length > 0 && (
                  <div>
                    <p className="mb-2 text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Payment History</p>
                    <div className="space-y-2">
                      {detail.payments.slice(0, 8).map(p => (
                        <div key={p.id} className="flex items-center justify-between rounded-lg border border-border bg-background px-3 py-2">
                          <div>
                            <p className="text-sm font-medium text-foreground">{formatCurrency(p.amount)}</p>
                            <p className="text-xs text-muted-foreground">{formatDate(p.createdAt)} · {p.paymentMode}</p>
                          </div>
                          <StatusPill status={paymentTone(p.status)} label={p.status} size="sm" />
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Safe area spacer for home indicator */}
                <div className="h-4" />
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}


/* ══════════════════════════════════════════════════════════════════════════
   Page
══════════════════════════════════════════════════════════════════════════ */
export default function OwnerMembersPage() {
  const searchParams = useSearchParams()
  const initialStatus = searchParams.get("status")
  const [members, setMembers] = useState<OwnerMember[]>([])
  const [total, setTotal] = useState(0)
  const [search, setSearch] = useState("")
  const [status, setStatus] = useState(
    initialStatus && ["active", "expiring", "expired", "all"].includes(initialStatus)
      ? initialStatus
      : "all"
  )
  const [currentPage, setCurrentPage] = useState(1)
  const [isLoading, setIsLoading] = useState(true)
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const itemsPerPage = 20

  const queryString = useMemo(() => {
    const params = new URLSearchParams()
    if (search.trim()) params.set("search", search.trim())
    if (status !== "all") params.set("status", status)
    params.set("page", String(currentPage))
    params.set("limit", String(itemsPerPage))
    return params.toString()
  }, [search, status, currentPage])

  useEffect(() => {
    let mounted = true
    setIsLoading(true)
    fetch(`/api/owner/members?${queryString}`, { credentials: "include", cache: "no-store" })
      .then(r => r.json())
      .then(r => { if (!mounted) return; if (r.success) { setMembers(r.data.members); setTotal(r.data.total) } else toast.error("Members unavailable") })
      .catch(() => toast.error("Members unavailable"))
      .finally(() => { if (mounted) setIsLoading(false) })
    return () => { mounted = false }
  }, [queryString])

  const totalPages = Math.max(1, Math.ceil(total / itemsPerPage))
  const hasFilters = search.trim() || status !== "all"

  return (
    <div className="flex-1 overflow-y-auto">
      <div className="max-w-6xl">
        <PageIntro title="Members" description="All gym members — click any card to see full profile" />

        <SurfaceCard className="mb-6">
          <SearchToolbar value={search} onChange={(v) => { setSearch(v); setCurrentPage(1) }} placeholder="Search by name…"
            filters={[{ value: status, onChange: (v) => { setStatus(v); setCurrentPage(1) }, placeholder: "All Status",
              options: [{ value: "all", label: "All" }, { value: "active", label: "Active" }, { value: "expiring", label: "Expiring" }, { value: "expired", label: "Expired" }] }]} />
        </SurfaceCard>

        {!isLoading && <p className="mb-4 text-sm text-muted-foreground">Showing {members.length} of {total} member{total !== 1 ? "s" : ""}</p>}

        <div className="space-y-3">
          {isLoading ? Array.from({ length: 5 }).map((_, i) => <div key={i} className="h-20 animate-pulse rounded-xl border border-border bg-card" />)
          : members.length === 0 ? (
            <EmptyState icon={hasFilters ? SearchX : Users} title={hasFilters ? "No members found" : "No members yet"}
              description={hasFilters ? "Try adjusting filters." : "Members appear here once signed up."} />
          ) : members.map(m => (
            <button key={m.id} onClick={() => setSelectedId(m.id)} className="w-full text-left">
              <SurfaceCard interactive className="hover:border-primary/40">
                <div className="flex items-center justify-between gap-4">
                  <div className="flex items-center gap-3 min-w-0 flex-1">
                    <Avatar className="h-10 w-10 shrink-0">
                      <AvatarFallback className="bg-primary/10 text-xs font-bold text-primary">{initials(m.name)}</AvatarFallback>
                    </Avatar>
                    <div className="min-w-0 flex-1">
                      <div className="mb-0.5 flex flex-wrap items-center gap-2">
                        <span className="font-semibold text-foreground">{m.name}</span>
                        <StatusPill status={membershipTone(m.membershipStatus)} label={m.membershipStatus === "expiring" ? "Expiring" : m.membershipStatus} size="sm" />
                      </div>
                      <p className="truncate text-xs text-muted-foreground">{m.email ?? "No email"}</p>
                    </div>
                  </div>
                  <div className="shrink-0 text-right">
                    {m.membershipStatus === "active" || m.membershipStatus === "expiring" ? (
                      <p className={`text-sm font-bold ${m.membershipStatus === "expiring" ? "text-amber-500" : "text-foreground"}`}>
                        {m.daysRemaining}d left
                      </p>
                    ) : null}
                    <p className="text-xs text-muted-foreground">
                      {m.lastCheckInRelative === "No attendance"
                        ? "No check-ins yet"
                        : m.lastCheckInRelative}
                    </p>
                  </div>
                </div>
              </SurfaceCard>
            </button>
          ))}
        </div>

        {totalPages > 1 && (
          <div className="mt-6 flex justify-center gap-2">
            <Button size="sm" variant="outline" disabled={currentPage === 1} onClick={() => setCurrentPage(p => p - 1)}>Previous</Button>
            <span className="flex items-center px-3 text-sm text-muted-foreground">{currentPage} / {totalPages}</span>
            <Button size="sm" variant="outline" disabled={currentPage === totalPages} onClick={() => setCurrentPage(p => p + 1)}>Next</Button>
          </div>
        )}
      </div>

      {selectedId && <MemberDrawer memberId={selectedId} onClose={() => setSelectedId(null)} />}
    </div>
  )
}
