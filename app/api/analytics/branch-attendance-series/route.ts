import { NextRequest } from "next/server"
import { authenticateRequest } from "@/src/middleware/auth.middleware"
import { requireRole } from "@/src/middleware/role.middleware"
import { createSupabaseServiceRoleClient } from "@/src/services/supabase.service"
import { fail, ok } from "@/src/utils/response"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

const admin = createSupabaseServiceRoleClient()

function mondayOf(dateStr: string) {
  const d = new Date(`${dateStr}T00:00:00Z`)
  const dow = d.getUTCDay() // 0=Sun
  const diff = dow === 0 ? -6 : 1 - dow
  d.setUTCDate(d.getUTCDate() + diff)
  return d.toISOString().slice(0, 10)
}

export async function GET(req: NextRequest) {
  try {
    const auth = await authenticateRequest(req)
    requireRole(auth, ["owner"])

    const { searchParams } = new URL(req.url)
    const from = searchParams.get("from") ?? new Date(Date.now() - 6*86400000).toISOString().slice(0,10)
    const to   = searchParams.get("to")   ?? new Date().toISOString().slice(0,10)
    const mode = searchParams.get("mode") ?? "daily" // daily | weekly

    const { data: gyms, error: gymsErr } = await admin.from("gyms").select("id,name")
    if (gymsErr) throw gymsErr
    if (!gyms?.length) return ok({ branches: [] })

    const { data: attendance, error: attErr } = await admin
      .from("attendance").select("gym_id,date")
      .gte("date", from).lte("date", to).not("gym_id","is",null)
    if (attErr) throw attErr

    if (mode === "daily") {
      const days: string[] = []
      const cur = new Date(`${from}T00:00:00Z`)
      const end = new Date(`${to}T00:00:00Z`)
      while (cur <= end && days.length < 90) { days.push(cur.toISOString().slice(0,10)); cur.setUTCDate(cur.getUTCDate()+1) }

      const result = gyms.map(gym => {
        const buckets = new Map(days.map(d => [d, 0]))
        for (const a of attendance ?? []) {
          if (a.gym_id === gym.id && buckets.has(a.date)) buckets.set(a.date, (buckets.get(a.date)??0)+1)
        }
        return { branchId: gym.id, branchName: gym.name, data: days.map(d => ({ date: d, checkIns: buckets.get(d)??0 })) }
      })
      return ok({ branches: result })
    } else {
      // Weekly — group by Monday of week
      const weekMap = new Map<string, Map<string, number>>() // gymId -> weekStart -> count
      for (const gym of gyms) weekMap.set(gym.id, new Map())
      for (const a of attendance ?? []) {
        if (!a.gym_id) continue
        const week = mondayOf(a.date)
        const m = weekMap.get(a.gym_id)!
        m.set(week, (m.get(week) ?? 0) + 1)
      }
      const allWeeks = [...new Set([...(attendance??[]).map(a => mondayOf(a.date))])].sort()
      const result = gyms.map(gym => ({
        branchId: gym.id, branchName: gym.name,
        data: allWeeks.map(w => ({ date: w, checkIns: weekMap.get(gym.id)?.get(w) ?? 0 }))
      }))
      return ok({ branches: result })
    }
  } catch (e) { return fail(e) }
}
