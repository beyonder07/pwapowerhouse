"use client"

import { useEffect, useMemo, useState } from "react"
import { toast } from "sonner"
import { 
  CheckCircle, 
  Clock, 
  Loader2, 
  XCircle, 
  Eye, 
  Smartphone, 
  Banknote, 
  History, 
  ShieldCheck, 
  Users,
  CreditCard
} from "lucide-react"
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

interface OwnerRequestRow {
  id: string
  memberId: string
  trainerId: string | null
  memberName: string
  memberEmail: string
  amount: number
  month: string
  status: string
  createdBy: "trainer" | "member"
  paymentMode: "upi" | "cash" | "card" | "bank-transfer" | "other"
  notes?: string
  screenshotUrl?: string
  createdAt: string
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

function formatMonth(value: string) {
  const [year, month] = value.split("-")
  if (!year || !month) return value
  const date = new Date(Number(year), Number(month) - 1, 1)
  return new Intl.DateTimeFormat("en-US", { month: "long", year: "numeric" }).format(date)
}

function paymentTone(status: string) {
  return (status === "approved" || status === "paid") ? "success" : status === "pending" ? "warning" : "error"
}

export default function OwnerPaymentsPage() {
  const [data, setData] = useState<OwnerPaymentsData | null>(null)
  const [requests, setRequests] = useState<OwnerRequestRow[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [updatingId, setUpdatingId] = useState<string | null>(null)
  
  // Tab State
  const [activeTab, setActiveTab] = useState<"requests" | "receipts" | "history">("requests")

  // Override values for receipts tab
  const [editedDates, setEditedDates] = useState<Record<string, { planStartDate: string; paymentDate: string }>>({})
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
    const requestsAmount = requests.reduce((sum, req) => sum + req.amount, 0)

    return {
      pendingAmount: pending.reduce(
        (sum, payment) => sum + Number(payment.amount),
        0
      ),
      approvedAmount: history
        .filter((payment) => payment.status === "approved")
        .reduce((sum, payment) => sum + Number(payment.amount), 0),
      requestsAmount,
    }
  }, [data, requests])

  async function loadPayments() {
    try {
      const [paymentsRes, requestsRes] = await Promise.all([
        fetch("/api/owner/payments", { credentials: "include", cache: "no-store" }),
        fetch("/api/owner/payments/requests", { credentials: "include", cache: "no-store" })
      ])
      const paymentsResult = await paymentsRes.json()
      const requestsResult = await requestsRes.json()

      if (!paymentsRes.ok || !paymentsResult.success) {
        throw new Error(paymentsResult.error || "Unable to load payments")
      }
      if (!requestsRes.ok || !requestsResult.success) {
        throw new Error(requestsResult.error || "Unable to load requests")
      }

      setData(paymentsResult.data)
      setRequests(requestsResult.data)
    } catch (error: any) {
      toast.error("Load failed", { description: error.message })
    }
  }

  useEffect(() => {
    loadPayments().finally(() => setIsLoading(false))
  }, [])

  // Review Legacy Client Pending Payments
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

