import { NextRequest } from "next/server"
import { authenticateRequest } from "@/src/middleware/auth.middleware"
import { requireRole } from "@/src/middleware/role.middleware"
import { fail, ok } from "@/src/utils/response"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

const TRAINER_DATA_BUCKET = "trainer-data"
const WORKOUT_PLANS_PATH = "workout-plans/plans.json"

function pad(n: number) { return String(n).padStart(2, "0") }

function zonedMinutes(iso: string) {
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone: "Asia/Kolkata",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).formatToParts(new Date(iso))
  const vals = Object.fromEntries(parts.map(p => [p.type, p.value]))
  return Number(vals.hour) * 60 + Number(vals.minute)
}

function formatTimeFromMinutes(totalMinutes: number) {
  const h24 = Math.floor(totalMinutes / 60)
  const min = totalMinutes % 60
  const h12 = h24 % 12 || 12
  const period = h24 >= 12 ? "PM" : "AM"
  return `${h12}:${pad(min)} ${period}`
}

function formatTime(iso: string | null) {
  if (!iso) return null
  return formatTimeFromMinutes(zonedMinutes(iso))
}

function workDurationStr(checkIn: string, checkOut: string): string {
  const ms = Math.max(0, new Date(checkOut).getTime() - new Date(checkIn).getTime())
  const totalMins = Math.floor(ms / 60000)
  const h = Math.floor(totalMins / 60)
  const m = totalMins % 60
  if (h <= 0) return `${m}m`
  if (m <= 0) return `${h}h`
  return `${h}h ${m}m`
}

function workMinutesNum(checkIn: string, checkOut: string): number {
  const ms = Math.max(0, new Date(checkOut).getTime() - new Date(checkIn).getTime())
  return Math.floor(ms / 60000)
}

function isLateCheckIn(checkInIso: string, floorStartTime: string | null): boolean {
  if (!floorStartTime) return false
  const actualMins = zonedMinutes(checkInIso)
  const parts = floorStartTime.split(":").map(Number)
  const expectedMins = (parts[0] ?? 0) * 60 + (parts[1] ?? 0)
  return actualMins > expectedMins
}

import { createSupabaseServiceRoleClient } from "@/src/services/supabase.service"

const admin = createSupabaseServiceRoleClient()

