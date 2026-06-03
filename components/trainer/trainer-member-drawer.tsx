"use client"

import { useCallback, useEffect, useState } from "react"
import { toast } from "sonner"
import { 
  X, 
  Loader2, 
  Phone, 
  Mail, 
  Calendar, 
  Dumbbell, 
  Target, 
  Banknote, 
  Smartphone, 
  CreditCard,
  Plus,
  AlertTriangle,
  Upload,
  ImageIcon,
  ShieldCheck,
  History
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { StatusPill } from "@/components/powerhouse"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"

interface MemberDetail {
  id: string
  name: string
  email: string | null
  phone: string | null
  avatarUrl: string | null
  joinDate: string
  membership: {
    status: string
    startDate: string
    endDate: string
    daysLeft: number
  } | null
  attendance: {
    total: number
    thisMonth: number
    streak: number
    avgDurationMinutes: number | null
    lastDate: string | null
  }
  workoutPlan: {
    title: string
    status: string
    dayCount: number
    exerciseCount: number
    updatedAt: string
  } | null
  payments: Array<{
    id: string
    amount: number
    planDuration: number | null
    month: string | null
    status: string
    paymentMode: string
    createdAt: string
    approvedAt: string | null
    source: string | null
    createdBy: string | null
    isRequest: boolean
    notes?: string
    screenshotUrl?: string
  }>
}

function initials(name: string) {
  return name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("")
}

function formatDate(value?: string | null) {
  if (!value) return "Not available"
  return new Intl.DateTimeFormat("en-IN", { dateStyle: "medium" }).format(
    new Date(value)
  )
}

function formatCurrency(value: number | string) {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(Number(value))
}

function paymentTone(status: string) {
  switch (status) {
    case "approved":
    case "paid":
      return "success"
    case "pending":
      return "warning"
    case "rejected":
    case "failed":
      return "error"
    default:
      return "neutral"
  }
}

export default function TrainerMemberDrawer({
  memberId,
  onClose,
}: {
  memberId: string
  onClose: () => void
}) {
  const [detail, setDetail] = useState<MemberDetail | null>(null)
  const [loading, setLoading] = useState(true)
  const [showPaymentForm, setShowPaymentForm] = useState(false)

  // Payment Form State
  const [amount, setAmount] = useState("2000")
  const [paymentMode, setPaymentMode] = useState<"cash" | "upi" | "card">("upi")
  const [month, setMonth] = useState(() => {
    const nextMonth = new Date()
    nextMonth.setMonth(nextMonth.getMonth() + 1)
    return nextMonth.toISOString().slice(0, 7) // Default to next month: YYYY-MM
  })
  const [notes, setNotes] = useState("")
  const [screenshotUrl, setScreenshotUrl] = useState("")
  const [isUploading, setIsUploading] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)

  // Duplicate Check warning
  const [duplicateWarning, setDuplicateWarning] = useState<{
    exists: boolean
    type: "request" | "payment" | null
  } | null>(null)
  const [isCheckingDuplicate, setIsCheckingDuplicate] = useState(false)

  const loadDetail = useCallback(() => {
    setLoading(true)
    fetch(`/api/trainer/members/${memberId}`, {
      credentials: "include",
      cache: "no-store",
    })
      .then((r) => r.json())
      .then((r) => {
        if (r.success) setDetail(r.data)
        else toast.error("Failed to load member detail")
      })
      .catch(() => toast.error("Failed to load member detail"))
      .finally(() => setLoading(false))
  }, [memberId])

  useEffect(() => {
    loadDetail()
  }, [loadDetail])

  // Prevent background body scroll when drawer is open
  useEffect(() => {
    const originalStyle = document.body.style.overflowY
    document.body.style.overflowY = "hidden"
    return () => {
      document.body.style.overflowY = originalStyle
    }
  }, [])

  // Run duplicate check when month or memberId changes
  useEffect(() => {
    if (!month || !memberId) return

    setIsCheckingDuplicate(true)
    fetch(
      `/api/trainer/payments/check-duplicate?memberId=${memberId}&month=${month}`,
      { credentials: "include" }
    )
      .then((r) => r.json())
      .then((r) => {
        if (r.success) {
          setDuplicateWarning(r.data)
        }
      })
      .catch(() => {})
      .finally(() => setIsCheckingDuplicate(false))
  }, [month, memberId])

  async function handleFileUpload(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0]
    if (!file) return

    setIsUploading(true)
    try {
      const formData = new FormData()
      formData.append("file", file)

      const response = await fetch("/api/client/payments/upload", {
        method: "POST",
        credentials: "include",
        body: formData,
      })
      const result = await response.json()

      if (!response.ok || !result.success) {
        throw new Error(result.error || "Unable to upload screenshot")
      }

      setScreenshotUrl(result.data.publicUrl)
      toast.success("Screenshot uploaded successfully")
    } catch (error: any) {
      toast.error("Upload failed", { description: error.message })
    } finally {
      setIsUploading(false)
    }
  }

  async function handlePaymentSubmit(event: React.FormEvent) {
    event.preventDefault()

    if (duplicateWarning?.exists) {
      const msg =
        duplicateWarning.type === "request"
          ? "A pending payment request already exists for this month."
          : "Payment has already been made/approved for this month."
      toast.error("Duplicate Entry Blocked", { description: msg })
      return
    }

    if (paymentMode === "upi" && !screenshotUrl) {
      toast.error("Screenshot required", {
        description: "UPI payments require screenshot confirmation.",
      })
      return
    }

    setIsSubmitting(true)
    try {
      const response = await fetch("/api/trainer/payments/request", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          memberId,
          amount: Number(amount),
          month,
          paymentMode,
          notes: notes || undefined,
          screenshotUrl: paymentMode === "upi" ? screenshotUrl : undefined,
        }),
      })

      const result = await response.json()

      if (!response.ok || !result.success) {
        throw new Error(result.error || "Failed to create payment request")
      }

      toast.success("Payment request submitted", {
        description: "Sent to Owner for manual approval.",
      })
      setShowPaymentForm(false)
      setNotes("")
      setScreenshotUrl("")
      loadDetail()
    } catch (error: any) {
      toast.error("Submission failed", { description: error.message })
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Panel */}
      <div className="absolute inset-x-0 bottom-0 z-10 flex h-[92dvh] md:h-full min-h-0 flex-col overflow-hidden rounded-t-2xl border-t border-border bg-background shadow-2xl md:inset-y-0 md:left-auto md:right-0 md:max-h-full md:w-[420px] md:rounded-none md:border-l md:border-t-0">
        {/* Handle bar (mobile only) */}
        <div className="flex shrink-0 justify-center pt-3 pb-1 md:hidden">
          <div className="h-1 w-10 rounded-full bg-border" />
        </div>

        {/* Header */}
        <div className="flex shrink-0 items-center justify-between border-b border-border px-4 py-3">
          <h2 className="text-base font-bold text-foreground">Member Profile</h2>
          <button
            onClick={onClose}
            className="rounded-lg p-1.5 text-muted-foreground hover:bg-secondary hover:text-foreground transition-colors"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Scrollable content */}
        <div
          className="flex-1 min-h-0 overflow-y-auto page-scroll"
          style={{ WebkitOverflowScrolling: "touch", touchAction: "pan-y", height: "auto" }}
        >
          <div className="space-y-5 p-4 pb-28">
            {loading ? (
              <div className="flex h-48 items-center justify-center">
                <Loader2 className="h-6 w-6 animate-spin text-primary" />
              </div>
            ) : !detail ? (
              <p className="text-sm text-muted-foreground">Profile unavailable.</p>
            ) : (
              <>
                {/* Identity */}
                <div className="flex items-center gap-3">
                  <Avatar className="h-14 w-14 shrink-0">
                    {detail.avatarUrl && (
                      <AvatarImage src={detail.avatarUrl} alt={detail.name} />
                    )}
                    <AvatarFallback className="bg-primary/10 text-base font-bold text-primary">
                      {initials(detail.name)}
                    </AvatarFallback>
                  </Avatar>
                  <div className="min-w-0 flex-1">
                    <h3 className="text-base font-bold text-foreground truncate">
                      {detail.name}
                    </h3>
                    {detail.email && (
                      <a
                        href={`mailto:${detail.email}`}
                        className="block truncate text-xs text-primary hover:underline"
                      >
                        {detail.email}
                      </a>
                    )}
                    {detail.phone && (
                      <a
                        href={`tel:${detail.phone}`}
                        className="block text-xs text-muted-foreground hover:text-foreground"
                      >
                        {detail.phone}
                      </a>
                    )}
                    <p className="text-xs text-muted-foreground">
                      Joined {formatDate(detail.joinDate)}
                    </p>
                  </div>
                </div>

                {/* Trainer Action Button */}
                <Button
                  className="w-full gap-2 font-bold bg-primary hover:bg-primary/95 text-white"
                  onClick={() => setShowPaymentForm(true)}
                >
                  <Plus className="h-4 w-4" />
                  Create Payment
                </Button>

                {/* Membership */}
                <div className="mt-2">
                  <p className="mb-1.5 text-[10px] font-bold uppercase tracking-widest text-muted-foreground/70">
                    Membership
                  </p>
                  {detail.membership ? (
                    <div className="rounded-xl border border-border bg-card p-3 shadow-sm">
                      <div className="flex justify-between items-center mb-2.5">
                        <StatusPill
                          status={
                            detail.membership.daysLeft <= 0
                              ? "error"
                              : detail.membership.daysLeft <= 14
                              ? "warning"
                              : "success"
                          }
                          label={
                            detail.membership.daysLeft <= 0
                              ? "Expired"
                              : detail.membership.daysLeft <= 14
                              ? "Expiring Soon"
                              : "Active"
                          }
                        />
                        <span
                          className={`text-sm font-bold ${
                            detail.membership.daysLeft <= 0
                              ? "text-red-500"
                              : detail.membership.daysLeft <= 14
                              ? "text-amber-500"
                              : "text-emerald-500"
                          }`}
                        >
                          {detail.membership.daysLeft > 0
                            ? `${detail.membership.daysLeft}d left`
                            : "Expired"}
                        </span>
                      </div>
                      <div className="flex items-center gap-2 text-sm text-foreground bg-background/50 rounded-lg p-2.5">
                        <span className="font-semibold">
                          {formatDate(detail.membership.startDate)}
                        </span>
                        <span className="text-muted-foreground/50 font-bold">
                          &rarr;
                        </span>
                        <span className="font-semibold">
                          {formatDate(detail.membership.endDate)}
                        </span>
                      </div>
                    </div>
                  ) : (
                    <p className="text-sm text-muted-foreground rounded-xl border border-dashed border-border p-3 text-center">
                      No membership on record
                    </p>
                  )}
                </div>

                {/* Attendance Stats */}
                <div>
                  <p className="mb-1.5 text-[10px] font-bold uppercase tracking-widest text-muted-foreground/70">
                    Attendance
                  </p>
                  <div className="grid grid-cols-2 gap-2">
                    {[
                      { label: "Total visits", value: detail.attendance.total },
                      { label: "This month", value: detail.attendance.thisMonth },
                      {
                        label: "Current streak",
                        value: `${detail.attendance.streak}d`,
                      },
                      {
                        label: "Avg session",
                        value: detail.attendance.avgDurationMinutes
                          ? `${detail.attendance.avgDurationMinutes}m`
                          : "N/A",
                      },
                    ].map((stat) => (
                      <div
                        key={stat.label}
                        className="flex flex-col justify-center rounded-xl border border-border bg-card p-3 h-[72px] shadow-sm"
                      >
                        <p className="text-[10px] font-medium text-muted-foreground/80">
                          {stat.label}
                        </p>
                        <p className="mt-0.5 text-xl font-bold text-foreground leading-none">
                          {stat.value}
                        </p>
                      </div>
                    ))}
                  </div>
                  {detail.attendance.lastDate && (
                    <p className="mt-2 text-[11px] font-medium text-muted-foreground text-right pr-1">
                      Last check-in: {formatDate(detail.attendance.lastDate)}
                    </p>
                  )}
                </div>

                {/* Workout Plan */}
                <div>
                  <p className="mb-1.5 text-[10px] font-bold uppercase tracking-widest text-muted-foreground/70">
                    Workout Plan
                  </p>
                  {detail.workoutPlan ? (
                    <div className="rounded-xl border border-border bg-card p-3 shadow-sm">
                      <div className="mb-2 flex items-center justify-between">
                        <p className="font-semibold text-foreground text-sm">
                          {detail.workoutPlan.title}
                        </p>
                        <StatusPill
                          status={
                            detail.workoutPlan.status === "active"
                              ? "success"
                              : "warning"
                          }
                          label={detail.workoutPlan.status}
                          size="sm"
                        />
                      </div>
                      <div className="flex gap-2 text-xs font-medium text-muted-foreground/80 bg-background/50 rounded-lg p-2.5">
                        <span>{detail.workoutPlan.dayCount} days</span>
                        <span>·</span>
                        <span>{detail.workoutPlan.exerciseCount} exercises</span>
                      </div>
                    </div>
                  ) : (
                    <p className="text-sm text-muted-foreground rounded-xl border border-dashed border-border p-3 text-center">
                      No workout plan assigned
                    </p>
                  )}
                </div>

                {/* Unified Payment History */}
                <div>
                  <p className="mb-1.5 text-[10px] font-bold uppercase tracking-widest text-muted-foreground/70">
                    Payment History & Requests
                  </p>
                  {detail.payments.length > 0 ? (
                    <div className="space-y-2">
                      {detail.payments.slice(0, 10).map((p) => (
                        <div
                          key={p.id}
                          className="flex flex-col gap-1.5 rounded-xl border border-border bg-card shadow-sm px-3 py-2.5"
                        >
                          <div className="flex items-center justify-between">
                            <div>
                              <p className="text-sm font-bold text-foreground">
                                {formatCurrency(p.amount)}
                              </p>
                              <p className="text-[11px] font-medium text-muted-foreground/80 mt-0.5">
                                {formatDate(p.createdAt)} ·{" "}
                                <span className="uppercase">{p.paymentMode}</span>
                              </p>
                            </div>
                            <StatusPill status={paymentTone(p.status)} label={p.status} size="sm" />
                          </div>

                          {/* Info Labels: Month + Creator info */}
                          <div className="flex flex-wrap items-center gap-2 pt-1.5 border-t border-border/20 text-[10px] text-muted-foreground font-semibold">
                            {p.month && (
                              <span className="bg-secondary/40 px-1.5 py-0.5 rounded text-foreground/80">
                                Month: {p.month}
                              </span>
                            )}
                            {p.createdBy && (
                              <span className="bg-secondary/40 px-1.5 py-0.5 rounded text-foreground/80">
                                {p.createdBy === "trainer"
                                  ? "Submitted by Trainer"
                                  : "Submitted by Member"}
                              </span>
                            )}
                            {p.screenshotUrl && (
                              <a
                                href={p.screenshotUrl}
                                target="_blank"
                                rel="noreferrer"
                                className="text-primary hover:underline flex items-center gap-0.5 ml-auto"
                              >
                                <History className="h-3 w-3" /> View Proof
                              </a>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-sm text-muted-foreground rounded-xl border border-dashed border-border p-3 text-center">
                      No payment records found
                    </p>
                  )}
                </div>

                <div className="h-24 md:h-8" />
              </>
            )}
          </div>
        </div>
      </div>

      {/* Payment Form Dialog */}
      <Dialog open={showPaymentForm} onOpenChange={setShowPaymentForm}>
        <DialogContent className="sm:max-w-[420px] bg-background border border-border shadow-2xl rounded-2xl">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold text-foreground flex items-center gap-2">
              <ShieldCheck className="h-5 w-5 text-primary" />
              Create Payment Request
            </DialogTitle>
          </DialogHeader>

          <form onSubmit={handlePaymentSubmit} className="space-y-4 pt-2">
            {/* Payment Mode Selection */}
            <div className="space-y-1.5">
              <Label className="text-xs font-bold text-muted-foreground">
                Payment Mode
              </Label>
              <div className="grid grid-cols-3 gap-2">
                {[
                  { id: "upi", label: "UPI", icon: Smartphone },
                  { id: "cash", label: "Cash", icon: Banknote },
                  { id: "card", label: "Card", icon: CreditCard },
                ].map((mode) => {
                  const Icon = mode.icon
                  const active = paymentMode === mode.id
                  return (
                    <button
                      key={mode.id}
                      type="button"
                      onClick={() => setPaymentMode(mode.id as any)}
                      className={`flex flex-col items-center justify-center gap-1.5 py-2 px-1 rounded-xl border text-xs font-bold transition-all ${
                        active
                          ? "bg-primary/10 border-primary text-primary"
                          : "border-border/60 text-muted-foreground hover:bg-secondary/40"
                      }`}
                    >
                      <Icon className="h-4 w-4" />
                      {mode.label}
                    </button>
                  )
                })}
              </div>
            </div>

            {/* Amount Field */}
            <div className="space-y-1.5">
              <Label htmlFor="req-amount" className="text-xs font-bold text-muted-foreground">
                Amount (INR)
              </Label>
              <Input
                id="req-amount"
                type="number"
                inputMode="numeric"
                min="1"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                required
                className="font-bold text-lg bg-background border-border/60 text-foreground"
              />
            </div>

            {/* Month Field (HTML5 Month Input) */}
            <div className="space-y-1.5">
              <Label htmlFor="req-month" className="text-xs font-bold text-muted-foreground">
                Month
              </Label>
              <Input
                id="req-month"
                type="month"
                value={month}
                onChange={(e) => setMonth(e.target.value)}
                required
                className="font-semibold text-foreground bg-background border-border/60"
              />

              {/* Real-time duplicate validation label */}
              {isCheckingDuplicate && (
                <div className="flex items-center gap-1.5 text-xs text-muted-foreground mt-1">
                  <Loader2 className="h-3 w-3 animate-spin" />
                  Checking duplication...
                </div>
              )}

              {!isCheckingDuplicate && duplicateWarning?.exists && (
                <div className="flex items-start gap-1.5 text-xs text-red-500 bg-red-500/10 border border-red-500/20 p-2.5 rounded-lg mt-1 font-semibold">
                  <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5" />
                  <div>
                    {duplicateWarning.type === "request"
                      ? "Member already submitted a pending request for this month."
                      : "A payment already exists for this month."}
                  </div>
                </div>
              )}
            </div>

            {/* Notes Field */}
            <div className="space-y-1.5">
              <Label htmlFor="req-notes" className="text-xs font-bold text-muted-foreground">
                Notes (Optional)
              </Label>
              <Textarea
                id="req-notes"
                placeholder="Add payment context, transaction ID, etc."
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={2}
                className="text-sm bg-background border-border/60 text-foreground"
              />
            </div>

            {/* Screenshot Upload (Mandatory for UPI) */}
            {paymentMode === "upi" && (
              <div className="p-3 bg-secondary/15 rounded-xl border-2 border-dashed border-border flex flex-col items-center justify-center text-center gap-2">
                {screenshotUrl ? (
                  <div className="flex items-center gap-2 text-emerald-500 font-bold text-xs">
                    <ImageIcon className="h-4 w-4" />
                    Screenshot uploaded
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setScreenshotUrl("")}
                      className="text-muted-foreground hover:text-red-500 h-7 px-2"
                    >
                      Remove
                    </Button>
                  </div>
                ) : (
                  <>
                    <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center">
                      <Upload className="h-4 w-4 text-primary" />
                    </div>
                    <div className="space-y-0.5">
                      <p className="text-xs font-bold">Upload Receipt Screenshot</p>
                      <p className="text-[10px] text-muted-foreground">
                        Mandatory for UPI verification
                      </p>
                    </div>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleFileUpload}
                      className="hidden"
                      id="trainer-screenshot-upload"
                      disabled={isUploading}
                    />
                    <Button
                      asChild
                      variant="secondary"
                      size="sm"
                      disabled={isUploading}
                      className="h-8 text-xs"
                    >
                      <label
                        htmlFor="trainer-screenshot-upload"
                        className="cursor-pointer font-bold"
                      >
                        {isUploading ? (
                          <Loader2 className="h-3 w-3 animate-spin" />
                        ) : (
                          "Choose File"
                        )}
                      </label>
                    </Button>
                  </>
                )}
              </div>
            )}

            {/* Submit Button */}
            <div className="pt-2 flex justify-end gap-2">
              <Button
                type="button"
                variant="ghost"
                onClick={() => setShowPaymentForm(false)}
                disabled={isSubmitting}
                className="text-xs font-bold"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={
                  isSubmitting ||
                  isUploading ||
                  (duplicateWarning?.exists ?? false)
                }
                className="gap-2 font-bold text-xs text-white"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    Submitting...
                  </>
                ) : (
                  <>
                    <ShieldCheck className="h-3.5 w-3.5" />
                    Submit Request
                  </>
                )}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}
