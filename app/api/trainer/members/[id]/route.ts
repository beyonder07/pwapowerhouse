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
    requireRole(auth, ["trainer"])
    const { id } = await params

    const now = new Date()
    const monthStart = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-01`

    // Verify that the trainer and the member belong to the same gym
    const [trainerRes, memberRes] = await Promise.all([
      admin.from("users").select("gym_id").eq("id", auth.user.id).maybeSingle(),
      admin.from("users").select("gym_id").eq("id", id).maybeSingle(),
    ])

    if (!trainerRes.data || !memberRes.data) {
      return fail(new Error("Trainer or Member not found"))
    }

    if (trainerRes.data.gym_id !== memberRes.data.gym_id) {
      return fail(new Error("Unauthorized: You are not assigned to this member's gym"))
    }

    const [
      userRes,
      detailsRes,
      membershipRes,
      paymentsRes,
      requestsRes,
      attendanceRes,
    ] = await Promise.all([
      admin.from("users").select("id,name,email,gym_id,created_at").eq("id", id).maybeSingle(),
      admin.from("user_details").select("phone,profile_pic_url,profile_photo_url,govt_id_type,govt_id_number,govt_id_url").eq("user_id", id).maybeSingle(),
      admin.from("memberships").select("start_date,end_date,status,gym_id").eq("user_id", id).order("end_date", { ascending: false }).limit(1).maybeSingle(),
      admin.from("payments").select("id,amount,plan_duration,status,payment_mode,created_at,approved_at,month,source,created_by").eq("user_id", id).order("created_at", { ascending: false }).limit(20),
      admin.from("payment_requests").select("id,amount,month,status,payment_mode,created_at,created_by,notes,screenshot_url").eq("member_id", id).neq("status", "approved").order("created_at", { ascending: false }).limit(20),
      admin.from("attendance").select("date,check_in_time,check_out_time,distance_meters").eq("user_id", id).order("date", { ascending: false }).limit(60),
    ])

    if (!userRes.data) return fail(new Error("Member not found"))

    // Attendance stats
    const attendance = attendanceRes.data ?? []
    const thisMonthAttendance = attendance.filter(a => a.date >= monthStart)

    // Streak
    let streak = 0
    const attendanceDates = new Set(attendance.map(a => a.date))
    const cursor = new Date()
    const todayKey = cursor.toISOString().split("T")[0]!
    if (!attendanceDates.has(todayKey)) cursor.setDate(cursor.getDate() - 1)
    while (attendanceDates.has(cursor.toISOString().split("T")[0]!)) {
      streak++
      cursor.setDate(cursor.getDate() - 1)
    }

    // Avg session duration
    const durations = attendance
      .filter(a => a.check_in_time && a.check_out_time)
      .map(a => (new Date(a.check_out_time!).getTime() - new Date(a.check_in_time!).getTime()) / 60000)
    const avgDuration = durations.length > 0 ? Math.round(durations.reduce((s, d) => s + d, 0) / durations.length) : null

    // Membership
    const membership = membershipRes.data
    const daysLeft = membership?.end_date
      ? Math.max(0, Math.ceil((new Date(membership.end_date + "T23:59:59").getTime() - Date.now()) / 86400000))
      : 0

    // Workout plan
    let workoutPlan = null
    try {
      const { data: storageData } = await admin.storage.from(TRAINER_DATA_BUCKET).download(WORKOUT_PLANS_PATH)
      if (storageData) {
        const plans = JSON.parse(await storageData.text()) as Array<any>
        const plan = plans.filter(p => p.memberId === id && p.status !== "archived")
          .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())[0]
        if (plan) {
          workoutPlan = {
            title: plan.title,
            status: plan.status,
            dayCount: Array.isArray(plan.split) ? plan.split.length : 0,
            exerciseCount: Array.isArray(plan.split) ? plan.split.reduce((s: number, d: any) => s + (Array.isArray(d?.exercises) ? d.exercises.length : 0), 0) : 0,
            updatedAt: plan.updatedAt,
          }
        }
      }
    } catch { /* no plans file yet */ }

    // Merge payment request history and approved payments
    const finalPayments = (paymentsRes.data ?? []).map(p => ({
      id: String(p.id),
      amount: Number(p.amount),
      planDuration: p.plan_duration,
      month: p.month || null,
      status: p.status,
      paymentMode: p.payment_mode,
      createdAt: p.created_at,
      approvedAt: p.approved_at,
      source: p.source || null,
      createdBy: p.created_by || null,
      isRequest: false,
    }))

    const pendingOrRejectedRequests = (requestsRes.data ?? []).map(r => ({
      id: r.id,
      amount: Number(r.amount),
      planDuration: null,
      month: r.month,
      status: r.status,
      paymentMode: r.payment_mode,
      createdAt: r.created_at,
      approvedAt: null,
      source: r.created_by,
      createdBy: r.created_by,
      isRequest: true,
      notes: r.notes,
      screenshotUrl: r.screenshot_url,
    }))

    const unifiedHistory = [...pendingOrRejectedRequests, ...finalPayments].sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    )

    return ok({
      id: userRes.data.id,
      name: userRes.data.name ?? userRes.data.email ?? "Member",
      email: userRes.data.email,
      phone: detailsRes.data?.phone ?? null,
      avatarUrl: detailsRes.data?.profile_pic_url ?? detailsRes.data?.profile_photo_url ?? null,
      joinDate: userRes.data.created_at,
      membership: membership ? {
        status: membership.status,
        startDate: membership.start_date,
        endDate: membership.end_date,
        daysLeft,
      } : null,
      attendance: {
        total: attendance.length,
        thisMonth: thisMonthAttendance.length,
        streak,
        avgDurationMinutes: avgDuration,
        lastDate: attendance[0]?.date ?? null,
      },
      workoutPlan,
      payments: unifiedHistory,
    })
  } catch (error) {
    return fail(error)
  }
}
