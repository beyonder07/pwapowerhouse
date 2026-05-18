import type { AuthContext } from "@/src/middleware/auth.middleware"
import { requireRole } from "@/src/middleware/role.middleware"
import { createSupabaseServiceRoleClient } from "@/src/services/supabase.service"
import { getOwnerGymId } from "@/src/utils/owner-gym"

const admin = createSupabaseServiceRoleClient()

export interface GymExpense {
  id: string
  gymId: string
  category: "EB" | "Maintenance" | "Equipment" | "Marketing" | "Supplies" | "Other"
  title: string
  amount: number
  date: string
  notes: string | null
}

export interface GymRevenue {
  id: string
  gymId: string
  category: "Supplement" | "Personal Training" | "Merchandise" | "Other"
  title: string
  amount: number
  date: string
  notes: string | null
}

export interface ProfitMetrics {
  month: string
  clientRevenue: number
  trainerPayroll: number
  ebExpenses: number
  miscExpenses: number
  netProfit: number
  expenses: GymExpense[]
  manualRevenueLogs: GymRevenue[]
  revenueVsExpenseRatio: number
}

function toNumber(val: any) {
  if (val === null || val === undefined) return 0
  return Number(val)
}

export async function getProfitMetrics(ctx: AuthContext, month: string): Promise<ProfitMetrics> {
  requireRole(ctx, ["owner"])
  let gymId = getOwnerGymId(ctx)
  if (!gymId) {
    const { data } = await admin.from("gyms").select("id").limit(1).single()
    if (data) gymId = data.id
  }
  if (!gymId) throw new Error("Gym ID required")

  const monthPrefix = month.slice(0, 7) // "YYYY-MM"
  const startOfMonth = `${monthPrefix}-01`
  const endOfMonth = `${monthPrefix}-31`

  // 1. Client Revenue (from payments table)
  // We sum all completed payments where the created_at or updated_at is in the month.
  // We'll use the 'payments' table, check status='completed'
  const paymentsRes = await admin
    .from("payments")
    .select("amount, status, updated_at")
    .eq("gym_id", gymId)
    .eq("status", "completed")
    .gte("updated_at", `${startOfMonth}T00:00:00Z`)
    .lte("updated_at", `${endOfMonth}T23:59:59Z`)
  
  let clientRevenue = 0
  if (paymentsRes.data) {
    clientRevenue = paymentsRes.data.reduce((sum, p) => sum + toNumber(p.amount), 0)
  }

  // 1b. Manual Revenue (from gym_revenue table)
  let manualRevenueLogs: GymRevenue[] = []
  let manualRevenueTotal = 0
  
  const revenueRes = await admin
    .from("gym_revenue")
    .select("*")
    .eq("gym_id", gymId)
    .gte("date", startOfMonth)
    .lte("date", endOfMonth)
    .order("date", { ascending: false })

  if (revenueRes.error) {
    const code = (revenueRes.error as any).code
    if (code !== "42P01" && code !== "PGRST200" && code !== "PGRST205") {
      throw revenueRes.error
    }
  } else if (revenueRes.data) {
    manualRevenueLogs = revenueRes.data.map((r: any) => ({
      id: r.id,
      gymId: r.gym_id,
      category: r.category,
      title: r.title,
      amount: toNumber(r.amount),
      date: r.date,
      notes: r.notes,
    }))
    manualRevenueTotal = manualRevenueLogs.reduce((sum, r) => sum + r.amount, 0)
  }
  
  clientRevenue += manualRevenueTotal

  // 2. Trainer Payroll
  // Need to get all trainers in this gym, then sum their salaries for this month
  const trainersRes = await admin
    .from("users")
    .select("id")
    .eq("gym_id", gymId)
    .eq("role", "trainer")
  
  const trainerIds = (trainersRes.data ?? []).map(u => u.id)
  
  let trainerPayroll = 0
  if (trainerIds.length > 0) {
    const salariesRes = await admin
      .from("trainer_salaries")
      .select("base_salary, bonus")
      .in("user_id", trainerIds)
      .eq("month_start", startOfMonth)
    
    if (!salariesRes.error && salariesRes.data) {
      trainerPayroll = salariesRes.data.reduce((sum, s) => sum + toNumber(s.base_salary) + toNumber(s.bonus), 0)
    }
  }

  // 3. Expenses
  let expenses: GymExpense[] = []
  let ebExpenses = 0
  let miscExpenses = 0

  const expensesRes = await admin
    .from("gym_expenses")
    .select("*")
    .eq("gym_id", gymId)
    .gte("date", startOfMonth)
    .lte("date", endOfMonth)
    .order("date", { ascending: false })

  if (expensesRes.error) {
    const code = (expensesRes.error as any).code
    // if table doesn't exist, we just return 0 expenses
    if (code !== "42P01" && code !== "PGRST200" && code !== "PGRST205") {
      throw expensesRes.error
    }
  } else if (expensesRes.data) {
    expenses = expensesRes.data.map((e: any) => ({
      id: e.id,
      gymId: e.gym_id,
      category: e.category,
      title: e.title,
      amount: toNumber(e.amount),
      date: e.date,
      notes: e.notes,
    }))

    ebExpenses = expenses.filter(e => e.category === "EB").reduce((sum, e) => sum + e.amount, 0)
    miscExpenses = expenses.filter(e => e.category !== "EB").reduce((sum, e) => sum + e.amount, 0)
  }

  const netProfit = clientRevenue - trainerPayroll - ebExpenses - miscExpenses
  const totalExpenses = trainerPayroll + ebExpenses + miscExpenses
  const ratio = clientRevenue > 0 ? (totalExpenses / clientRevenue) * 100 : 0

  return {
    month,
    clientRevenue,
    trainerPayroll,
    ebExpenses,
    miscExpenses,
    netProfit,
    expenses,
    manualRevenueLogs,
    revenueVsExpenseRatio: Math.round(ratio)
  }
}

