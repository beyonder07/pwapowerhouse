"use client"

import { FormEvent, useEffect, useMemo, useState } from "react"
import { toast } from "sonner"
import { Banknote, CreditCard, Download, Image as ImageIcon, Loader2, PlusCircle, ShieldCheck, Smartphone, Upload } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { PageIntro, StatusPill, SurfaceCard } from "@/components/powerhouse"
import { cn } from "@/lib/utils"

interface PaymentRow {
  id: string
  amount: number | string
  planDuration: number
  status: string
  paymentMode: "upi" | "cash"
  screenshotUrl?: string
  createdAt: string
  approvedAt: string | null
}

interface PaymentsData {
  currentPlan: {
    id: string
    status: "active" | "expired"
    startDate: string
    endDate: string
    daysRemaining: number
  } | null
  pendingRequest: PaymentRow | null
  history: PaymentRow[]
}

const PLAN_OPTIONS = [
  { label: "30 days", days: 30 },
  { label: "90 days", days: 90 },
  { label: "180 days", days: 180 },
  { label: "365 days", days: 365 },
]

function formatCurrency(value: number | string) {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(Number(value))
}

function formatDate(value?: string | null) {
  if (!value) return "Not available"
  return new Intl.DateTimeFormat("en-IN", { dateStyle: "medium" }).format(
    new Date(value)
  )
}