export async function GET(req: NextRequest) {
  try {
    const auth = await authenticateRequest(req)
    requireRole(auth, ["trainer"])

    const id = auth.user.id
    const now = new Date()
    const monthStart = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-01`
    const today = now.toISOString().split("T")[0]!
    const daysElapsed = now.getDate()

    const [userRes, detailsRes, attendanceRes] = await Promise.all([
      admin.from("users").select("id,name,email,gym_id,created_at").eq("id", id).maybeSingle(),
      admin.from("user_details")
        .select("phone,profile_pic_url,profile_photo_url,specialization,experience,govt_id_url,govt_id_type,floor_start_time,floor_end_time")
        .eq("user_id", id).maybeSingle(),
      admin.from("attendance")
        .select("date,check_in_time,check_out_time,status,distance_meters")
        .eq("user_id", id)
        .gte("date", monthStart)
        .order("date", { ascending: false }),
    ])

    if (!userRes.data) return fail(new Error("Trainer not found"))

    const floorStartTime = (detailsRes.data as any)?.floor_start_time ?? null
    const floorEndTime = (detailsRes.data as any)?.floor_end_time ?? null
    const attendance = attendanceRes.data ?? []
    const attendanceByDate = new Map(attendance.map(a => [a.date, a]))

    // Build calendar
    const calendarDays: Array<{
      date: string
      status: "present" | "late" | "absent" | "half-day"
      checkInTime: string | null
      checkOutTime: string | null
      workDuration: string | null
      isLate: boolean
    }> = []

    let totalWorkMinutes = 0
    let checkInMinutesSum = 0, checkInCount = 0
    let checkOutMinutesSum = 0, checkOutCount = 0
    let lateDays = 0, halfDays = 0

    for (let d = 1; d <= daysElapsed; d++) {
      const dateStr = `${monthStart.slice(0, 7)}-${pad(d)}`
      const rec = attendanceByDate.get(dateStr)

      if (!rec || !rec.check_in_time) {
        calendarDays.push({ date: dateStr, status: "absent", checkInTime: null, checkOutTime: null, workDuration: null, isLate: false })
        continue
      }

      const late = rec.status === "late" || isLateCheckIn(rec.check_in_time, floorStartTime)
      const isHalfDay = rec.status === "half-day"
      const checkOut = rec.check_out_time ?? null
      const dur = checkOut ? workDurationStr(rec.check_in_time, checkOut) : null

      if (late) lateDays++
      if (isHalfDay) halfDays++
      if (checkOut) totalWorkMinutes += workMinutesNum(rec.check_in_time, checkOut)

      const inMins = zonedMinutes(rec.check_in_time)
      checkInMinutesSum += inMins
      checkInCount++
      if (checkOut) { checkOutMinutesSum += zonedMinutes(checkOut); checkOutCount++ }

      calendarDays.push({
        date: dateStr,
        status: isHalfDay ? "half-day" : late ? "late" : "present",
        checkInTime: formatTime(rec.check_in_time),
        checkOutTime: formatTime(checkOut),
        workDuration: dur,
        isLate: late,
      })
    }

    const presentDays = attendance.length
    const absentDays = daysElapsed - presentDays
    const attendanceRate = daysElapsed > 0 ? Math.round((presentDays / daysElapsed) * 100) : 0
    const avgCheckIn = checkInCount > 0 ? formatTimeFromMinutes(Math.round(checkInMinutesSum / checkInCount)) : null
    const avgCheckOut = checkOutCount > 0 ? formatTimeFromMinutes(Math.round(checkOutMinutesSum / checkOutCount)) : null
    const totalHoursWorked = totalWorkMinutes > 0 ? `${Math.floor(totalWorkMinutes / 60)}h ${totalWorkMinutes % 60}m` : null

    let consecutiveAbsences = 0
    for (let d = daysElapsed; d >= 1; d--) {
      const dateStr = `${monthStart.slice(0, 7)}-${pad(d)}`
      if (attendanceByDate.has(dateStr)) break
      consecutiveAbsences++
    }

    const checkedInToday = !!attendanceByDate.get(today)?.check_in_time

    const insights: string[] = []
    if (attendanceRate < 80) insights.push(`Attendance at ${attendanceRate}% — below 80% threshold`)
    if (lateDays >= 5) insights.push(`Late check-in ${lateDays} times this month`)
    if (consecutiveAbsences >= 3) insights.push(`${consecutiveAbsences} consecutive absences`)
    if (absentDays > 5) insights.push(`Missed ${absentDays} working days this month`)
    if (halfDays > 0) insights.push(`${halfDays} half-day${halfDays > 1 ? "s" : ""} recorded`)

    // Clients from workout plans
    let clients: Array<{ id: string; name: string; planStatus: string }> = []
    try {
      const { data: storageData } = await admin.storage.from(TRAINER_DATA_BUCKET).download(WORKOUT_PLANS_PATH)
      if (storageData) {
        const plans = JSON.parse(await storageData.text()) as Array<any>
        const myPlans = plans.filter(p => p.trainerId === id && p.status !== "archived")
        const memberIds = [...new Set(myPlans.map((p: any) => p.memberId))]
        if (memberIds.length > 0) {
          const membersRes = await admin.from("users").select("id,name").in("id", memberIds as string[])
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
      phone: (detailsRes.data as any)?.phone ?? null,
      avatarUrl: (detailsRes.data as any)?.profile_pic_url ?? (detailsRes.data as any)?.profile_photo_url ?? null,
      specialization: (detailsRes.data as any)?.specialization ?? null,
      experience: (detailsRes.data as any)?.experience ?? null,
      govtIdUrl: (detailsRes.data as any)?.govt_id_url ?? null,
      govtIdType: (detailsRes.data as any)?.govt_id_type ?? null,
      joinDate: userRes.data.created_at,
      floorTiming: {
        startTime: floorStartTime,
        endTime: floorEndTime,
        startLabel: floorStartTime ? formatTimeFromMinutes(Number(floorStartTime.split(":")[0]) * 60 + Number(floorStartTime.split(":")[1])) : null,
        endLabel: floorEndTime ? formatTimeFromMinutes(Number(floorEndTime.split(":")[0]) * 60 + Number(floorEndTime.split(":")[1])) : null,
      },
      attendance: {
        presentDays,
        absentDays,
        lateDays,
        halfDays,
        workingDays: daysElapsed,
        attendanceRate,
        checkedInToday,
        consecutiveAbsences,
        totalHoursWorked,
        avgCheckIn,
        avgCheckOut,
        calendar: calendarDays,
        insights,
      },
      clients,
    })
  } catch (error) {
    return fail(error)
  }
}
