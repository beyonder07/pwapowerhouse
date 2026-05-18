"use client"

import { useEffect, useMemo, useState } from "react"
import {
  AlertTriangle,
  ArrowDownCircle,
  ArrowUpCircle,
  Calculator,
  IndianRupee,
  Lightbulb,
  Loader2,
  PieChart,
  PlusCircle,
  Trash2,
  TrendingDown,
  TrendingUp,
  Zap,
} from "lucide-react"
import { toast } from "sonner"
import { EmptyState, PageIntro, SurfaceCard } from "@/components/powerhouse"
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"

/* ── Types ─────────────────────────────────────────────────────────────── */
interface GymExpense {
  id: string
  gymId: string
  category: "EB" | "Maintenance" | "Equipment" | "Marketing" | "Supplies" | "Other"
  title: string
  amount: number
  date: string
  notes: string | null
}

interface ProfitMetrics {
  month: string
  clientRevenue: number
  trainerPayroll: number
  ebExpenses: number
  miscExpenses: number
  netProfit: number
  expenses: GymExpense[]
  revenueVsExpenseRatio: number
}

/* ── Helpers ────────────────────────────────────────────────────────────── */
function formatCurrency(value: number) {
  return new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(value)
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

/* ── Page Component ─────────────────────────────────────────────────────── */
export default function ProfitCenterPage() {
  const months = monthOptions()
  const [selectedMonth, setSelectedMonth] = useState(months[0]!.value)
  const [data, setData] = useState<ProfitMetrics | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [needsSetup, setNeedsSetup] = useState(false)

  // Add Expense State
  const [showAddExpense, setShowAddExpense] = useState(false)
  const [newExpense, setNewExpense] = useState({ title: "", amount: "", category: "Other", date: new Date().toISOString().split("T")[0]!, notes: "" })
  const [isSubmitting, setIsSubmitting] = useState(false)

  // Calculator State
  const [showCalculator, setShowCalculator] = useState(false)
  const [calcRev, setCalcRev] = useState("")
  const [calcPay, setCalcPay] = useState("")
  const [calcEB, setCalcEB] = useState("")
  const [calcMisc, setCalcMisc] = useState("")

  async function loadData() {
    setIsLoading(true)
    setNeedsSetup(false)
    try {
      const res = await fetch(`/api/owner/profit?month=${selectedMonth}`, { credentials: "include" })
      const json = await res.json()
      if (json.data?.needsSetup) {
        setNeedsSetup(true)
      } else if (!json.success) {
        throw new Error(json.error || "Failed to load profit data")
      } else {
        setData(json.data)
      }
    } catch (error) {
      toast.error("Data unavailable", { description: error instanceof Error ? error.message : "Please try again" })
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => { loadData() }, [selectedMonth])

  async function handleAddExpense() {
    if (!newExpense.title || !newExpense.amount) return toast.error("Title and amount required")
    setIsSubmitting(true)
    try {
      const res = await fetch("/api/owner/expenses", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...newExpense, amount: Number(newExpense.amount) })
      })
      const json = await res.json()
      if (json.error === "TABLE_MISSING") {
        setNeedsSetup(true)
        throw new Error("Setup required")
      }
      if (!res.ok || !json.success) throw new Error(json.error || "Failed to add expense")
      toast.success("Expense added")
      setShowAddExpense(false)
      setNewExpense({ title: "", amount: "", category: "Other", date: new Date().toISOString().split("T")[0]!, notes: "" })
      loadData()
    } catch (error) {
      if ((error as any).message !== "Setup required") {
        toast.error("Action failed", { description: (error as any).message })
      }
    } finally {
      setIsSubmitting(false)
    }
  }

  async function handleDeleteExpense(id: string) {
    if (!confirm("Delete this expense?")) return
    try {
      const res = await fetch(`/api/owner/expenses?id=${id}`, { method: "DELETE" })
      if (!res.ok) throw new Error("Delete failed")
      loadData()
    } catch {
      toast.error("Failed to delete")
    }
  }

  const insights = useMemo(() => {
    if (!data) return []
    const messages: { text: string; type: "good" | "bad" | "warn" }[] = []
    
    if (data.netProfit > 0) messages.push({ text: `Net profit is positive: ${formatCurrency(data.netProfit)}`, type: "good" })
    else if (data.netProfit < 0) messages.push({ text: `Operating at a loss of ${formatCurrency(Math.abs(data.netProfit))}`, type: "bad" })

    if (data.clientRevenue > 0 && data.revenueVsExpenseRatio > 80) messages.push({ text: `High expense ratio! Expenses are ${data.revenueVsExpenseRatio}% of revenue.`, type: "bad" })
    else if (data.clientRevenue > 0 && data.revenueVsExpenseRatio < 50) messages.push({ text: `Healthy expense ratio (${data.revenueVsExpenseRatio}%)`, type: "good" })

    if (data.trainerPayroll > 0 && data.clientRevenue > 0 && (data.trainerPayroll / data.clientRevenue) > 0.5) {
      messages.push({ text: `Trainer payroll is eating >50% of your revenue.`, type: "warn" })
    }

    if (data.clientRevenue === 0) messages.push({ text: "No revenue tracked yet this month.", type: "warn" })

    return messages
  }, [data])

  const calcNet = Number(calcRev) - Number(calcPay) - Number(calcEB) - Number(calcMisc)
  const calcRatio = Number(calcRev) > 0 ? ((Number(calcPay) + Number(calcEB) + Number(calcMisc)) / Number(calcRev)) * 100 : 0

  return (
    <div className="flex-1 overflow-y-auto">
      <div className="max-w-5xl">
        <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <PageIntro title="Profit Center" description="Business intelligence, expense tracking, and net profitability" />
          <div className="flex flex-wrap items-center gap-2">
            <Button size="sm" variant="outline" className="gap-2" onClick={() => setShowCalculator(!showCalculator)}>
              <Calculator className="h-4 w-4" /> Calculator
            </Button>
            <Button size="sm" className="gap-2 bg-primary text-background hover:bg-primary/90" onClick={() => setShowAddExpense(true)}>
              <PlusCircle className="h-4 w-4" /> Add Expense
            </Button>
            <Select value={selectedMonth} onValueChange={setSelectedMonth}>
              <SelectTrigger className="w-full sm:w-48"><SelectValue /></SelectTrigger>
              <SelectContent>
                {months.map(m => <SelectItem key={m.value} value={m.value}>{m.label}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
        </div>

        {needsSetup ? (
          <div className="rounded-xl border border-amber-500/30 bg-amber-500/5 p-4">
            <p className="mb-2 text-sm font-bold text-amber-500">Setup Required</p>
            <p className="mb-3 text-xs text-muted-foreground">
              To use the Profit Center, create the <code className="rounded bg-muted px-1 py-0.5 text-amber-400">gym_expenses</code> table in Supabase.
            </p>
            <pre className="overflow-x-auto rounded-lg bg-muted p-3 text-[10px] text-muted-foreground">{`CREATE TABLE gym_expenses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  gym_id UUID NOT NULL REFERENCES gyms(id) ON DELETE CASCADE,
  category TEXT NOT NULL CHECK (category IN ('EB', 'Maintenance', 'Equipment', 'Marketing', 'Supplies', 'Other')),
  title TEXT NOT NULL,
  amount NUMERIC NOT NULL,
  date DATE NOT NULL,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);`}</pre>
            <Button className="mt-4" size="sm" onClick={loadData}>I have created the table</Button>
          </div>
        ) : isLoading ? (
          <div className="flex h-48 items-center justify-center rounded-xl border border-border bg-card">
            <Loader2 className="h-6 w-6 animate-spin text-primary" />
          </div>
        ) : data ? (
          <div className="space-y-6">
            
            {/* ── Smart Insights ── */}
            {insights.length > 0 && (
              <div className="rounded-xl border border-border bg-card p-4">
                <div className="mb-3 flex items-center gap-2">
                  <Lightbulb className="h-4 w-4 text-primary" />
                  <p className="text-xs font-bold uppercase tracking-widest text-muted-foreground">AI Financial Insights</p>
                </div>
                <div className="grid gap-2 sm:grid-cols-2">
                  {insights.map((insight, i) => (
                    <div key={i} className={`flex items-start gap-2 rounded-lg p-2.5 text-sm font-medium ${
                      insight.type === "good" ? "bg-emerald-500/10 text-emerald-500" :
                      insight.type === "bad" ? "bg-red-500/10 text-red-500" :
                      "bg-amber-500/10 text-amber-500"
                    }`}>
                      {insight.type === "good" ? <TrendingUp className="mt-0.5 h-4 w-4 shrink-0" /> :
                       insight.type === "bad" ? <TrendingDown className="mt-0.5 h-4 w-4 shrink-0" /> :
                       <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />}
                      <p>{insight.text}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* ── Top Summary ── */}
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
              <SurfaceCard className="border-l-4 border-l-emerald-500 p-4">
                <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Revenue</p>
                <p className="mt-1 text-xl font-bold text-emerald-500 sm:text-2xl">{formatCurrency(data.clientRevenue)}</p>
              </SurfaceCard>
              <SurfaceCard className="border-l-4 border-l-amber-500 p-4">
                <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Trainer Payroll</p>
                <p className="mt-1 text-xl font-bold text-amber-500 sm:text-2xl">{formatCurrency(data.trainerPayroll)}</p>
              </SurfaceCard>
              <SurfaceCard className="border-l-4 border-l-red-500 p-4">
                <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Other Expenses</p>
                <p className="mt-1 text-xl font-bold text-red-500 sm:text-2xl">{formatCurrency(data.ebExpenses + data.miscExpenses)}</p>
              </SurfaceCard>
              <SurfaceCard className={`border-l-4 p-4 ${data.netProfit >= 0 ? "border-l-primary" : "border-l-red-500"}`}>
                <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Net Profit</p>
                <p className={`mt-1 text-xl font-bold sm:text-2xl ${data.netProfit >= 0 ? "text-primary" : "text-red-500"}`}>{formatCurrency(data.netProfit)}</p>
              </SurfaceCard>
            </div>

            {/* ── Main Breakdown ── */}
            <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
              <div className="space-y-6 lg:col-span-2">
                <SurfaceCard>
                  <div className="mb-4 flex items-center justify-between border-b border-border pb-3">
                    <h3 className="font-bold text-foreground">Detailed Breakdown</h3>
                    <PieChart className="h-4 w-4 text-muted-foreground" />
                  </div>
                  <div className="space-y-3">
                    <div className="flex items-center justify-between rounded-lg bg-emerald-500/5 p-3">
                      <div className="flex items-center gap-3">
                        <ArrowUpCircle className="h-5 w-5 text-emerald-500" />
                        <div>
                          <p className="font-bold text-foreground">Client Revenue</p>
                          <p className="text-xs text-muted-foreground">Memberships & Add-ons</p>
                        </div>
                      </div>
                      <p className="font-bold text-emerald-500">+{formatCurrency(data.clientRevenue)}</p>
                    </div>

                    <div className="flex items-center justify-between rounded-lg bg-red-500/5 p-3">
                      <div className="flex items-center gap-3">
                        <Users className="h-5 w-5 text-amber-500" />
                        <div>
                          <p className="font-bold text-foreground">Trainer Salaries</p>
                          <p className="text-xs text-muted-foreground">Automated payroll</p>
                        </div>
                      </div>
                      <p className="font-bold text-amber-500">-{formatCurrency(data.trainerPayroll)}</p>
                    </div>

                    <div className="flex items-center justify-between rounded-lg bg-red-500/5 p-3">
                      <div className="flex items-center gap-3">
                        <Zap className="h-5 w-5 text-blue-500" />
                        <div>
                          <p className="font-bold text-foreground">Electricity Bill (EB)</p>
                          <p className="text-xs text-muted-foreground">Manual entry</p>
                        </div>
                      </div>
                      <p className="font-bold text-blue-500">-{formatCurrency(data.ebExpenses)}</p>
                    </div>

                    <div className="flex items-center justify-between rounded-lg bg-red-500/5 p-3">
                      <div className="flex items-center gap-3">
                        <ArrowDownCircle className="h-5 w-5 text-red-500" />
                        <div>
                          <p className="font-bold text-foreground">Misc Expenses</p>
                          <p className="text-xs text-muted-foreground">Repairs, Marketing, etc.</p>
                        </div>
                      </div>
                      <p className="font-bold text-red-500">-{formatCurrency(data.miscExpenses)}</p>
                    </div>
                  </div>
                </SurfaceCard>

                {/* Expense List */}
                <div>
                  <div className="mb-3 flex items-center justify-between">
                    <h3 className="font-bold text-foreground">Logged Expenses</h3>
                  </div>
                  {data.expenses.length === 0 ? (
                    <div className="rounded-xl border border-dashed border-border p-6 text-center text-sm text-muted-foreground">
                      No expenses logged for this month.
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {data.expenses.map(exp => (
                        <div key={exp.id} className="flex items-center justify-between rounded-lg border border-border bg-card px-4 py-3">
                          <div>
                            <div className="flex items-center gap-2">
                              <p className="font-semibold text-foreground">{exp.title}</p>
                              <span className="rounded bg-secondary px-1.5 py-0.5 text-[9px] font-bold uppercase text-muted-foreground">{exp.category}</span>
                            </div>
                            <p className="mt-0.5 text-xs text-muted-foreground">{formatDate(exp.date)} {exp.notes && `· ${exp.notes}`}</p>
                          </div>
                          <div className="flex items-center gap-4">
                            <p className="font-bold text-red-500">-{formatCurrency(exp.amount)}</p>
                            <button onClick={() => handleDeleteExpense(exp.id)} className="text-muted-foreground hover:text-red-500">
                              <Trash2 className="h-4 w-4" />
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              <div className="space-y-6">
                {showAddExpense && (
                  <SurfaceCard className="border-primary/30 shadow-lg">
                    <div className="mb-4 flex items-center justify-between">
                      <h3 className="font-bold text-foreground">Add Expense</h3>
                      <button onClick={() => setShowAddExpense(false)}><X className="h-4 w-4 text-muted-foreground" /></button>
                    </div>
                    <div className="space-y-3">
                      <div>
                        <label className="mb-1 block text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Title</label>
                        <input type="text" value={newExpense.title} onChange={e => setNewExpense({...newExpense, title: e.target.value})} placeholder="e.g. Broken Mirror Repair" className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm focus:border-primary focus:outline-none" />
                      </div>
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="mb-1 block text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Amount</label>
                          <input type="number" value={newExpense.amount} onChange={e => setNewExpense({...newExpense, amount: e.target.value})} placeholder="₹" className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm focus:border-primary focus:outline-none" />
                        </div>
                        <div>
                          <label className="mb-1 block text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Category</label>
                          <Select value={newExpense.category} onValueChange={v => setNewExpense({...newExpense, category: v})}>
                            <SelectTrigger><SelectValue /></SelectTrigger>
                            <SelectContent>
                              <SelectItem value="EB">Electricity (EB)</SelectItem>
                              <SelectItem value="Maintenance">Maintenance</SelectItem>
                              <SelectItem value="Equipment">Equipment</SelectItem>
                              <SelectItem value="Marketing">Marketing</SelectItem>
                              <SelectItem value="Supplies">Supplies</SelectItem>
                              <SelectItem value="Other">Other</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                      </div>
                      <div>
                        <label className="mb-1 block text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Date</label>
                        <input type="date" value={newExpense.date} onChange={e => setNewExpense({...newExpense, date: e.target.value})} className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm focus:border-primary focus:outline-none" />
                      </div>
                      <Button className="w-full" onClick={handleAddExpense} disabled={isSubmitting}>
                        {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin" /> : "Save Expense"}
                      </Button>
                    </div>
                  </SurfaceCard>
                )}

                {showCalculator && (
                  <SurfaceCard className="border-amber-500/30 shadow-lg bg-amber-500/5">
                    <div className="mb-4 flex items-center justify-between">
                      <h3 className="font-bold text-amber-600">Simulate Profit</h3>
                      <button onClick={() => setShowCalculator(false)}><X className="h-4 w-4 text-muted-foreground" /></button>
                    </div>
                    <div className="space-y-3">
                      <div>
                        <label className="mb-1 block text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Exp. Revenue</label>
                        <input type="number" value={calcRev} onChange={e => setCalcRev(e.target.value)} placeholder="₹" className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm focus:border-amber-500 focus:outline-none" />
                      </div>
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="mb-1 block text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Exp. Salaries</label>
                          <input type="number" value={calcPay} onChange={e => setCalcPay(e.target.value)} placeholder="₹" className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm focus:border-amber-500 focus:outline-none" />
                        </div>
                        <div>
                          <label className="mb-1 block text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Exp. EB</label>
                          <input type="number" value={calcEB} onChange={e => setCalcEB(e.target.value)} placeholder="₹" className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm focus:border-amber-500 focus:outline-none" />
                        </div>
                      </div>
                      <div>
                        <label className="mb-1 block text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Exp. Misc</label>
                        <input type="number" value={calcMisc} onChange={e => setCalcMisc(e.target.value)} placeholder="₹" className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm focus:border-amber-500 focus:outline-none" />
                      </div>
                      
                      <div className="mt-4 rounded-lg bg-background p-3 text-center border border-border">
                        <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Projected Net Profit</p>
                        <p className={`mt-1 text-xl font-bold ${calcNet >= 0 ? "text-emerald-500" : "text-red-500"}`}>{formatCurrency(calcNet)}</p>
                        <p className="text-[10px] text-muted-foreground mt-1">Expense Ratio: {Math.round(calcRatio)}%</p>
                      </div>
                    </div>
                  </SurfaceCard>
                )}
              </div>
            </div>
          </div>
        ) : null}
      </div>
    </div>
  )
}
