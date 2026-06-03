"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import { useSearchParams } from "next/navigation"
import {
  Calendar,
  CalendarDays,
  CheckCircle2,
  Clock,
  Dumbbell,
  Edit2,
  IndianRupee,
  Loader2,
  Mail,
  Phone,
  Save,
  SearchX,
  ToggleLeft,
  ToggleRight,
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
  isActive: boolean; daysSinceLastCheckIn: number | null
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

function addMonths(date: Date, months: number): Date {
  const d = new Date(date)
  d.setMonth(d.getMonth() + months)
  return d
}

function MemberDrawer({ memberId, memberIsActive, onClose, onStatusChange }: {
  memberId: string
  memberIsActive: boolean
  onClose: () => void
  onStatusChange: (id: string, isActive: boolean) => void
}) {
  const [detail, setDetail] = useState<MemberDetail | null>(null)
  const [loading, setLoading] = useState(true)
  const [showEdit, setShowEdit] = useState(false)
  const [editStartDate, setEditStartDate] = useState("")
  const [editDuration, setEditDuration] = useState("1")
  const [editEndDate, setEditEndDate] = useState("")
  const [saving, setSaving] = useState(false)
  const [toggling, setToggling] = useState(false)
  const [isActive, setIsActive] = useState(memberIsActive)

  const loadDetail = useCallback(() => {
    setLoading(true)
    fetch(`/api/owner/members/${memberId}`, { credentials: "include", cache: "no-store" })
      .then(r => r.json())
      .then(r => { if (r.success) setDetail(r.data); else toast.error("Failed to load member detail") })
      .catch(() => toast.error("Failed to load member detail"))
      .finally(() => setLoading(false))
  }, [memberId])

  useEffect(() => { loadDetail() }, [loadDetail])

  // Prevent background body scroll when drawer is open
  useEffect(() => {
    const originalStyle = window.getComputedStyle(document.body).overflow
    document.body.style.overflow = "hidden"
    return () => {
      document.body.style.overflow = originalStyle
    }
  }, [])

  // Auto-compute end date when start date or duration changes
  useEffect(() => {
    if (editStartDate && editDuration && editDuration !== "custom") {
      const months = parseInt(editDuration)
      if (!isNaN(months)) {
        const end = addMonths(new Date(editStartDate), months)
        setEditEndDate(end.toISOString().split("T")[0])
      }
    }
  }, [editStartDate, editDuration])

  // Pre-fill from existing membership
  useEffect(() => {
    if (detail?.membership) {
      setEditStartDate(detail.membership.startDate)
      setEditEndDate(detail.membership.endDate)
    }
  }, [detail])

  async function handleSaveMembership() {
    if (!editStartDate || !editEndDate) {
      toast.error("Please fill in both dates")
      return
    }
    setSaving(true)
    try {
      const res = await fetch(`/api/owner/members/${memberId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ startDate: editStartDate, endDate: editEndDate }),
      })
      const result = await res.json()
      if (!result.success) throw new Error(result.error || "Save failed")
      toast.success("Membership updated")
      setShowEdit(false)
      loadDetail()
    } catch (err: any) {
      toast.error(err.message)
    } finally {
      setSaving(false)
    }
  }

  async function handleToggleActive() {
    setToggling(true)
    const next = !isActive
    try {
      const res = await fetch(`/api/owner/members/${memberId}/status`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ is_active: next }),
      })
      const result = await res.json()
      if (!result.success) throw new Error(result.error || "Update failed")
      setIsActive(next)
      onStatusChange(memberId, next)
      toast.success(next ? "Member activated" : "Member deactivated")
    } catch (err: any) {
      toast.error(err.message)
    } finally {
      setToggling(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />

      {/* Panel — full-screen on mobile, right-side panel on md+ */}
      <div className="absolute inset-x-0 bottom-0 z-10 flex max-h-[92dvh] flex-col overflow-hidden rounded-t-2xl border-t border-border bg-background shadow-2xl md:inset-y-0 md:left-auto md:right-0 md:max-h-full md:w-[420px] md:rounded-none md:border-l md:border-t-0">
        {/* Handle bar (mobile only) */}
        <div className="flex justify-center pt-3 pb-1 md:hidden">
          <div className="h-1 w-10 rounded-full bg-border" />
        </div>

        {/* Header */}
        <div className="flex shrink-0 items-center justify-between border-b border-border px-4 py-3">
          <h2 className="text-base font-bold text-foreground">Member Profile</h2>
          <button onClick={onClose} className="rounded-lg p-1.5 text-muted-foreground hover:bg-secondary hover:text-foreground transition-colors">
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Scrollable content */}
        <div
          className="flex-1 overflow-y-auto overscroll-contain"
          style={{ WebkitOverflowScrolling: "touch" }}
        >
          <div className="space-y-4 p-4 pb-28">
            {loading ? (
              <div className="flex h-48 items-center justify-center"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>
            ) : !detail ? (
              <p className="text-sm text-muted-foreground">Profile unavailable.</p>
            ) : (
              <>
                {/* Identity */}
                <div className="flex items-center gap-3">
                  <Avatar className="h-14 w-14 shrink-0">
                    {detail.avatarUrl && <AvatarImage src={detail.avatarUrl} alt={detail.name} />}
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

                {/* Active / Inactive toggle */}
                <div className="flex items-center justify-between rounded-xl border border-border bg-card px-4 py-3">
                  <div>
                    <p className="text-sm font-semibold text-foreground">Member Status</p>
                    <p className="text-xs text-muted-foreground">{isActive ? "Active — can check in" : "Inactive — check-in blocked"}</p>
                  </div>
                  <button
                    onClick={handleToggleActive}
                    disabled={toggling}
                    className="flex items-center gap-1.5 transition-opacity disabled:opacity-60"
                    aria-label="Toggle active status"
                  >
                    {toggling
                      ? <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                      : isActive
                        ? <ToggleRight className="h-8 w-8 text-emerald-500" />
                        : <ToggleLeft className="h-8 w-8 text-muted-foreground" />
                    }
                  </button>
                </div>

                {/* Membership */}
                <div className="mt-2">
                  <div className="flex items-center justify-between mb-1.5">
                    <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground/70">Membership</p>
                    <button
                      onClick={() => setShowEdit(v => !v)}
                      className="flex items-center gap-1 text-xs font-semibold text-primary hover:underline"
                    >
                      <Edit2 className="h-3 w-3" />
                      {showEdit ? "Cancel" : "Edit"}
                    </button>
                  </div>

                  {detail.membership ? (
                    <div className="rounded-xl border border-border bg-card p-3 shadow-sm">
                      <div className="flex justify-between items-center mb-2.5">
                        <StatusPill
                          status={detail.membership.daysLeft <= 0 ? "error" : detail.membership.daysLeft <= 14 ? "warning" : "success"}
                          label={detail.membership.daysLeft <= 0 ? "Expired" : detail.membership.daysLeft <= 14 ? "Expiring Soon" : "Active"} />
                        <span className={`text-sm font-bold ${detail.membership.daysLeft <= 0 ? "text-red-500" : detail.membership.daysLeft <= 14 ? "text-amber-500" : "text-emerald-500"}`}>
                          {detail.membership.daysLeft > 0 ? `${detail.membership.daysLeft}d left` : "Expired"}
                        </span>
                      </div>
                      <div className="flex items-center gap-2 text-sm text-foreground bg-background/50 rounded-lg p-2.5">
                        <span className="font-semibold">{formatDate(detail.membership.startDate)}</span>
                        <span className="text-muted-foreground/50 font-bold">&rarr;</span>
                        <span className="font-semibold">{formatDate(detail.membership.endDate)}</span>
                      </div>
                    </div>
                  ) : (
                    <p className="text-sm text-muted-foreground rounded-xl border border-dashed border-border p-3 text-center">No membership on record</p>
                  )}

                  {/* Edit Form */}
                  {showEdit && (
                    <div className="mt-3 rounded-xl border border-primary/30 bg-primary/5 p-4 space-y-3">
                      <p className="text-[10px] font-bold uppercase tracking-widest text-primary">Edit Membership</p>

                      <div className="space-y-1.5">
                        <label className="text-xs font-semibold text-muted-foreground">Start Date</label>
                        <input
                          type="date"
                          value={editStartDate}
                          onChange={e => { setEditStartDate(e.target.value); setEditDuration("custom") }}
                          className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
                        />
                      </div>

                      <div className="space-y-1.5">
                        <label className="text-xs font-semibold text-muted-foreground">Duration</label>
                        <select
                          value={editDuration}
                          onChange={e => setEditDuration(e.target.value)}
                          className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
                        >
                          <option value="1">1 Month</option>
                          <option value="2">2 Months</option>
                          <option value="3">3 Months</option>
                          <option value="6">6 Months</option>
                          <option value="12">12 Months (1 Year)</option>
                          <option value="custom">Custom End Date</option>
                        </select>
                      </div>

                      <div className="space-y-1.5">
                        <label className="text-xs font-semibold text-muted-foreground">
                          End Date {editDuration !== "custom" && <span className="text-primary">(auto-computed)</span>}
                        </label>
                        <input
                          type="date"
                          value={editEndDate}
                          onChange={e => { setEditEndDate(e.target.value); setEditDuration("custom") }}
                          className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
                        />
                      </div>

                      <Button
                        className="w-full gap-2"
                        onClick={handleSaveMembership}
                        disabled={saving}
                      >
                        {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                        Save Membership
                      </Button>
                    </div>
                  )}
                </div>

                {/* Attendance stats */}
                <div className="mt-6">
                  <p className="mb-1.5 text-[10px] font-bold uppercase tracking-widest text-muted-foreground/70">Attendance</p>
                  <div className="grid grid-cols-2 gap-2">
                    {[
                      { label: "Total visits", value: detail.attendance.total },
                      { label: "This month", value: detail.attendance.thisMonth },
                      { label: "Current streak", value: `${detail.attendance.streak}d` },
                      { label: "Avg session", value: detail.attendance.avgDurationMinutes ? `${detail.attendance.avgDurationMinutes}m` : "N/A" },
                    ].map(stat => (
                      <div key={stat.label} className="flex flex-col justify-center rounded-xl border border-border bg-card p-3 h-[72px] shadow-sm">
                        <p className="text-[10px] font-medium text-muted-foreground/80">{stat.label}</p>
                        <p className="mt-0.5 text-xl font-bold text-foreground leading-none">{stat.value}</p>
                      </div>
                    ))}
                  </div>
                  {detail.attendance.lastDate && (
                    <p className="mt-2 text-[11px] font-medium text-muted-foreground text-right pr-1">Last check-in: {formatDate(detail.attendance.lastDate)}</p>
                  )}
                </div>

                {/* Workout Plan */}
                <div className="mt-6">
                  <p className="mb-1.5 text-[10px] font-bold uppercase tracking-widest text-muted-foreground/70">Workout Plan</p>
                  {detail.workoutPlan ? (
                    <div className="rounded-xl border border-border bg-card p-3 shadow-sm">
                      <div className="mb-2 flex items-center justify-between">
                        <p className="font-semibold text-foreground text-sm">{detail.workoutPlan.title}</p>
                        <StatusPill status={detail.workoutPlan.status === "active" ? "success" : "warning"} label={detail.workoutPlan.status} size="sm" />
                      </div>
                      <div className="flex gap-2 text-xs font-medium text-muted-foreground/80 bg-background/50 rounded-lg p-2.5">
                        <span>{detail.workoutPlan.dayCount} days</span>
                        <span>·</span>
                        <span>{detail.workoutPlan.exerciseCount} exercises</span>
                      </div>
                    </div>
                  ) : (
                    <p className="text-sm text-muted-foreground rounded-xl border border-dashed border-border p-3 text-center">No workout plan assigned</p>
                  )}
                </div>

                {/* Payments */}
                {detail.payments.length > 0 && (
                  <div className="mt-6">
                    <p className="mb-1.5 text-[10px] font-bold uppercase tracking-widest text-muted-foreground/70">Payment History</p>
                    <div className="space-y-2">
                      {detail.payments.slice(0, 8).map(p => (
                        <div key={p.id} className="flex items-center justify-between rounded-xl border border-border bg-card shadow-sm px-3 py-2.5">
                          <div>
                            <p className="text-sm font-bold text-foreground">{formatCurrency(p.amount)}</p>
                            <p className="text-[11px] font-medium text-muted-foreground/80 mt-0.5">{formatDate(p.createdAt)} · {p.paymentMode}</p>
                          </div>
                          <StatusPill status={paymentTone(p.status)} label={p.status} size="sm" />
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Safe area spacer for home indicator and nav padding */}
                <div className="h-24 md:h-8" />
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

  // Optimistically update is_active in local list so the card dims without refetch
  const handleStatusChange = useCallback((id: string, isActive: boolean) => {
    setMembers(prev => prev.map(m => m.id === id ? { ...m, isActive } : m))
  }, [])

  return (
    <div className="max-w-6xl">
      <PageIntro title="Members" description="All gym members — tap any card to see full profile" />

      <SurfaceCard className="mb-6">
        <SearchToolbar value={search} onChange={(v) => { setSearch(v); setCurrentPage(1) }} placeholder="Search by name…"
          filters={[{ value: status, onChange: (v) => { setStatus(v); setCurrentPage(1) }, placeholder: "All Status",
            options: [
              { value: "all", label: "All" },
              { value: "active", label: "Active" },
              { value: "expiring", label: "Expiring" },
              { value: "expired", label: "Expired" },
              { value: "inactive", label: "🔴 Inactive" },
            ] }]} />
      </SurfaceCard>

      {!isLoading && <p className="mb-3 text-xs text-muted-foreground">Showing {members.length} of {total} member{total !== 1 ? "s" : ""}</p>}

      <div className="space-y-2">
        {isLoading
          ? Array.from({ length: 5 }).map((_, i) => <div key={i} className="h-20 animate-pulse rounded-xl border border-border bg-card" />)
          : members.length === 0
          ? <EmptyState icon={hasFilters ? SearchX : Users} title={hasFilters ? "No members found" : "No members yet"}
              description={hasFilters ? "Try adjusting filters." : "Members appear here once signed up."} />
          : members.map(m => (
            <button key={m.id} onClick={() => setSelectedId(m.id)} className="w-full text-left">
              <SurfaceCard interactive className={`hover:border-primary/40 transition-opacity ${!m.isActive ? "opacity-50 grayscale" : ""}`}>
                {/* Mobile: stack vertically. Desktop: single row */}
                <div className="flex items-center gap-3 overflow-hidden">
                  <Avatar className="h-10 w-10 shrink-0">
                    {m.avatarUrl && <AvatarImage src={m.avatarUrl} alt={m.name} />}
                    <AvatarFallback className="bg-primary/10 text-xs font-bold text-primary">{initials(m.name)}</AvatarFallback>
                  </Avatar>
                  <div className="min-w-0 flex-1">
                    {/* Row 1: name + status badges */}
                    <div className="flex flex-wrap items-center gap-1.5 mb-0.5">
                      <span className="truncate font-semibold text-foreground text-sm">{m.name}</span>
                      <StatusPill status={membershipTone(m.membershipStatus)} label={m.membershipStatus === "expiring" ? "Expiring" : m.membershipStatus} size="sm" />
                      {!m.isActive && (
                        <span className="rounded-full bg-red-500/15 px-1.5 py-0.5 text-[10px] font-bold text-red-500">Inactive</span>
                      )}
                    </div>
                    {/* Row 2: email */}
                    <p className="truncate text-xs text-muted-foreground">{m.email ?? "No email"}</p>
                    {/* Row 3: last check-in + days left */}
                    <div className="mt-0.5 flex flex-wrap items-center gap-2">
                      <p className="text-xs text-muted-foreground">
                        {m.lastCheckInRelative === "No attendance" ? "No check-ins yet" : m.lastCheckInRelative}
                      </p>
                      {(m.membershipStatus === "active" || m.membershipStatus === "expiring") && (
                        <p className={`text-xs font-bold ${m.membershipStatus === "expiring" ? "text-amber-500" : "text-emerald-500"}`}>
                          {m.daysRemaining}d left
                        </p>
                      )}
                    </div>
                  </div>
                  {/* Chevron hint */}
                  <span className="shrink-0 text-muted-foreground/40 text-sm">›</span>
                </div>
              </SurfaceCard>
            </button>
          ))
        }
      </div>

      {totalPages > 1 && (
        <div className="mt-6 flex justify-center gap-2">
          <Button size="sm" variant="outline" disabled={currentPage === 1} onClick={() => setCurrentPage(p => p - 1)}>Previous</Button>
          <span className="flex items-center px-3 text-sm text-muted-foreground">{currentPage} / {totalPages}</span>
          <Button size="sm" variant="outline" disabled={currentPage === totalPages} onClick={() => setCurrentPage(p => p + 1)}>Next</Button>
        </div>
      )}

      {/* Bottom spacer — ensures last card clears the fixed nav on all phones */}
      <div className="h-20 lg:hidden" aria-hidden="true" />

      {selectedId && (
        <MemberDrawer
          memberId={selectedId}
          memberIsActive={members.find(m => m.id === selectedId)?.isActive ?? true}
          onClose={() => setSelectedId(null)}
          onStatusChange={handleStatusChange}
        />
      )}
    </div>
  )
}
