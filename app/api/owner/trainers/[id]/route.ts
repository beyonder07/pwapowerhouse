import { NextRequest } from "next/server"
import { authenticateRequest } from "@/src/middleware/auth.middleware"
import { requireRole } from "@/src/middleware/role.middleware"
import { createSupabaseServiceRoleClient } from "@/src/services/supabase.service"
import { fail, ok } from "@/src/utils/response"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

const admin = createSupabaseServiceRoleClient()
const TRAINER_DATA_BUCKET = "trainer-data"
const WORKOUT_PLANS_PATH = "workout-plans/plans.json"

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await authenticateRequest(req)
    requireRole(auth, ["owner"])
    const { id } = await params

    const now = new Date()
    const monthStart = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-01`
    const today = now.toISOString().split("T")[0]!

    const [userRes, detailsRes, attendanceRes, salaryRes] = await Promise.all([
      admin.from("users").select("id,name,email,gym_id,created_at").eq("id", id).maybeSingle(),
      admin.from("user_details").select("phone,profile_pic_url,profile_photo_url,specialization,experience,govt_id_url,govt_id_type,floor_start_time,floor_end_time").eq("user_id", id).maybeSingle(),
      admin.from("attendance").select("date,check_in_time,check_out_time,status,distance_meters").eq("user_id", id).gte("date", monthStart).order("date", { ascending: false }),
      admin.from("trainer_salaries").select("id,base_salary,bonus,status,paid_at,month_start").eq("user_id", id).order("month_start", { ascending: false }).limit(6),
    ])

    if (!userRes.data) return fail(new Error("Trainer not found"))

    // Attendance calendar for this month
    const attendance = attendanceRes.data ?? []
    const presentDays = attendance.length
    const lateDays = attendance.filter((a) => {
      if (!a.check_in_time) return false
      if (a.status === "late") return true
      const parts = new Intl.DateTimeFormat("en-GB", {
        timeZone: "Asia/Kolkata",
        hour: "2-digit",
        minute: "2-digit",
        hour12: false,
      }).formatToParts(new Date(a.check_in_time))
      const values = Object.fromEntries(parts.map((p) => [p.type, p.value]))
      const mins = Number(values.hour) * 60 + Number(values.minute)
      const inMorning = mins >= 360 && mins <= 600
      const inEvening = mins >= 960 && mins <= 1320
      if (inMorning) return mins > 360
      if (inEvening) return mins > 960
      return false
    }).length

    const workingDays = now.getDate() // days elapsed in month
    const attendanceRate = workingDays > 0 ? Math.round((presentDays / workingDays) * 100) : 0

    // Today attendance
    const todayRecord = attendance.find(a => a.date === today)

    // Calendar view: each day of month
    const daysInMonth = now.getDate()
    const calendar: Array<{ date: string; present: boolean }> = []
    for (let d = 1; d <= daysInMonth; d++) {
      const dateStr = `${monthStart.slice(0, 7)}-${String(d).padStart(2, "0")}`
      calendar.push({ date: dateStr, present: attendance.some(a => a.date === dateStr) })
    }

    // Clients with plans
    let clients: Array<{ id: string; name: string; planStatus: string }> = []
    try {
      const { data: storageData } = await admin.storage.from(TRAINER_DATA_BUCKET).download(WORKOUT_PLANS_PATH)
      if (storageData) {
        const plans = JSON.parse(await storageData.text()) as Array<any>
        const myPlans = plans.filter(p => p.trainerId === id && p.status !== "archived")
        const memberIds = [...new Set(myPlans.map((p: any) => p.memberId))]
        if (memberIds.length > 0) {
          const membersRes = await admin.from("users").select("id,name").in("id", memberIds)
          const memberMap = new Map((membersRes.data ?? []).map((m: any) => [m.id, m.name]))
          clients = myPlans.map((p: any) => ({
            id: p.memberId,
            name: memberMap.get(p.memberId) ?? "Member",
            planStatus: p.status,
          }))
        }
      }
    } catch { /* storage not ready */ }

    return ok({
      id: userRes.data.id,
      name: userRes.data.name ?? userRes.data.email ?? "Trainer",
      email: userRes.data.email,
      phone: detailsRes.data?.phone ?? null,
      avatarUrl: detailsRes.data?.profile_pic_url ?? detailsRes.data?.profile_photo_url ?? null,
      specialization: detailsRes.data?.specialization ?? null,
      experience: detailsRes.data?.experience ?? null,
      govtIdUrl: detailsRes.data?.govt_id_url ?? null,
      govtIdType: detailsRes.data?.govt_id_type ?? null,
      joinDate: userRes.data.created_at,
      attendance: {
        presentDays,
        workingDays,
        attendanceRate,
        lateDays,
        checkedInToday: !!todayRecord,
        calendar,
      },
      clients,
      salaryHistory: (salaryRes.data ?? []).map((s: any) => ({
        id: s.id,
        monthStart: s.month_start,
        baseSalary: Number(s.base_salary),
        bonus: Number(s.bonus),
        total: Number(s.base_salary) + Number(s.bonus),
        status: s.status,
        paidAt: s.paid_at,
      })),
    })
  } catch (error) {
    return fail(error)
  }
}