export default function ClientPaymentsPage() {
  const [data, setData] = useState<PaymentsData | null>(null)
  const [amount, setAmount] = useState("2500")
  const [planDuration, setPlanDuration] = useState("30")
  const [startDate, setStartDate] = useState(() => new Date().toISOString().split("T")[0])
  const [paymentDate, setPaymentDate] = useState(() => new Date().toISOString().split("T")[0])
  const [paymentMode, setPaymentMode] = useState<"upi" | "cash">("upi")
  const [screenshotUrl, setScreenshotUrl] = useState("")
  const [isUploading, setIsUploading] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const [loadFailed, setLoadFailed] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)

  const selectedPlanLabel = useMemo(
    () =>
      PLAN_OPTIONS.find((plan) => String(plan.days) === planDuration)?.label ??
      `${planDuration} days`,
    [planDuration]
  )

  async function loadPayments() {
    const response = await fetch("/api/client/payments", {
      credentials: "include",
      cache: "no-store",
    })
    const result = await response.json()

    if (!response.ok || !result.success) {
      throw new Error(result.error || "Unable to load payments")
    }

    setData(result.data)
    setLoadFailed(false)
  }

  useEffect(() => {
    let mounted = true

    loadPayments()
      .catch((error) => {
        if (!mounted) return
        setLoadFailed(true)
        toast.error("Payments unavailable", {
          description:
            error instanceof Error ? error.message : "Please refresh the page.",
        })
      })
      .finally(() => {
        if (mounted) setIsLoading(false)
      })

    return () => {
      mounted = false
    }
  }, [])

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
        throw new Error(result.error || "Unable to upload payment screenshot")
      }

      setScreenshotUrl(result.data.publicUrl)
      toast.success("Screenshot uploaded successfully")
    } catch (error: any) {
      toast.error("Upload failed", { description: error.message })
    } finally {
      setIsUploading(false)
    }
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    
    if (paymentMode === "upi" && !screenshotUrl) {
      toast.error("Screenshot required", { description: "Please upload your UPI payment proof." })
      return
    }

    setIsSubmitting(true)

    try {
      const response = await fetch("/api/client/payments/request", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          amount: Number(amount),
          planDuration: Number(planDuration),
          paymentMode,
          screenshotUrl: paymentMode === "upi" ? screenshotUrl : undefined,
          startDate,
          paymentDate
        }),
      })
      const result = await response.json()

      if (!response.ok || !result.success) {
        throw new Error(result.error || "Unable to create payment request")
      }

      toast.success("Payment request submitted", {
        description: "The owner will approve it after manual verification.",
      })
      setScreenshotUrl("") 
      await loadPayments()
    } catch (error) {
      toast.error("Request failed", {
        description:
          error instanceof Error ? error.message : "Please try again later.",
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="space-y-6 pb-20">
      <PageIntro
        title="Payments"
        subtitle="Request membership renewals and track manual approvals"
      />

      {isLoading ? (
        <SurfaceCard>
          <div className="flex min-h-40 items-center justify-center">
            <Loader2 className="h-6 w-6 animate-spin text-primary" />
          </div>
        </SurfaceCard>
      ) : loadFailed || !data ? (
        <SurfaceCard className="text-center">
          <p className="text-muted-foreground">Could not load payment data.</p>
          <Button
            className="mt-4"
            onClick={() => {
              setIsLoading(true)
              void loadPayments().finally(() => setIsLoading(false))
            }}
          >
            Retry
          </Button>
        </SurfaceCard>
      ) : (
        <>
          <SurfaceCard>
            <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
              <div>
                <h2 className="text-lg font-semibold text-foreground">
                  Current Plan
                </h2>
                <p className="text-sm text-muted-foreground">
                  Your active membership window.
                </p>
              </div>
              <StatusPill status={data?.currentPlan?.status ?? "expired"}>
                {data?.currentPlan?.status ?? "No plan"}
              </StatusPill>
            </div>

            {data?.currentPlan ? (
              <div className="grid gap-4 md:grid-cols-3">
                <div className="p-3 bg-secondary/30 rounded-lg">
                  <p className="text-[10px] uppercase font-bold text-muted-foreground tracking-wider">
                    Start Date
                  </p>
                  <p className="mt-1 font-semibold text-foreground text-sm">
                    {formatDate(data.currentPlan.startDate)}
                  </p>
                </div>
                <div className="p-3 bg-secondary/30 rounded-lg">
                  <p className="text-[10px] uppercase font-bold text-muted-foreground tracking-wider">
                    End Date
                  </p>
                  <p className="mt-1 font-semibold text-foreground text-sm">
                    {formatDate(data.currentPlan.endDate)}
                  </p>
                </div>
                <div className="p-3 bg-secondary/30 rounded-lg">
                  <p className="text-[10px] uppercase font-bold text-muted-foreground tracking-wider">
                    Days Remaining
                  </p>
                  <p className="mt-1 font-bold text-emerald-500">
                    {data.currentPlan.daysRemaining}
                  </p>
                </div>
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">
                No plan is attached yet. Submit a request to start or renew.
              </p>
            )}
          </SurfaceCard>

          <SurfaceCard className={cn(data?.pendingRequest && "border-amber-500/20 bg-amber-500/5")}>
            <div className="mb-6 flex items-center gap-3">
              <PlusCircle className={cn("h-5 w-5", data?.pendingRequest ? "text-amber-500" : "text-primary")} />
              <div>
                <h2 className="text-lg font-semibold text-foreground">
                  {data?.pendingRequest ? "Pending Request" : "New Payment Request"}
                </h2>
                <p className="text-sm text-muted-foreground">
                  {data?.pendingRequest 
                    ? "The owner is currently verifying your request." 
                    : "Choose your plan and payment method below."}
                </p>
              </div>
            </div>

            {data?.pendingRequest ? (
              <div className="space-y-4">
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-1">
                    <p className="text-xs uppercase font-bold text-muted-foreground tracking-wider">Details</p>
                    <p className="text-xl font-bold text-foreground">
                      {formatCurrency(data.pendingRequest.amount)}
                    </p>
                    <p className="text-sm text-muted-foreground flex items-center gap-2">
                      {data.pendingRequest.planDuration} day plan via 
                      <span className="uppercase font-bold text-foreground">{data.pendingRequest.paymentMode}</span>
                    </p>
                  </div>
                  <div className="flex flex-col sm:items-end justify-center gap-2">
                    <StatusPill status="pending">Awaiting Verification</StatusPill>
                    <p className="text-xs text-muted-foreground">Submitted on {formatDate(data.pendingRequest.createdAt)}</p>
                  </div>
                </div>
                
                {/* Custom Dates Display */}
                <div className="grid grid-cols-2 gap-4 pt-3 border-t border-border/30 text-sm">
                  <div>
                    <span className="text-xs text-muted-foreground font-semibold">Plan Start Date:</span>
                    <p className="font-bold text-foreground mt-0.5">{formatDate((data.pendingRequest as any).startDate)}</p>
                  </div>
                  <div>
                    <span className="text-xs text-muted-foreground font-semibold">Payment Date:</span>
                    <p className="font-bold text-foreground mt-0.5">{formatDate((data.pendingRequest as any).paymentDate)}</p>
                  </div>
                </div>

                {data.pendingRequest.screenshotUrl && (
                  <div className="pt-4 border-t border-border/50">
                    <p className="text-[10px] uppercase font-bold text-muted-foreground mb-2">Payment Proof</p>
                    <a href={data.pendingRequest.screenshotUrl} target="_blank" rel="noreferrer" className="inline-flex items-center gap-2 text-xs font-bold text-primary hover:underline">
                      <ImageIcon className="h-4 w-4" />
                      View Uploaded Screenshot
                    </a>
                  </div>
                )}
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-6">
                <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-5">
                  {/* Mode Selection */}
                  <div className="space-y-2">
                    <Label>Payment Mode</Label>
                    <div className="grid grid-cols-2 gap-2">
                      <button
                        type="button"
                        onClick={() => setPaymentMode("upi")}
                        className={cn(
                          "flex items-center justify-center gap-2 px-3 py-2 rounded-lg border text-sm font-semibold transition-all",
                          paymentMode === "upi" ? "bg-primary/10 border-primary text-primary" : "border-border text-muted-foreground hover:bg-secondary"
                        )}
                      >
                        <Smartphone className="h-4 w-4" />
                        UPI
                      </button>
                      <button
                        type="button"
                        onClick={() => setPaymentMode("cash")}
                        className={cn(
                          "flex items-center justify-center gap-2 px-3 py-2 rounded-lg border text-sm font-semibold transition-all",
                          paymentMode === "cash" ? "bg-primary/10 border-primary text-primary" : "border-border text-muted-foreground hover:bg-secondary"
                        )}
                      >
                        <Banknote className="h-4 w-4" />
                        Cash
                      </button>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="amount">Amount (INR)</Label>
                    <Input
                      id="amount"
                      inputMode="numeric"
                      min="1"
                      value={amount}
                      onChange={(event) => setAmount(event.target.value)}
                      required
                      className="font-bold text-lg bg-background"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label>Plan Duration</Label>
                    <Select value={planDuration} onValueChange={setPlanDuration}>
                      <SelectTrigger className="font-semibold w-full bg-background">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {PLAN_OPTIONS.map((plan) => (
                          <SelectItem key={plan.days} value={String(plan.days)}>
                            {plan.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="startDate">Plan Start Date</Label>
                    <Input
                      id="startDate"
                      type="date"
                      value={startDate}
                      onChange={(event) => setStartDate(event.target.value)}
                      required
                      className="font-semibold text-foreground bg-background"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="paymentDate">Payment Date</Label>
                    <Input
                      id="paymentDate"
                      type="date"
                      value={paymentDate}
                      onChange={(event) => setPaymentDate(event.target.value)}
                      required
                      className="font-semibold text-foreground bg-background"
                    />
                  </div>
                </div>

                {/* Conditional Screenshot Upload */}
                {paymentMode === "upi" && (
                  <div className="p-4 bg-secondary/20 rounded-xl border-2 border-dashed border-border flex flex-col items-center justify-center text-center gap-3">
                    {screenshotUrl ? (
                      <div className="flex items-center gap-3 text-emerald-500 font-bold text-sm">
                        <ImageIcon className="h-5 w-5" />
                        Screenshot ready for submission
                        <Button variant="ghost" size="sm" onClick={() => setScreenshotUrl("")} className="text-muted-foreground hover:text-red-500 h-8">Remove</Button>
                      </div>
                    ) : (
                      <>
                        <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                          <Upload className="h-5 w-5 text-primary" />
                        </div>
                        <div className="space-y-1">
                          <p className="text-sm font-bold">Upload Payment Screenshot</p>
                          <p className="text-xs text-muted-foreground">Mandatory for UPI verification</p>
                        </div>
                        <input
                          type="file"
                          accept="image/*"
                          onChange={handleFileUpload}
                          className="hidden"
                          id="screenshot-upload"
                          disabled={isUploading}
                        />
                        <Button 
                          asChild 
                          variant="secondary" 
                          size="sm"
                          disabled={isUploading}
                        >
                          <label htmlFor="screenshot-upload" className="cursor-pointer">
                            {isUploading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Choose File"}
                          </label>
                        </Button>
                      </>
                    )}
                  </div>
                )}

                <Button type="submit" size="lg" className="w-full sm:w-auto font-bold" disabled={isSubmitting || isUploading}>
                  {isSubmitting ? (
                    <>
                      <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                      Submitting Request...
                    </>
                  ) : (
                    <>
                      <ShieldCheck className="mr-2 h-5 w-5" />
                      Submit Verification Request
                    </>
                  )}
                </Button>
              </form>
            )}
          </SurfaceCard>

          <SurfaceCard>
            <div className="mb-4 flex items-center gap-3">
              <CreditCard className="h-5 w-5 text-primary" />
              <h2 className="text-lg font-semibold text-foreground">
                Verified Payment History
              </h2>
            </div>

            {data?.history.length ? (
              <div className="space-y-3">
                {data.history.map((payment) => (
                  <div
                    key={payment.id}
                    className="grid gap-3 rounded-lg border border-border bg-background p-4 sm:grid-cols-[1fr_auto] hover:border-primary/20 transition-colors"
                  >
                    <div>
                      <div className="flex items-center gap-3 mb-1">
                        <p className="font-bold text-foreground">
                          {formatCurrency(payment.amount)}
                        </p>
                        <span className="px-1.5 py-0.5 rounded-md bg-secondary text-[10px] font-black uppercase tracking-tighter">
                          {payment.paymentMode}
                        </span>
                      </div>
                      <p className="text-sm text-muted-foreground">
                        {payment.planDuration} days plan - Requested {formatDate(payment.createdAt)}
                      </p>
                      <div className="flex flex-wrap gap-x-4 gap-y-1 mt-1.5 text-xs text-muted-foreground bg-secondary/10 p-2 rounded border border-border/40 inline-flex">
                        <div>
                          <span className="font-semibold text-foreground/80">Plan Start:</span> {formatDate((payment as any).startDate)}
                        </div>
                        <div className="border-l border-border/50 pl-4">
                          <span className="font-semibold text-foreground/80">Paid Date:</span> {formatDate((payment as any).paymentDate)}
                        </div>
                      </div>
                      {payment.screenshotUrl && (
                        <div className="mt-2">
                          <a href={payment.screenshotUrl} target="_blank" rel="noreferrer" className="text-[10px] font-bold text-primary hover:underline uppercase tracking-wider">
                            View Receipt
                          </a>
                        </div>
                      )}
                    </div>
                    <div className="flex flex-col sm:items-end gap-2">
                      <StatusPill status={payment.status} size="sm" />
                      {payment.approvedAt && (
                        <p className="text-[10px] text-muted-foreground font-medium">
                          Processed: {formatDate(payment.approvedAt)}
                        </p>
                      )}
                      {["approved", "paid"].includes(payment.status) ? (
                        <Button asChild variant="outline" size="sm">
                          <a
                            href={`/api/client/payments/invoice?paymentId=${encodeURIComponent(payment.id)}`}
                            download
                          >
                            <Download className="h-4 w-4" />
                            Invoice
                          </a>
                        </Button>
                      ) : (
                        <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                          Invoice after approval
                        </span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">
                Your payment history is empty.
              </p>
            )}
          </SurfaceCard>
        </>
      )}
    </div>
  )
}
