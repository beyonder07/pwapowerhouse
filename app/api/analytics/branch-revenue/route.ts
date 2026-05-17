import { NextRequest } from "next/server"
import { authenticateRequest } from "@/src/middleware/auth.middleware"
import { requireRole } from "@/src/middleware/role.middleware"
import { createSupabaseServiceRoleClient } from "@/src/services/supabase.service"
import { fail, ok } from "@/src/utils/response"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

const admin = createSupabaseServiceRoleClient()

function lastNMonthStarts(n: number) {
  const starts: string[] = []
  const d = new Date(); d.setUTCDate(1); d.setUTCHours(0,0,0,0)
  for (let i = n - 1; i >= 0; i--) {
    const m = new Date(d); m.setUTCMonth(d.getUTCMonth() - i)
    starts.push(m.toISOString().slice(0,10))
  }
  return starts
}

export async function GET(req: NextRequest) {
  try {
    const auth = await authenticateRequest(req)
    requireRole(auth, ["owner"])

    const { searchParams } = new URL(req.url)
    const from = searchParams.get("from") ?? new Date(Date.now() - 6*86400000).toISOString().slice(0,10)
    const to   = searchParams.get("to")   ?? new Date().toISOString().slice(0,10)
    const mode = searchParams.get("mode") ?? "weekly" // weekly | monthly

    const { data: gyms, error: gymsErr } = await admin.from("gyms").select("id,name")
    if (gymsErr) throw gymsErr
    if (!gyms?.length) return ok({ branches: [] })

    const monthlyFrom = mode === "monthly" ? lastNMonthStarts(6)[0]! : from
    const { data: payments, error: payErr } = await admin
      .from("payments")
      .select("amount,status,created_at,gym_id")
      .gte("created_at", `${monthlyFrom}T00:00:00.000Z`)
      .lte("created_at", `${to}T23:59:59.999Z`)
    if (payErr) throw payErr

    if (mode === "weekly") {
      // Day buckets per branch
      const days: string[] = []
      const cur = new Date(`${from}T00:00:00Z`)
      const end = new Date(`${to}T00:00:00Z`)
      while (cur <= end && days.length < 60) { days.push(cur.toISOString().slice(0,10)); cur.setUTCDate(cur.getUTCDate()+1) }

      const result = gyms.map(gym => {
        const buckets = new Map(days.map(d => [d, { date: d, revenue: 0, pendingTotal: 0 }]))
        for (const p of payments ?? []) {
          if (p.gym_id !== gym.id) continue
          const d = (p.created_at as string).slice(0,10)
          const b = buckets.get(d); if (!b) continue
          if (p.status === "paid" || p.status === "approved") b.revenue += Number(p.amount)
          else if (p.status === "pending") b.pendingTotal += Number(p.amount)
        }
        return { branchId: gym.id, branchName: gym.name, data: [...buckets.values()] }
      })
      return ok({ branches: result })
    } else {
      // Monthly buckets per branch
      const months = lastNMonthStarts(6)
      const result = gyms.map(gym => {
        const buckets = new Map(months.map(m => [m, { monthStart: m, revenue: 0, pendingTotal: 0 }]))
        for (const p of payments ?? []) {
          if (p.gym_id !== gym.id) continue
          const d = (p.created_at as string).slice(0,10)
          const mStart = d.slice(0,7) + "-01"
          const b = buckets.get(mStart); if (!b) continue
          if (p.status === "paid" || p.status === "approved") b.revenue += Number(p.amount)
          else if (p.status === "pending") b.pendingTotal += Number(p.amount)
        }
        return { branchId: gym.id, branchName: gym.name, data: [...buckets.values()] }
      })
      return ok({ branches: result })
    }
  } catch (e) { return fail(e) }
}
