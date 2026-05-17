"use client"

import { useEffect, useMemo, useRef, useState } from "react"
import {
  Check,
  CheckCircle2,
  Clock,
  FileDown,
  IndianRupee,
  Loader2,
  Pencil,
  PlusCircle,
  RotateCcw,
  Users,
  X,
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
}

/* ── Helpers ────────────────────────────────────────────────────────────── */
function initials(name: string) {
  return name.split(" ").filter(Boolean).slice(0, 2).map((p) => p[0]?.toUpperCase()).join("")
}

function formatCurrency(value: number) {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(value)
}

function formatDate(value: string | null) {
  if (!value) return "Not paid"
  return new Intl.DateTimeFormat("en-IN", { dateStyle: "medium" }).format(new Date(value))
}

function formatMonth(value: string) {
  return new Intl.DateTimeFormat("en-IN", { month: "long", year: "numeric" }).format(
    new Date(value + "T00:00:00")
  )
}

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
    options.push({
      value: key,
      label: new Intl.DateTimeFormat("en-IN", { month: "long", year: "numeric" }).format(d),
    })
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

  return (
    <div className="mt-3 rounded-xl border border-primary/30 bg-primary/5 p-4">
      <p className="mb-3 text-[10px] font-bold uppercase tracking-widest text-primary">
        Edit Salary
      </p>
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
            Bonus (₹)
          </label>
          <input
            type="number"
            min="0"
            step="500"
            value={bonus}
            onChange={(e) => setBonus(e.target.value)}
            placeholder="e.g. 2000"
            className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm font-semibold text-foreground placeholder:text-muted-foreground/50 focus:border-primary focus:outline-none"
          />
        </div>
      </div>
      <div className="mt-3 flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          Total:{" "}
          <span className="font-bold text-foreground">{formatCurrency(total)}</span>
        </p>
        <div className="flex gap-2">
          <Button
            size="sm"
            variant="ghost"
            className="h-8 gap-1.5 text-xs"
            onClick={onCancel}
            disabled={saving}
          >
            <X className="h-3.5 w-3.5" />
            Cancel
          </Button>
          <Button
            size="sm"
            className="h-8 gap-1.5 bg-primary text-xs text-background hover:bg-primary/90"
            onClick={() => onSave(salary.id, baseNum, bonusNum)}
            disabled={saving || (baseNum === salary.baseSalary && bonusNum === salary.bonus)}
          >
            {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Check className="h-3.5 w-3.5" />}
            Save
          </Button>
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
      const res = await fetch(`/api/owner/salary?month=${month}`, {
        credentials: "include",
        cache: "no-store",
      })
      const result = await res.json()
      if (!res.ok || !result.success) throw new Error(result.error || "Unable to load salaries")
      setSalaries(result.data.salaries)
    } catch (error) {
      toast.error("Salary data unavailable", {
        description: error instanceof Error ? error.message : "Please refresh.",
      })
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
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ month: selectedMonth }),
      })
      const result = await res.json()
      if (!res.ok || !result.success) throw new Error(result.error || "Generate failed")
      toast.success(result.data.message, { description: "Set each trainer's salary using the edit button." })
      if (result.data.created > 0) await loadSalaries(selectedMonth)
    } catch (error) {
      toast.error("Generate failed", {
        description: error instanceof Error ? error.message : "Please try again.",
      })
    } finally {
      setIsGenerating(false)
    }
  }

  /* ── Update status ──────────────────────────────────────────────────── */
  async function updateStatus(id: string, status: SalaryRow["status"]) {
    setUpdatingId(id)
    try {
      const res = await fetch("/api/owner/salary", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ id, status }),
      })
      const result = await res.json()
      if (!res.ok || !result.success) throw new Error(result.error || "Update failed")
      toast.success(
        status === "paid" ? "Marked as paid ✓" : status === "processing" ? "Marked as processing" : "Reset to pending"
      )
      setSalaries((prev) =>
        prev.map((s) =>
          s.id === id
            ? { ...s, status, paidAt: status === "paid" ? new Date().toISOString() : null }
            : s
        )
      )
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
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ id, baseSalary, bonus }),
      })
      const result = await res.json()
      if (!res.ok || !result.success) throw new Error(result.error || "Save failed")
      toast.success("Salary updated")
      setSalaries((prev) =>
        prev.map((s) =>
          s.id === id ? { ...s, baseSalary, bonus, total: baseSalary + bonus } : s
        )
      )
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
      const res = await fetch(`/api/owner/salary/export?month=${monthParam}`, {
        credentials: "include",
      })
      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        throw new Error(err?.error ?? "Download failed")
      }
      const blob = await res.blob()
      const url = URL.createObjectURL(blob)
      const a = document.createElement("a")
      a.href = url
      a.download = `PowerHouse_Payroll_${monthParam}.xlsx`
      document.body.appendChild(a)
      a.click()
      a.remove()
      URL.revokeObjectURL(url)
    } catch (error) {
      toast.error("Download failed", {
        description: error instanceof Error ? error.message : "Please try again.",
      })
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
    <div className="flex-1 overflow-y-auto">
      <div className="max-w-4xl">
        {/* ── Header ────────────────────────────────────────────────── */}
        <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <PageIntro title="Trainer Salaries" description="Set and manage trainer salaries — you control every number" />
          <div className="flex flex-wrap items-center gap-2">
            <Button
              size="sm"
              className="gap-2 bg-primary text-background hover:bg-primary/90"
              onClick={generatePayroll}
              disabled={isGenerating || isLoading}
            >
              {isGenerating ? <Loader2 className="h-4 w-4 animate-spin" /> : <PlusCircle className="h-4 w-4" />}
              Generate Payroll
            </Button>
            <Button
              size="sm"
              variant="outline"
              className="gap-2 border-border"
              onClick={downloadPayroll}
              disabled={isDownloading || isLoading || salaries.length === 0}
              title={salaries.length === 0 ? "No payroll records to download" : undefined}
            >
              {isDownloading ? <Loader2 className="h-4 w-4 animate-spin" /> : <FileDown className="h-4 w-4" />}
              {isDownloading ? "Downloading…" : "Download Excel"}
            </Button>
            <Select value={selectedMonth} onValueChange={(v) => { setEditingId(null); setSelectedMonth(v) }}>
              <SelectTrigger className="w-full sm:w-52">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {months.map((m) => (
                  <SelectItem key={m.value} value={m.value}>{m.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* ── Summary ───────────────────────────────────────────────── */}
        <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-3">
          <SurfaceCard className="border-l-4 border-l-primary">
            <IndianRupee className="mb-3 h-5 w-5 text-primary" />
            <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Total Payroll</p>
            <p className="mt-1 text-2xl font-bold text-foreground tabular-nums">
              {isLoading ? "—" : formatCurrency(totals.totalPayroll)}
            </p>
          </SurfaceCard>
          <SurfaceCard className="border-l-4 border-l-emerald-500">
            <CheckCircle2 className="mb-3 h-5 w-5 text-emerald-500" />
            <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Paid Out</p>
            <p className="mt-1 text-2xl font-bold text-emerald-500 tabular-nums">
              {isLoading ? "—" : formatCurrency(totals.paidAmount)}
            </p>
          </SurfaceCard>
          <SurfaceCard className="border-l-4 border-l-amber-500">
            <Clock className="mb-3 h-5 w-5 text-amber-500" />
            <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Pending</p>
            <p className="mt-1 text-2xl font-bold text-amber-500 tabular-nums">
              {isLoading ? "—" : formatCurrency(totals.pendingAmount)}
            </p>
          </SurfaceCard>
        </div>

        {/* ── List ──────────────────────────────────────────────────── */}
        {isLoading ? (
          <div className="flex h-48 items-center justify-center rounded-xl border border-border bg-card">
            <Loader2 className="h-6 w-6 animate-spin text-primary" />
          </div>
        ) : salaries.length === 0 ? (
          <div className="space-y-4">
            <div className="rounded-xl border border-amber-500/30 bg-amber-500/5 p-4">
              <p className="mb-2 text-sm font-bold text-amber-500">Setup Required</p>
              <p className="mb-3 text-xs text-muted-foreground">
                If the <code className="rounded bg-muted px-1 py-0.5 text-amber-400">trainer_salaries</code> table doesn&apos;t exist yet, create it in Supabase first, then click Generate Payroll.
              </p>
              <pre className="overflow-x-auto rounded-lg bg-muted p-3 text-[10px] text-muted-foreground">{`CREATE TABLE trainer_salaries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  month_start DATE NOT NULL,
  base_salary NUMERIC NOT NULL DEFAULT 0,
  bonus NUMERIC NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending','processing','paid')),
  paid_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now()
);`}</pre>
            </div>
            <EmptyState
              icon={Users}
              title="No salary records"
              description={`No payroll for ${formatMonth(selectedMonth)}. Click "Generate Payroll" to create a record for each trainer, then set their amounts.`}
            />
          </div>
        ) : (
          <div className="space-y-4">
            {salaries.map((salary) => (
              <SurfaceCard key={salary.id}>
                {/* ── Main row ── */}
                <div className="flex items-start justify-between gap-4">
                  {/* Avatar + name */}
                  <div className="flex min-w-0 flex-1 gap-4">
                    <Avatar className="h-12 w-12 shrink-0">
                      <AvatarImage src={salary.avatarUrl ?? undefined} alt={salary.trainerName} />
                      <AvatarFallback className="bg-primary/10 text-sm font-semibold text-primary">
                        {initials(salary.trainerName)}
                      </AvatarFallback>
                    </Avatar>
                    <div className="min-w-0 flex-1">
                      <div className="mb-1 flex flex-wrap items-center gap-2">
                        <h3 className="font-semibold text-foreground">{salary.trainerName}</h3>
                        <StatusPill status={salaryTone(salary.status)} label={salary.status} size="sm" />
                      </div>
                      {/* Salary breakdown */}
                      <div className="flex flex-wrap gap-x-4 gap-y-0.5 text-xs text-muted-foreground">
                        <span>
                          Base:{" "}
                          <span className={salary.baseSalary === 0 ? "text-amber-500 font-bold" : "text-foreground font-semibold"}>
                            {salary.baseSalary === 0 ? "Not set" : formatCurrency(salary.baseSalary)}
                          </span>
                        </span>
                        <span>
                          Bonus:{" "}
                          <span className="font-semibold text-foreground">{formatCurrency(salary.bonus)}</span>
                        </span>
                        {salary.paidAt && (
                          <span>Paid: {formatDate(salary.paidAt)}</span>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Right side: total + actions */}
                  <div className="flex shrink-0 flex-col items-end gap-2">
                    <p className={`text-lg font-bold ${salary.total === 0 ? "text-amber-500" : "text-foreground"}`}>
                      {salary.total === 0 ? "Set salary →" : formatCurrency(salary.total)}
                    </p>
                    <div className="flex flex-wrap justify-end gap-1.5">
                      {/* Edit salary/bonus */}
                      <Button
                        size="sm"
                        variant="outline"
                        className="h-8 gap-1.5 text-xs font-bold"
                        onClick={() => setEditingId(editingId === salary.id ? null : salary.id)}
                        disabled={!!updatingId}
                      >
                        <Pencil className="h-3.5 w-3.5" />
                        Edit
                      </Button>

                      {/* Status actions */}
                      {salary.status !== "paid" && (
                        <Button
                          size="sm"
                          className="h-8 gap-1.5 bg-emerald-500 text-xs font-bold hover:bg-emerald-600"
                          onClick={() => updateStatus(salary.id, "paid")}
                          disabled={!!updatingId || salary.total === 0}
                          title={salary.total === 0 ? "Set salary first" : undefined}
                        >
                          {updatingId === salary.id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <CheckCircle2 className="h-3.5 w-3.5" />}
                          Mark Paid
                        </Button>
                      )}
                      {salary.status === "pending" && (
                        <Button
                          size="sm"
                          variant="outline"
                          className="h-8 gap-1.5 text-xs font-bold"
                          onClick={() => updateStatus(salary.id, "processing")}
                          disabled={!!updatingId}
                        >
                          <Clock className="h-3.5 w-3.5" />
                          Processing
                        </Button>
                      )}
                      {salary.status === "paid" && (
                        <Button
                          size="sm"
                          variant="ghost"
                          className="h-8 gap-1.5 text-xs font-bold text-muted-foreground"
                          onClick={() => updateStatus(salary.id, "pending")}
                          disabled={!!updatingId}
                        >
                          <RotateCcw className="h-3.5 w-3.5" />
                          Reset
                        </Button>
                      )}
                    </div>
                  </div>
                </div>

                {/* ── Inline edit form ── */}
                {editingId === salary.id && (
                  <InlineSalaryEdit
                    salary={salary}
                    onSave={saveSalaryAmounts}
                    onCancel={() => setEditingId(null)}
                    saving={savingEdit}
                  />
                )}
              </SurfaceCard>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
