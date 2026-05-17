import { NextRequest } from "next/server"
import { authenticateRequest } from "@/src/middleware/auth.middleware"
import { requireRole } from "@/src/middleware/role.middleware"
import { createSupabaseServiceRoleClient } from "@/src/services/supabase.service"
import { fail, ok } from "@/src/utils/response"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

const admin = createSupabaseServiceRoleClient()

export async function GET(req: NextRequest) {
  try {
    const auth = await authenticateRequest(req)
    requireRole(auth, ["owner"])

    const { searchParams } = new URL(req.url)
    const from = searchParams.get("from") ?? daysAgo(29)
    const to = searchParams.get("to") ?? today()

    // Fetch all attendance in range with check_in_time
    const { data: rows, error } = await admin
      .from("attendance")
      .select("date, check_in_time, check_out_time")
      .gte("date", from)
      .lte("date", to)
      .not("check_in_time", "is", null)

    if (error) throw error

    // Peak hours: group by day-of-week (0=Sun) × hour (0-23)
    const heatmap: Record<string, number> = {}
    for (const row of (rows ?? [])) {
      if (!row.check_in_time) continue
      const d = new Date(row.check_in_time)
      const dow = d.getDay()     // 0=Sun
      const hour = d.getHours()
      const key = `${dow}-${hour}`
      heatmap[key] = (heatmap[key] ?? 0) + 1
    }

    // Day-of-week totals
    const dowLabels = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"]
    const byDow = dowLabels.map((label, i) => ({
      day: label,
      checkIns: Object.entries(heatmap)
        .filter(([k]) => k.startsWith(`${i}-`))
        .reduce((s, [, v]) => s + v, 0),
    }))

    // Hour-of-day totals (5am-10pm)
    const byHour = Array.from({ length: 18 }, (_, i) => i + 5).map(hour => ({
      hour: `${hour % 12 || 12}${hour < 12 ? "am" : "pm"}`,
      checkIns: Object.entries(heatmap)
        .filter(([k]) => k.endsWith(`-${hour}`))
        .reduce((s, [, v]) => s + v, 0),
    }))

    // Session duration
    const durations = (rows ?? [])
      .filter(r => r.check_in_time && r.check_out_time)
      .map(r => (new Date(r.check_out_time!).getTime() - new Date(r.check_in_time!).getTime()) / 60000)
    const avgDuration = durations.length > 0
      ? Math.round(durations.reduce((s, d) => s + d, 0) / durations.length)
      : null

    return ok({ byDow, byHour, heatmap, avgDurationMinutes: avgDuration })
  } catch (error) {
    return fail(error)
  }
}

function today() {
  return new Date().toISOString().split("T")[0]!
}
function daysAgo(n: number) {
  const d = new Date()
  d.setDate(d.getDate() - n)
  return d.toISOString().split("T")[0]!
}