  // Review New Trainer/Member Payment Requests (Transactional Database Function)
  async function reviewRequest(requestId: string, status: "approved" | "rejected") {
    setUpdatingId(requestId)

    try {
      const response = await fetch("/api/owner/payments/requests", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ requestId, status }),
      })
      const result = await response.json()

      if (!response.ok || !result.success) {
        throw new Error(result.error || "Unable to update request")
      }

      toast.success(status === "approved" ? "Request approved & membership extended" : "Request rejected")
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
        subtitle="Verify trainer-assisted payment requests and digital client receipts"
      />

      {/* Dashboard KPI Metrics */}
      <div className="grid gap-4 md:grid-cols-3">
        <SurfaceCard className="border-l-4 border-l-primary">
          <ShieldCheck className="mb-3 h-5 w-5 text-primary" />
          <p className="text-[10px] uppercase font-bold text-muted-foreground tracking-widest">Trainer & Member Requests</p>
          <div className="flex items-baseline justify-between mt-1">
            <p className="text-2xl font-bold text-foreground tabular-nums">
              {requests.length}
            </p>
            <p className="text-sm font-semibold text-muted-foreground">
              {formatCurrency(totals.requestsAmount)}
            </p>
          </div>
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
          <p className="text-[10px] uppercase font-bold text-muted-foreground tracking-widest">Pending Client Receipts</p>
          <div className="flex items-baseline justify-between mt-1">
            <p className="text-2xl font-bold text-amber-500 tabular-nums">
              {data?.pending.length ?? 0}
            </p>
            <p className="text-sm font-semibold text-amber-500">
              {formatCurrency(totals.pendingAmount)}
            </p>
          </div>
        </SurfaceCard>
      </div>

      {/* Custom Premium Tabs Selector */}
      <div className="flex border-b border-border/50 gap-2 overflow-x-auto pb-px">
        {[
          { id: "requests", label: `Payment Requests (${requests.length})`, icon: ShieldCheck },
          { id: "receipts", label: `Digital Receipts (${data?.pending.length ?? 0})`, icon: Smartphone },
          { id: "history", label: `Recent Decisions (${data?.history.length ?? 0})`, icon: History }
        ].map((tab) => {
          const Icon = tab.icon
          const active = activeTab === tab.id
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={cn(
                "flex items-center gap-2 pb-3 px-4 font-bold text-xs uppercase tracking-wider border-b-2 transition-all focus:outline-none whitespace-nowrap",
                active 
                  ? "border-primary text-primary" 
                  : "border-transparent text-muted-foreground hover:text-foreground"
              )}
            >
              <Icon className="h-4 w-4" />
              {tab.label}
            </button>
          )
        })}
      </div>

      {isLoading ? (
        <SurfaceCard>
          <div className="flex min-h-40 items-center justify-center">
            <Loader2 className="h-6 w-6 animate-spin text-primary" />
          </div>
        </SurfaceCard>
      ) : (
        <div className="space-y-4">
          {/* Tab 1: Payment Requests (New Trainer / Member System) */}
          {activeTab === "requests" && (
            <section className="space-y-4 max-w-4xl">
              {requests.length ? (
                <div className="grid gap-3">
                  {requests.map((req) => (
                    <SurfaceCard key={req.id} className="p-4">
                      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
                        <div className="space-y-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <h3 className="font-bold text-base text-foreground truncate">{req.memberName}</h3>
                            <span className={cn(
                              "px-2 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-wider",
                              req.createdBy === "trainer" ? "bg-primary/10 text-primary" : "bg-blue-500/10 text-blue-500"
                            )}>
                              {req.createdBy === "trainer" ? "Trainer Assisted" : "Member Direct"}
                            </span>
                          </div>
                          <p className="text-xs text-muted-foreground truncate">{req.memberEmail}</p>
                          <div className="flex items-center gap-4 text-xs font-semibold text-foreground/80 mt-1">
                            <span className="flex items-center gap-1">
                              <Smartphone className="h-3.5 w-3.5 text-muted-foreground" />
                              Mode: <strong className="uppercase text-foreground">{req.paymentMode}</strong>
                            </span>
                            <span className="flex items-center gap-1">
                              <Clock className="h-3.5 w-3.5 text-muted-foreground" />
                              Month: <strong className="text-foreground">{formatMonth(req.month)}</strong>
                            </span>
                          </div>
                          {req.notes && (
                            <p className="text-xs text-muted-foreground italic bg-secondary/30 p-2 rounded-lg mt-2 border border-border/20">
                              Notes: {req.notes}
                            </p>
                          )}
                        </div>

                        <div className="flex flex-row sm:flex-col items-end gap-3 sm:gap-2 w-full sm:w-auto shrink-0 border-t sm:border-t-0 pt-3 sm:pt-0 border-border/30 justify-between sm:justify-start">
                          <div className="text-left sm:text-right">
                            <p className="text-xl font-black text-foreground">{formatCurrency(req.amount)}</p>
                            <p className="text-[9px] text-muted-foreground uppercase font-bold tracking-wider">Submitted {formatDate(req.createdAt)}</p>
                          </div>
                          
                          <div className="flex gap-2">
                            {req.screenshotUrl && (
                              <Button variant="secondary" size="sm" className="h-8 text-xs font-bold gap-1" asChild>
                                <a href={req.screenshotUrl} target="_blank" rel="noreferrer">
                                  <Eye className="h-3.5 w-3.5" />
                                  Proof
                                </a>
                              </Button>
                            )}
                            <Button
                              size="sm"
                              className="h-8 text-xs font-bold gap-1 bg-emerald-500 hover:bg-emerald-600 text-white"
                              onClick={() => reviewRequest(req.id, "approved")}
                              disabled={!!updatingId}
                            >
                              {updatingId === req.id ? <Loader2 className="h-3 w-3 animate-spin" /> : <CheckCircle className="h-3.5 w-3.5" />}
                              Approve
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-8 text-xs font-bold gap-1 text-muted-foreground hover:text-red-500 hover:bg-red-500/10"
                              onClick={() => reviewRequest(req.id, "rejected")}
                              disabled={!!updatingId}
                            >
                              <XCircle className="h-3.5 w-3.5" />
                              Reject
                            </Button>
                          </div>
                        </div>
                      </div>
                    </SurfaceCard>
                  ))}
                </div>
              ) : (
                <SurfaceCard className="py-12 text-center border-dashed border-2">
                  <p className="text-sm text-muted-foreground font-semibold">No pending payment requests at the moment.</p>
                </SurfaceCard>
              )}
            </section>
          )}

          {/* Tab 2: Digital Receipts (Legacy Client Payments) */}
          {activeTab === "receipts" && (
            <section className="space-y-4 max-w-4xl">
              {data?.pending.length ? (
                <div className="grid gap-3">
                  {data.pending.map((payment) => (
                    <SurfaceCard key={payment.id} className="p-4">
                      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
                        <div className="space-y-1 min-w-0">
                          <h3 className="font-bold text-base text-foreground truncate">{payment.memberName}</h3>
                          <div className="flex items-center gap-4 text-xs font-semibold text-foreground/80 mt-1">
                            <span className="flex items-center gap-1">
                              {payment.paymentMode === "upi" ? <Smartphone className="h-3.5 w-3.5" /> : <Banknote className="h-3.5 w-3.5" />}
                              Mode: <strong className="uppercase text-foreground">{payment.paymentMode}</strong>
                            </span>
                            <span>{payment.planDuration} Days Plan</span>
                          </div>

                          {/* Editable Details for Owner Override */}
                          <div className="grid grid-cols-2 gap-3 pt-3 text-xs my-2 bg-secondary/25 p-3 rounded-xl border border-border/20 max-w-md">
                            <div className="space-y-1">
                              <label className="font-bold text-muted-foreground/80 block">Amount (INR):</label>
                              <input
                                type="number"
                                value={editedValues[payment.id]?.amount !== undefined ? editedValues[payment.id].amount : payment.amount}
                                onChange={(e) => setValue(payment.id, "amount", e.target.value)}
                                className="w-full bg-background border border-border/40 rounded-lg px-2.5 py-1.5 text-foreground font-bold focus:outline-none focus:border-primary"
                              />
                            </div>
                            <div className="space-y-1">
                              <label className="font-bold text-muted-foreground/80 block">Plan Duration (Days):</label>
                              <input
                                type="number"
                                value={editedValues[payment.id]?.planDuration !== undefined ? editedValues[payment.id].planDuration : payment.planDuration}
                                onChange={(e) => setValue(payment.id, "planDuration", e.target.value)}
                                className="w-full bg-background border border-border/40 rounded-lg px-2.5 py-1.5 text-foreground font-bold focus:outline-none focus:border-primary"
                              />
                            </div>
                            <div className="space-y-1">
                              <label className="font-bold text-muted-foreground/80 block">Plan Start Date:</label>
                              <input
                                type="date"
                                value={getDatesForPayment(payment).planStartDate}
                                onChange={(e) => setDateValue(payment.id, "planStartDate", e.target.value)}
                                className="w-full bg-background border border-border/40 rounded-lg px-2.5 py-1.5 text-foreground font-bold focus:outline-none focus:border-primary"
                              />
                            </div>
                            <div className="space-y-1">
                              <label className="font-bold text-muted-foreground/80 block">Payment Date:</label>
                              <input
                                type="date"
                                value={getDatesForPayment(payment).paymentDate}
                                onChange={(e) => setDateValue(payment.id, "paymentDate", e.target.value)}
                                className="w-full bg-background border border-border/40 rounded-lg px-2.5 py-1.5 text-foreground font-bold focus:outline-none focus:border-primary"
                              />
                            </div>
                          </div>
                        </div>

                        <div className="flex flex-row sm:flex-col items-end gap-3 sm:gap-2 w-full sm:w-auto shrink-0 border-t sm:border-t-0 pt-3 sm:pt-0 border-border/30 justify-between sm:justify-start">
                          <div className="text-left sm:text-right">
                            <p className="text-xl font-black text-foreground">{formatCurrency(payment.amount)}</p>
                            <p className="text-[9px] text-muted-foreground uppercase font-bold tracking-wider">Submitted {formatDate(payment.createdAt)}</p>
                          </div>
                          
                          <div className="flex gap-2">
                            {payment.screenshotUrl && (
                              <Button variant="secondary" size="sm" className="h-8 text-xs font-bold gap-1" asChild>
                                <a href={payment.screenshotUrl} target="_blank" rel="noreferrer">
                                  <Eye className="h-3.5 w-3.5" />
                                  Proof
                                </a>
                              </Button>
                            )}
                            <Button
                              size="sm"
                              className="h-8 text-xs font-bold gap-1 bg-emerald-500 hover:bg-emerald-600 text-white"
                              onClick={() => reviewPayment(payment.id, "approved")}
                              disabled={!!updatingId}
                            >
                              {updatingId === payment.id ? <Loader2 className="h-3 w-3 animate-spin" /> : <CheckCircle className="h-3.5 w-3.5" />}
                              Approve
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-8 text-xs font-bold gap-1 text-muted-foreground hover:text-red-500 hover:bg-red-500/10"
                              onClick={() => reviewPayment(payment.id, "rejected")}
                              disabled={!!updatingId}
                            >
                              <XCircle className="h-3.5 w-3.5" />
                              Reject
                            </Button>
                          </div>
                        </div>
                      </div>
                    </SurfaceCard>
                  ))}
                </div>
              ) : (
                <SurfaceCard className="py-12 text-center border-dashed border-2">
                  <p className="text-sm text-muted-foreground font-semibold">No pending receipts at the moment.</p>
                </SurfaceCard>
              )}
            </section>
          )}

          {/* Tab 3: Recent Decisions (History) */}
          {activeTab === "history" && (
            <section className="space-y-4 max-w-4xl">
              {data?.history.length ? (
                <div className="grid gap-3">
                  {data.history.map((payment) => (
                    <div
                      key={payment.id}
                      className="flex flex-col gap-2 p-4 rounded-xl border border-border bg-card/30 hover:bg-card/50 transition-colors"
                    >
                      <div className="flex items-center justify-between gap-4">
                        <div>
                          <p className="font-bold text-foreground">{payment.memberName}</p>
                          <p className="text-xs text-muted-foreground mt-0.5">
                            {formatCurrency(payment.amount)} • <span className="uppercase">{payment.paymentMode}</span>
                          </p>
                        </div>
                        <div className="flex items-center gap-3">
                          {payment.screenshotUrl && (
                            <a href={payment.screenshotUrl} target="_blank" rel="noreferrer" className="p-2 rounded-lg bg-secondary/50 text-muted-foreground hover:text-primary transition-colors">
                              <Eye className="h-4 w-4" />
                            </a>
                          )}
                          <StatusPill status={paymentTone(payment.status)} size="sm" label={payment.status} />
                        </div>
                      </div>
                      
                      <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 pt-2 border-t border-border/20 text-[10px] text-muted-foreground font-bold">
                        {payment.status === "approved" && (
                          <>
                            <span>Plan Start: {payment.startDate ? new Intl.DateTimeFormat("en-IN", { dateStyle: "medium" }).format(new Date(payment.startDate)) : "N/A"}</span>
                            <span className="text-border">|</span>
                            <span>Paid Date: {payment.paymentDate ? new Intl.DateTimeFormat("en-IN", { dateStyle: "medium" }).format(new Date(payment.paymentDate)) : "N/A"}</span>
                          </>
                        )}
                        {(payment as any).month && (
                          <>
                            {payment.status === "approved" && <span className="text-border">|</span>}
                            <span>Month: {(payment as any).month}</span>
                          </>
                        )}
                        {(payment as any).createdBy && (
                          <>
                            <span className="text-border">|</span>
                            <span>
                              {(payment as any).createdBy === "trainer" ? "Submitted by Trainer" : "Submitted by Member"}
                            </span>
                          </>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground px-1 py-4">
                  Approved and rejected requests will appear here.
                </p>
              )}
            </section>
          )}
        </div>
      )}
    </div>
  )
}