export async function addRevenue(ctx: AuthContext, data: { category: string, title: string, amount: number, date: string, notes?: string }) {
  requireRole(ctx, ["owner"])
  let gymId = getOwnerGymId(ctx)
  if (!gymId) {
    const { data } = await admin.from("gyms").select("id").limit(1).single()
    if (data) gymId = data.id
  }
  if (!gymId) throw new Error("Gym ID required")

  const { error } = await admin.from("gym_revenue").insert({
    gym_id: gymId,
    category: data.category,
    title: data.title,
    amount: data.amount,
    date: data.date,
    notes: data.notes || null
  })

  if (error) {
    const code = (error as any).code
    if (code === "42P01") throw new Error("TABLE_MISSING")
    throw error
  }
}

export async function deleteRevenue(ctx: AuthContext, id: string) {
  requireRole(ctx, ["owner"])
  let gymId = getOwnerGymId(ctx)
  if (!gymId) {
    const { data } = await admin.from("gyms").select("id").limit(1).single()
    if (data) gymId = data.id
  }
  if (!gymId) throw new Error("Gym ID required")

  const { error } = await admin.from("gym_revenue").delete().eq("id", id).eq("gym_id", gymId)
  if (error) throw error
}

export async function addExpense(ctx: AuthContext, data: { category: string, title: string, amount: number, date: string, notes?: string }) {
  requireRole(ctx, ["owner"])
  let gymId = getOwnerGymId(ctx)
  if (!gymId) {
    const { data } = await admin.from("gyms").select("id").limit(1).single()
    if (data) gymId = data.id
  }
  if (!gymId) throw new Error("Gym ID required")

  const { error } = await admin.from("gym_expenses").insert({
    gym_id: gymId,
    category: data.category,
    title: data.title,
    amount: data.amount,
    date: data.date,
    notes: data.notes || null
  })

  if (error) {
    const code = (error as any).code
    if (code === "42P01") throw new Error("TABLE_MISSING")
    throw error
  }
}

export async function deleteExpense(ctx: AuthContext, id: string) {
  requireRole(ctx, ["owner"])
  let gymId = getOwnerGymId(ctx)
  if (!gymId) {
    const { data } = await admin.from("gyms").select("id").limit(1).single()
    if (data) gymId = data.id
  }
  if (!gymId) throw new Error("Gym ID required")

  const { error } = await admin.from("gym_expenses").delete().eq("id", id).eq("gym_id", gymId)
  if (error) throw error
}
