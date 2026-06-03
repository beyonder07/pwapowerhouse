"use client"

import { useEffect, useMemo, useRef, useState } from "react"
import {
  Calculator,
  Check,
  CheckCircle2,
  Clock,
  FileDown,
  IndianRupee,
  Info,
  Loader2,
  Pencil,
  PlusCircle,
  RotateCcw,
  Users,
  X,
  AlertTriangle,
} from "lucide-react"
import { toast } from "sonner"
import { EmptyState, PageIntro, StatusPill, SurfaceCard } from "@/components/powerhouse"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"

/* ── Types ─────────────────────────────────────────────────────────────── */
interface SalaryRow {
  id: string
  trainerId: string
  trainerName: string
  avatarUrl: string | null
  monthStart: string
  baseSalary: number
  bonus: number
  total: number
  status: "paid" | "processing" | "pending"
  paidAt: string | null
  payrollSuggestion?: {
    absentDays: number
    perDayRate: number
    suggestedDeduction: number
    finalSalary: number
  }
}

/* ── Helpers ────────────────────────────────────────────────────────────── */
function initials(name: string) { return name.split(" ").filter(Boolean).slice(0, 2).map((p) => p[0]?.toUpperCase()).join("") }
function formatCurrency(value: number) { return new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(value) }
function formatDate(value: string | null) {
  if (!value) return "Not paid"
  return new Intl.DateTimeFormat("en-IN", { dateStyle: "medium" }).format(new Date(value))
}
function formatMonth(value: string) { return new Intl.DateTimeFormat("en-IN", { month: "long", year: "numeric" }).format(new Date(value + "T00:00:00")) }
function salaryTone(status: SalaryRow["status"]) {
  if (status === "paid") return "success"
  if (status === "processing") return "warning"
  return "error"
}
function monthOptions() {
  const options = []
  const now = new Date()
  for (let i = 0; i < 6; i++) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1)
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-01`
    options.push({ value: key, label: new Intl.DateTimeFormat("en-IN", { month: "long", year: "numeric" }).format(d) })
  }
  return options
}

/* ── Inline Edit Form ─────────────────────────────────────────────────── */
interface EditFormProps {
  salary: SalaryRow
  onSave: (id: string, baseSalary: number, bonus: number) => Promise<void>
  onCancel: () => void
  saving: boolean
}

function InlineSalaryEdit({ salary, onSave, onCancel, saving }: EditFormProps) {
  const [base, setBase] = useState(String(salary.baseSalary === 0 ? "" : salary.baseSalary))
  const [bonus, setBonus] = useState(String(salary.bonus === 0 ? "" : salary.bonus))
  const baseRef = useRef<HTMLInputElement>(null)

  useEffect(() => { baseRef.current?.focus() }, [])

  const baseNum = Number(base) || 0
  const bonusNum = Number(bonus) || 0
  const total = baseNum + bonusNum

  const absentDays = salary.payrollSuggestion?.absentDays ?? 0
  const dynamicPerDayRate = baseNum > 0 ? Math.round(baseNum / 30) : 0
  const dynamicSuggestedDeduction = dynamicPerDayRate * absentDays

  return (
    <div className="mt-3 overflow-hidden rounded-xl border border-primary/30 bg-primary/5">
      <div className="border-b border-primary/20 bg-primary/10 px-4 py-2">
        <p className="text-[10px] font-bold uppercase tracking-widest text-primary">Payroll Calculator</p>
      </div>
      
      {/* Smart Suggestion Panel */}
      {absentDays > 0 && baseNum > 0 && (
        <div className="border-b border-primary/10 bg-background/50 px-4 py-3">
          <div className="flex items-start gap-3">
            <div className="rounded-full bg-amber-500/20 p-1.5 text-amber-500 mt-0.5">
              <AlertTriangle className="h-4 w-4" />
            </div>
            <div>
              <p className="text-xs font-bold text-foreground">Leave Deduction Suggested</p>
              <p className="mt-1 text-xs text-muted-foreground">
                Trainer was absent for <span className="font-bold text-foreground">{absentDays} days</span>. 
                At {formatCurrency(dynamicPerDayRate)}/day, consider deducting <span className="font-bold text-foreground">{formatCurrency(dynamicSuggestedDeduction)}</span>.
              </p>
              <div className="mt-2 flex gap-2">
                <Button 
                  size="sm" 
                  variant="outline" 
                  className="h-6 px-2 text-[10px] hover:bg-amber-500/10 hover:text-amber-500 border-amber-500/30"
                  onClick={() => setBonus(String(-Math.abs(dynamicSuggestedDeduction)))}
                >
                  Apply {formatCurrency(-Math.abs(dynamicSuggestedDeduction))} to Bonus/Deductions
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="p-4">
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="mb-1 block text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
              Base Salary (₹)
            </label>
            <input
              ref={baseRef}
              type="number"
              min="0"
              step="500"
              value={base}
              onChange={(e) => setBase(e.target.value)}
              placeholder="e.g. 18000"
              className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm font-semibold text-foreground placeholder:text-muted-foreground/50 focus:border-primary focus:outline-none"
            />
          </div>
          <div>
            <label className="mb-1 block text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
              Bonus / Deduction (₹)
            </label>
            <input
              type="number"
              step="500"
              value={bonus}
              onChange={(e) => setBonus(e.target.value)}
              placeholder="e.g. 2000 or -1500"
              className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm font-semibold text-foreground placeholder:text-muted-foreground/50 focus:border-primary focus:outline-none"
            />
            <p className="mt-1 text-[9px] text-muted-foreground text-right">Use negative for deductions</p>
          </div>
        </div>
        <div className="mt-3 flex items-center justify-between">
          <p className="text-sm text-muted-foreground">
            Total Payout:{" "}
            <span className="font-bold text-foreground text-lg">{formatCurrency(total)}</span>
          </p>
          <div className="flex gap-2">
            <Button size="sm" variant="ghost" className="h-8 gap-1.5 text-xs" onClick={onCancel} disabled={saving}>
              <X className="h-3.5 w-3.5" /> Cancel
            </Button>
            <Button size="sm" className="h-8 gap-1.5 bg-primary text-xs text-background hover:bg-primary/90" onClick={() => onSave(salary.id, baseNum, bonusNum)} disabled={saving || (baseNum === salary.baseSalary && bonusNum === salary.bonus)}>
              {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Check className="h-3.5 w-3.5" />} Save
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}

/* ══════════════════════════════════════════════════════════════════════════
   Page
══════════════════════════════════════════════════════════════════════════ */
export default function OwnerSalaryPage() {
  const months = monthOptions()
  const [selectedMonth, setSelectedMonth] = useState(months[0]!.value)
  const [salaries, setSalaries] = useState<SalaryRow[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [updatingId, setUpdatingId] = useState<string | null>(null)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [savingEdit, setSavingEdit] = useState(false)
  const [isGenerating, setIsGenerating] = useState(false)
  const [isDownloading, setIsDownloading] = useState(false)

  /* ── Load ───────────────────────────────────────────────────────────── */
  async function loadSalaries(month: string) {
    setIsLoading(true)
    try {
      const res = await fetch(`/api/owner/salary?month=${month}`, { credentials: "include", cache: "no-store" })
      const result = await res.json()
      if (!res.ok || !result.success) throw new Error(result.error || "Unable to load salaries")
      
      // Fetch attendance insights for each trainer for the smart suggestions
      const enrichedSalaries = await Promise.all(result.data.salaries.map(async (s: any) => {
        try {
          const tRes = await fetch(`/api/owner/trainers/${s.trainerId}`, { credentials: "include" })
          const tData = await tRes.json()
          if (tData.success && tData.data.attendance?.payrollSuggestion) {
            return { ...s, payrollSuggestion: tData.data.attendance.payrollSuggestion }
          }
        } catch { /* ignore */ }
        return s
      }))
      
      setSalaries(enrichedSalaries)
    } catch (error) {
      toast.error("Salary data unavailable", { description: error instanceof Error ? error.message : "Please refresh." })
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => { loadSalaries(selectedMonth) }, [selectedMonth])

  /* ── Generate ───────────────────────────────────────────────────────── */
  async function generatePayroll() {
    setIsGenerating(true)
    try {
      const res = await fetch("/api/owner/salary/generate", {
        method: "POST", headers: { "Content-Type": "application/json" }, credentials: "include",
        body: JSON.stringify({ month: selectedMonth }),
      })
      const result = await res.json()
      if (!res.ok || !result.success) throw new Error(result.error || "Generate failed")
      toast.success(result.data.message, { description: "Set each trainer's salary using the edit button." })
      if (result.data.created > 0) await loadSalaries(selectedMonth)
    } catch (error) {
      toast.error("Generate failed", { description: error instanceof Error ? error.message : "Please try again." })
    } finally {
      setIsGenerating(false)
    }
  }

  /* ── Update status ──────────────────────────────────────────────────── */
  async function updateStatus(id: string, status: SalaryRow["status"]) {
    setUpdatingId(id)
    try {
      const res = await fetch("/api/owner/salary", {
        method: "PATCH", headers: { "Content-Type": "application/json" }, credentials: "include",
        body: JSON.stringify({ id, status }),
      })
      const result = await res.json()
      if (!res.ok || !result.success) throw new Error(result.error || "Update failed")
      toast.success(status === "paid" ? "Marked as paid ✓" : status === "processing" ? "Marked as processing" : "Reset to pending")
      setSalaries((prev) => prev.map((s) => s.id === id ? { ...s, status, paidAt: status === "paid" ? new Date().toISOString() : null } : s))
    } catch (error) {
      toast.error("Update failed", { description: error instanceof Error ? error.message : "Try again." })
    } finally {
      setUpdatingId(null)
    }
  }

  /* ── Save salary amounts ────────────────────────────────────────────── */
  async function saveSalaryAmounts(id: string, baseSalary: number, bonus: number) {
    setSavingEdit(true)
    try {
      const res = await fetch("/api/owner/salary", {
        method: "PATCH", headers: { "Content-Type": "application/json" }, credentials: "include",
        body: JSON.stringify({ id, baseSalary, bonus }),
      })
      const result = await res.json()
      if (!res.ok || !result.success) throw new Error(result.error || "Save failed")
      toast.success("Salary updated")
      setSalaries((prev) => prev.map((s) => s.id === id ? { ...s, baseSalary, bonus, total: baseSalary + bonus } : s))
      setEditingId(null)
    } catch (error) {
      toast.error("Save failed", { description: error instanceof Error ? error.message : "Try again." })
    } finally {
      setSavingEdit(false)
    }
  }

  async function downloadPayroll() {
    setIsDownloading(true)
    try {
      const monthParam = selectedMonth.slice(0, 7) // YYYY-MM
      const res = await fetch(`/api/owner/salary/export?month=${monthParam}`, { credentials: "include" })
      if (!res.ok) { const err = await res.json().catch(() => ({})); throw new Error(err?.error ?? "Download failed") }
      const blob = await res.blob()
      const url = URL.createObjectURL(blob)
      const a = document.createElement("a"); a.href = url; a.download = `PowerHouse_Payroll_${monthParam}.xlsx`; document.body.appendChild(a); a.click(); a.remove(); URL.revokeObjectURL(url)
    } catch (error) {
      toast.error("Download failed", { description: error instanceof Error ? error.message : "Please try again." })
    } finally {
      setIsDownloading(false)
    }
  }

  /* ── Totals ─────────────────────────────────────────────────────────── */
  const totals = useMemo(() => ({
    totalPayroll: salaries.reduce((s, r) => s + r.total, 0),
    paidAmount: salaries.filter((r) => r.status === "paid").reduce((s, r) => s + r.total, 0),
    pendingAmount: salaries.filter((r) => r.status !== "paid").reduce((s, r) => s + r.total, 0),
  }), [salaries])

  return (
    <div className="max-w-4xl">
        {/* ── Header ────────────────────────────────────────────────── */}
        <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <PageIntro title="Payroll Management" description="Set salaries, adjust for attendance, and process payments" />
          <div className="flex flex-wrap items-center gap-2">
            <Button size="sm" className="gap-2 bg-primary text-background hover:bg-primary/90" onClick={generatePayroll} disabled={isGenerating || isLoading}>
              {isGenerating ? <Loader2 className="h-4 w-4 animate-spin" /> : <PlusCircle className="h-4 w-4" />} Generate Payroll
            </Button>
            <Button size="sm" variant="outline" className="gap-2 border-border" onClick={downloadPayroll} disabled={isDownloading || isLoading || salaries.length === 0} title={salaries.length === 0 ? "No payroll records to download" : undefined}>
              {isDownloading ? <Loader2 className="h-4 w-4 animate-spin" /> : <FileDown className="h-4 w-4" />} Download
            </Button>
            <Select value={selectedMonth} onValueChange={(v) => { setEditingId(null); setSelectedMonth(v) }}>
              <SelectTrigger className="w-full sm:w-52"><SelectValue /></SelectTrigger>
              <SelectContent>
                {months.map((m) => (<SelectItem key={m.value} value={m.value}>{m.label}</SelectItem>))}
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* ── Summary ───────────────────────────────────────────────── */}
        <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-3">
          <SurfaceCard className="border-l-4 border-l-primary">
            <IndianRupee className="mb-3 h-5 w-5 text-primary" />
            <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Total Payroll</p>
            <p className="mt-1 text-2xl font-bold text-foreground tabular-nums">{isLoading ? "—" : formatCurrency(totals.totalPayroll)}</p>
          </SurfaceCard>
          <SurfaceCard className="border-l-4 border-l-emerald-500">
            <CheckCircle2 className="mb-3 h-5 w-5 text-emerald-500" />
            <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Paid Out</p>
            <p className="mt-1 text-2xl font-bold text-emerald-500 tabular-nums">{isLoading ? "—" : formatCurrency(totals.paidAmount)}</p>
          </SurfaceCard>
          <SurfaceCard className="border-l-4 border-l-amber-500">
            <Clock className="mb-3 h-5 w-5 text-amber-500" />
            <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Pending</p>
            <p className="mt-1 text-2xl font-bold text-amber-500 tabular-nums">{isLoading ? "—" : formatCurrency(totals.pendingAmount)}</p>
          </SurfaceCard>
        </div>

        {/* ── List ──────────────────────────────────────────────────── */}
        {isLoading ? (
          <div className="flex h-48 items-center justify-center rounded-xl border border-border bg-card"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>
        ) : salaries.length === 0 ? (
          <EmptyState icon={Users} title="No salary records" description={`No payroll for ${formatMonth(selectedMonth)}. Click "Generate Payroll" to begin.`} />
        ) : (
          <div className="space-y-4">
            {salaries.map((salary) => (
              <SurfaceCard key={salary.id} className={salary.payrollSuggestion?.absentDays ? "border-amber-500/30" : ""}>
                {/* ── Main row ── */}
                <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                  {/* Avatar + name */}
                  <div className="flex min-w-0 flex-1 items-center gap-3">
                    <Avatar className="h-10 w-10 shrink-0">
                      <AvatarImage src={salary.avatarUrl ?? undefined} alt={salary.trainerName} />
                      <AvatarFallback className="bg-primary/10 text-sm font-semibold text-primary">{initials(salary.trainerName)}</AvatarFallback>
                    </Avatar>
                    <div className="min-w-0 flex-1">
                      <div className="mb-1 flex flex-wrap items-center gap-2">
                        <h3 className="font-bold text-foreground">{salary.trainerName}</h3>
                        <StatusPill status={salaryTone(salary.status)} label={salary.status} size="sm" />
                      </div>
                      {/* Salary breakdown */}
                      <div className="flex flex-wrap gap-x-3 gap-y-0.5 text-xs text-muted-foreground">
                        <span>Base: <span className={salary.baseSalary === 0 ? "text-amber-500 font-bold" : "text-foreground font-semibold"}>{salary.baseSalary === 0 ? "Not set" : formatCurrency(salary.baseSalary)}</span></span>
                        <span>{salary.bonus < 0 ? "Deduction:" : "Bonus:"} <span className={`font-semibold ${salary.bonus < 0 ? "text-red-500" : "text-emerald-500"}`}>{salary.bonus !== 0 ? formatCurrency(salary.bonus) : "₹0"}</span></span>
                        {salary.paidAt && <span>Paid: {formatDate(salary.paidAt)}</span>}
                      </div>
                    </div>
                  </div>

                  {/* Right side */}
                  <div className="flex w-full items-center justify-between gap-2 sm:w-auto sm:flex-col sm:items-end">
                    <p className={`text-base font-bold sm:text-xl ${salary.total === 0 ? "text-amber-500 text-sm" : "text-foreground"}`}>
                      {salary.total === 0 ? "Setup Required" : formatCurrency(salary.total)}
                    </p>
                    <div className="flex flex-wrap gap-1.5">
                      <Button size="sm" variant="outline" className={`h-8 gap-1.5 text-xs font-bold ${salary.payrollSuggestion?.absentDays && salary.baseSalary > 0 ? "border-amber-500/50 text-amber-500 hover:bg-amber-500/10" : ""}`} onClick={() => setEditingId(editingId === salary.id ? null : salary.id)} disabled={!!updatingId}>
                        <Calculator className="h-3.5 w-3.5" /> Adjust
                      </Button>
                      {salary.status !== "paid" && (
                        <Button size="sm" className="h-8 gap-1.5 bg-emerald-500 text-xs font-bold hover:bg-emerald-600" onClick={() => updateStatus(salary.id, "paid")} disabled={!!updatingId || salary.total === 0}>
                          {updatingId === salary.id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <CheckCircle2 className="h-3.5 w-3.5" />} Mark Paid
                        </Button>
                      )}
                      {salary.status === "pending" && (
                        <Button size="sm" variant="outline" className="h-8 gap-1.5 text-xs font-bold" onClick={() => updateStatus(salary.id, "processing")} disabled={!!updatingId}><Clock className="h-3.5 w-3.5" /> Processing</Button>
                      )}
                      {salary.status === "paid" && (
                        <Button size="sm" variant="ghost" className="h-8 gap-1.5 text-xs font-bold text-muted-foreground" onClick={() => updateStatus(salary.id, "pending")} disabled={!!updatingId}><RotateCcw className="h-3.5 w-3.5" /> Reset</Button>
                      )}
                    </div>
                  </div>
                </div>

                {/* ── Inline edit form ── */}
                {editingId === salary.id && (
                  <InlineSalaryEdit salary={salary} onSave={saveSalaryAmounts} onCancel={() => setEditingId(null)} saving={savingEdit} />
                )}
              </SurfaceCard>
            ))}
          </div>
        )}
      </div>
  )
}
