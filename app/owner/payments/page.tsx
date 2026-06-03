"use client"

import { useEffect, useMemo, useState } from "react"
import { toast } from "sonner"
import { CheckCircle, Clock, Loader2, XCircle, Eye, Smartphone, Banknote, History } from "lucide-react"
import { Button } from "@/components/ui/button"
import { PageIntro, StatusPill, SurfaceCard } from "@/components/powerhouse"
import { cn } from "@/lib/utils"

interface OwnerPaymentRow {
  id: string
  memberName: string
  amount: number | string
  planDuration: number
  status: string
  paymentMode: "upi" | "cash"
  screenshotUrl?: string
  startDate?: string
  paymentDate?: string
  createdAt: string
  approvedAt?: string | null
}

interface OwnerPaymentsData {
  pending: OwnerPaymentRow[]
  history: OwnerPaymentRow[]
}

function formatCurrency(value: number | string) {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(Number(value))
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat("en-IN", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value))
}

export default function OwnerPaymentsPage() {
  const [data, setData] = useState<OwnerPaymentsData | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [updatingId, setUpdatingId] = useState<string | null>(null)
  const [editedDates, setEditedDates] = useState<Record<string, { planStartDate: string; paymentDate: string }>>({})
  // new state for editable amount and plan duration per payment
  const [editedValues, setEditedValues] = useState<Record<string, { amount?: string; planDuration?: string }>>({})

  const getDatesForPayment = (payment: OwnerPaymentRow) => {
    if (editedDates[payment.id]) {
      return editedDates[payment.id]
    }
    const planStartDate = payment.startDate || new Date().toISOString().split("T")[0]
    const paymentDate = payment.paymentDate || new Date().toISOString().split("T")[0]
    return { planStartDate, paymentDate }
  }

  const setDateValue = (paymentId: string, field: "planStartDate" | "paymentDate", value: string) => {
    setEditedDates(prev => {
      const current = prev[paymentId] || {
        planStartDate: data?.pending.find(p => p.id === paymentId)?.startDate || new Date().toISOString().split("T")[0],
        paymentDate: data?.pending.find(p => p.id === paymentId)?.paymentDate || new Date().toISOString().split("T")[0]
      }
      return {
        ...prev,
        [paymentId]: {
          ...current,
          [field]: value
        }
      }
    })
  }

  const setValue = (paymentId: string, field: "amount" | "planDuration", value: string) => {
    setEditedValues(prev => {
      const current = prev[paymentId] || {}
      return {
        ...prev,
        [paymentId]: {
          ...current,
          [field]: value
        }
      }
    })
  }

  const totals = useMemo(() => {
    const pending = data?.pending ?? []
    const history = data?.history ?? []

    return {
      pendingAmount: pending.reduce(
        (sum, payment) => sum + Number(payment.amount),
        0
      ),
      approvedAmount: history
        .filter((payment) => payment.status === "approved")
        .reduce((sum, payment) => sum + Number(payment.amount), 0),
    }
  }, [data])

  async function loadPayments() {
    try {
      const response = await fetch("/api/owner/payments", {
        credentials: "include",
        cache: "no-store",
      })
      const result = await response.json()

      if (!response.ok || !result.success) {
        throw new Error(result.error || "Unable to load payments")
      }

      setData(result.data)
    } catch (error: any) {
      toast.error("Load failed", { description: error.message })
    }
  }

  useEffect(() => {
    loadPayments().finally(() => setIsLoading(false))
  }, [])

  async function reviewPayment(id: string, status: "approved" | "rejected") {
    setUpdatingId(id)

    try {
      const dates = editedDates[id]
      const values = editedValues[id]
      const response = await fetch("/api/owner/payments", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ 
          id, 
          status,
          planStartDate: status === "approved" ? (dates?.planStartDate || data?.pending.find(p => p.id === id)?.startDate || new Date().toISOString().split("T")[0]) : undefined,
          paymentDate: status === "approved" ? (dates?.paymentDate || data?.pending.find(p => p.id === id)?.paymentDate || new Date().toISOString().split("T")[0]) : undefined,
          amount: status === "approved" && values?.amount !== undefined ? Number(values.amount) : undefined,
          planDuration: status === "approved" && values?.planDuration !== undefined ? Number(values.planDuration) : undefined
        }),
      })
      const result = await response.json()

      if (!response.ok || !result.success) {
        throw new Error(result.error || "Unable to update payment")
      }

      toast.success(status === "approved" ? "Payment approved" : "Payment rejected")
      await loadPayments()
    } catch (error: any) {
      toast.error("Update failed", { description: error.message })
    } finally {
      setUpdatingId(null)
    }
  }

  return (
    <div className="space-y-6 pb-20">
      <PageIntro
        title="Revenue & Approvals"
        subtitle="Verify manual payment requests and digital UPI receipts"
      />

      <div className="grid gap-4 md:grid-cols-3">
        <SurfaceCard className="border-l-4 border-l-primary">
          <Clock className="mb-3 h-5 w-5 text-primary" />
          <p className="text-[10px] uppercase font-bold text-muted-foreground tracking-widest">Pending Requests</p>
          <p className="mt-1 text-2xl font-bold text-foreground tabular-nums">
            {data?.pending.length ?? 0}
          </p>
        </SurfaceCard>
        <SurfaceCard className="border-l-4 border-l-emerald-500">
          <CheckCircle className="mb-3 h-5 w-5 text-emerald-500" />
          <p className="text-[10px] uppercase font-bold text-muted-foreground tracking-widest">Approved Revenue</p>
          <p className="mt-1 text-2xl font-bold text-emerald-500 tabular-nums">
            {formatCurrency(totals.approvedAmount)}
          </p>
        </SurfaceCard>
        <SurfaceCard className="border-l-4 border-l-amber-500">
          <Clock className="mb-3 h-5 w-5 text-amber-500" />
          <p className="text-[10px] uppercase font-bold text-muted-foreground tracking-widest">Pending Amount</p>
          <p className="mt-1 text-2xl font-bold text-amber-500 tabular-nums">
            {formatCurrency(totals.pendingAmount)}
          </p>
        </SurfaceCard>
      </div>

      {isLoading ? (
        <SurfaceCard>
          <div className="flex min-h-40 items-center justify-center">
            <Loader2 className="h-6 w-6 animate-spin text-primary" />
          </div>
        </SurfaceCard>
      ) : (
        <div className="grid gap-6 lg:grid-cols-2">
          {/* Pending Section */}
          <section className="space-y-4">
            <div className="flex items-center gap-2 px-1">
              <Clock className="h-4 w-4 text-primary" />
              <h2 className="text-sm font-bold uppercase tracking-wider text-muted-foreground">Pending Approval</h2>
            </div>
            
            {data?.pending.length ? (
              <div className="space-y-3">
                {data.pending.map((payment) => (
                  <SurfaceCard key={payment.id} className="p-4 group">
                    <div className="flex items-start justify-between gap-4 mb-3">
                      <div>
                        <p className="font-bold text-lg text-foreground leading-tight">{payment.memberName}</p>
                        <div className="flex flex-wrap items-center gap-2 mt-1">
                          <span className={cn(
                            "px-1.5 py-0.5 rounded text-[10px] font-black uppercase tracking-tighter flex items-center gap-1",
                            payment.paymentMode === "upi" ? "bg-primary/10 text-primary" : "bg-secondary text-muted-foreground"
                          )}>
                            {payment.paymentMode === "upi" ? <Smartphone className="h-3 w-3" /> : <Banknote className="h-3 w-3" />}
                            {payment.paymentMode}
                          </span>
                          <span className="text-xs text-muted-foreground">
                            {payment.planDuration} Day Plan
                          </span>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-xl font-black text-foreground">{formatCurrency(payment.amount)}</p>
                        <p className="text-[10px] text-muted-foreground uppercase font-bold">{formatDate(payment.createdAt)}</p>
                      </div>
                    </div>

                    {/* Editable Details for Owner Override */}
                    <div className="grid grid-cols-2 gap-3 pt-3 border-t border-border/30 text-xs my-3 bg-secondary/10 p-3 rounded-lg">
                      <div className="space-y-1">
                        <label className="font-bold text-muted-foreground block">Amount (INR):</label>
                        <input
                          type="number"
                          value={editedValues[payment.id]?.amount !== undefined ? editedValues[payment.id].amount : payment.amount}
                          onChange={(e) => setValue(payment.id, "amount", e.target.value)}
                          className="w-full bg-background border border-border/40 rounded px-2 py-1 text-foreground font-semibold focus:outline-none focus:border-primary"
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="font-bold text-muted-foreground block">Plan Duration (Days):</label>
                        <input
                          type="number"
                          value={editedValues[payment.id]?.planDuration !== undefined ? editedValues[payment.id].planDuration : payment.planDuration}
                          onChange={(e) => setValue(payment.id, "planDuration", e.target.value)}
                          className="w-full bg-background border border-border/40 rounded px-2 py-1 text-foreground font-semibold focus:outline-none focus:border-primary"
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="font-bold text-muted-foreground block">Plan Start Date:</label>
                        <input
                          type="date"
                          value={getDatesForPayment(payment).planStartDate}
                          onChange={(e) => setDateValue(payment.id, "planStartDate", e.target.value)}
                          className="w-full bg-background border border-border/40 rounded px-2 py-1 text-foreground font-semibold focus:outline-none focus:border-primary"
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="font-bold text-muted-foreground block">Payment Date:</label>
                        <input
                          type="date"
                          value={getDatesForPayment(payment).paymentDate}
                          onChange={(e) => setDateValue(payment.id, "paymentDate", e.target.value)}
                          className="w-full bg-background border border-border/40 rounded px-2 py-1 text-foreground font-semibold focus:outline-none focus:border-primary"
                        />
                      </div>
                    </div>

                    <div className="flex flex-wrap items-center gap-3 pt-3 border-t border-border/50">
                      {payment.screenshotUrl && (
                        <Button 
                          variant="secondary" 
                          size="sm" 
                          className="h-9 px-4 font-bold text-xs gap-2"
                          asChild
                        >
                          <a href={payment.screenshotUrl} target="_blank" rel="noreferrer">
                            <Eye className="h-4 w-4" />
                            View Proof
                          </a>
                        </Button>
                      )}
                      <div className="flex-1" />
                      <Button
                        size="sm"
                        className="h-9 px-4 font-bold text-xs gap-2 bg-emerald-500 hover:bg-emerald-600 text-white"
                        onClick={() => reviewPayment(payment.id, "approved")}
                        disabled={!!updatingId}
                      >
                        {updatingId === payment.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle className="h-4 w-4" />}
                        Approve
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-9 px-4 font-bold text-xs gap-2 text-muted-foreground hover:text-red-500 hover:bg-red-500/10"
                        onClick={() => reviewPayment(payment.id, "rejected")}
                        disabled={!!updatingId}
                      >
                        <XCircle className="h-4 w-4" />
                        Reject
                      </Button>
                    </div>
                  </SurfaceCard>
                ))}
              </div>
            ) : (
              <SurfaceCard className="py-12 text-center border-dashed">
                <p className="text-sm text-muted-foreground">No pending requests at the moment.</p>
              </SurfaceCard>
            )}
          </section>

          {/* History Section */}
          <section className="space-y-4">
            <div className="flex items-center gap-2 px-1">
              <History className="h-4 w-4 text-muted-foreground" />
              <h2 className="text-sm font-bold uppercase tracking-wider text-muted-foreground">Recent Decisions</h2>
            </div>

            {data?.history.length ? (
              <div className="space-y-3">
                {data.history.map((payment) => (
                  <div
                    key={payment.id}
                    className="flex flex-col gap-2 p-4 rounded-xl border border-border bg-card/30 hover:bg-card/50 transition-colors"
                  >
                    <div className="flex items-center justify-between gap-4">
                      <div>
                        <p className="font-bold text-foreground">{payment.memberName}</p>
                        <p className="text-xs text-muted-foreground mt-0.5">
                          {formatCurrency(payment.amount)} • {payment.paymentMode.toUpperCase()}
                        </p>
                      </div>
                      <div className="flex items-center gap-3">
                        {payment.screenshotUrl && (
                          <a href={payment.screenshotUrl} target="_blank" rel="noreferrer" className="p-2 rounded-lg bg-secondary/50 text-muted-foreground hover:text-primary transition-colors">
                            <Eye className="h-4 w-4" />
                          </a>
                        )}
                        <StatusPill status={payment.status} size="sm" />
                      </div>
                    </div>
                    {payment.status === "approved" && (
                      <div className="flex items-center gap-4 pt-2 border-t border-border/20 text-[10px] text-muted-foreground">
                        <span><strong className="text-foreground/75">Plan Start:</strong> {payment.startDate ? new Intl.DateTimeFormat("en-IN", { dateStyle: "medium" }).format(new Date(payment.startDate)) : "N/A"}</span>
                        <span><strong className="text-foreground/75">Paid Date:</strong> {(payment as any).paymentDate ? new Intl.DateTimeFormat("en-IN", { dateStyle: "medium" }).format(new Date((payment as any).paymentDate)) : "N/A"}</span>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground px-1">
                Approved and rejected requests will appear here.
              </p>
            )}
          </section>
        </div>
      )}
    </div>
  )
}
