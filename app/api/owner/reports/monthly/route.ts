import { NextRequest, NextResponse } from "next/server"
import { authenticateRequest } from "@/src/middleware/auth.middleware"
import { requireRole } from "@/src/middleware/role.middleware"
import { createSupabaseServiceRoleClient } from "@/src/services/supabase.service"
import { fail } from "@/src/utils/response"
import * as XLSX from "xlsx"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

const admin = createSupabaseServiceRoleClient()

function fmt(date: string | null | undefined) {
  if (!date) return ""
  try {
    return new Intl.DateTimeFormat("en-IN", { dateStyle: "medium", timeStyle: "short" }).format(new Date(date))
  } catch { return date }
}

function fmtDate(date: string | null | undefined) {
  if (!date) return ""
  try {
    return new Intl.DateTimeFormat("en-IN", { dateStyle: "medium" }).format(new Date(date + "T00:00:00"))
  } catch { return date ?? "" }
}

function fmtCurrency(v: number | null | undefined) {
  return `₹${Number(v ?? 0).toLocaleString("en-IN")}`
}

function monthRange(month: string): { from: string; to: string } {
  const [year, mon] = month.split("-").map(Number) as [number, number]
  const from = `${year}-${String(mon).padStart(2, "0")}-01`
  const lastDay = new Date(year, mon, 0).getDate()
  const to = `${year}-${String(mon).padStart(2, "0")}-${String(lastDay).padStart(2, "0")}`
  return { from, to }
}

export async function GET(req: NextRequest) {
  try {
    const auth = await authenticateRequest(req)
    requireRole(auth, ["owner"])

    const { searchParams } = new URL(req.url)
    const now = new Date()
    const defaultMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`
    const month = searchParams.get("month") ?? defaultMonth // format: YYYY-MM

    const { from, to } = monthRange(month)
    const monthLabel = new Intl.DateTimeFormat("en-IN", { month: "long", year: "numeric" })
      .format(new Date(`${month}-01T00:00:00`))

    /* ────────────────────────────────────────────────────────────────────
       Fetch all data in parallel
    ──────────────────────────────────────────────────────────────────── */
    const [paymentsRes, salaryRes, memberAttRes, staffAttRes] = await Promise.all([
      // 1. Revenue — all payments this month
      admin
        .from("payments")
        .select("id, amount, status, created_at, method, notes, users!inner(name, email)")
        .gte("created_at", `${from}T00:00:00.000Z`)
        .lte("created_at", `${to}T23:59:59.999Z`)
        .order("created_at", { ascending: false }),

      // 2. Payroll — trainer salaries this month
      admin
        .from("trainer_salaries")
        .select("user_id, base_salary, bonus, status, paid_at, month_start, users!inner(name, email)")
        .gte("month_start", from)
        .lte("month_start", to),

      // 3. Member (client) attendance this month
      admin
        .from("attendance")
        .select("user_id, date, check_in_time, check_out_time, distance_meters, users!inner(name, email, role)")
        .gte("date", from)
        .lte("date", to)
        .eq("users.role", "client")
        .order("date", { ascending: false }),

      // 4. Staff (trainer) attendance this month
      admin
        .from("attendance")
        .select("user_id, date, check_in_time, check_out_time, users!inner(name, email, role)")
        .gte("date", from)
        .lte("date", to)
        .eq("users.role", "trainer")
        .order("date", { ascending: false }),
    ])

    /* ────────────────────────────────────────────────────────────────────
       Build Sheet 1: Revenue
    ──────────────────────────────────────────────────────────────────── */
    const totalRevenue = (paymentsRes.data ?? [])
      .filter((p: any) => p.status === "approved" || p.status === "paid")
      .reduce((s: number, p: any) => s + Number(p.amount ?? 0), 0)
    const pendingRevenue = (paymentsRes.data ?? [])
      .filter((p: any) => p.status === "pending")
      .reduce((s: number, p: any) => s + Number(p.amount ?? 0), 0)

    const revenueRows = [
      ["PowerHouse Gym — Monthly Revenue Report", "", "", "", "", ""],
      [`Period: ${monthLabel}`, "", "", "", "", ""],
      [`Generated: ${fmt(new Date().toISOString())}`, "", "", "", "", ""],
      [],
      ["Member Name", "Email", "Amount", "Status", "Payment Date", "Method"],
      ...(paymentsRes.data ?? []).map((p: any) => [
        (p.users as any)?.name ?? "",
        (p.users as any)?.email ?? "",
        fmtCurrency(p.amount),
        String(p.status ?? "").toUpperCase(),
        fmt(p.created_at),
        p.method ?? "—",
      ]),
      [],
      ["", "", "", "", "Total Collected:", fmtCurrency(totalRevenue)],
      ["", "", "", "", "Pending Approval:", fmtCurrency(pendingRevenue)],
    ]

    /* ────────────────────────────────────────────────────────────────────
       Build Sheet 2: Payroll
    ──────────────────────────────────────────────────────────────────── */
    const totalPayroll = (salaryRes.data ?? []).reduce(
      (s: number, r: any) => s + Number(r.base_salary ?? 0) + Number(r.bonus ?? 0), 0
    )
    const paidPayroll = (salaryRes.data ?? [])
      .filter((r: any) => r.status === "paid")
      .reduce((s: number, r: any) => s + Number(r.base_salary ?? 0) + Number(r.bonus ?? 0), 0)

    const payrollRows = [
      ["PowerHouse Gym — Trainer Payroll Report", "", "", "", "", ""],
      [`Period: ${monthLabel}`, "", "", "", "", ""],
      [`Generated: ${fmt(new Date().toISOString())}`, "", "", "", "", ""],
      [],
      ["Trainer Name", "Email", "Base Salary", "Bonus", "Total", "Status", "Paid Date"],
      ...(salaryRes.data ?? []).map((r: any) => [
        (r.users as any)?.name ?? "",
        (r.users as any)?.email ?? "",
        fmtCurrency(r.base_salary),
        fmtCurrency(r.bonus),
        fmtCurrency(Number(r.base_salary ?? 0) + Number(r.bonus ?? 0)),
        String(r.status ?? "pending").toUpperCase(),
        r.paid_at ? fmt(r.paid_at) : "Not paid",
      ]),
      [],
      ["", "", "", "", "Total Payroll:", fmtCurrency(totalPayroll), ""],
      ["", "", "", "", "Amount Paid:", fmtCurrency(paidPayroll), ""],
      ["", "", "", "", "Outstanding:", fmtCurrency(totalPayroll - paidPayroll), ""],
    ]

    /* ────────────────────────────────────────────────────────────────────
       Build Sheet 3: Member Attendance
    ──────────────────────────────────────────────────────────────────── */
    const memberAttData = (memberAttRes.data ?? []).filter(
      (a: any) => (a.users as any)?.role === "client"
    )
    const memberAttRows = [
      ["PowerHouse Gym — Member Attendance Report", "", "", "", ""],
      [`Period: ${monthLabel}`, "", "", "", ""],
      [`Generated: ${fmt(new Date().toISOString())}`, "", "", "", ""],
      [],
      ["Member Name", "Email", "Date", "Check-in Time", "Check-out Time", "Distance (m)"],
      ...memberAttData.map((a: any) => [
        (a.users as any)?.name ?? "",
        (a.users as any)?.email ?? "",
        fmtDate(a.date),
        a.check_in_time ? fmt(a.check_in_time) : "",
        a.check_out_time ? fmt(a.check_out_time) : "—",
        Number(a.distance_meters ?? 0),
      ]),
      [],
      ["", "", "", "", "Total Check-ins:", memberAttData.length],
      ["", "", "", "", "Unique Members:", new Set(memberAttData.map((a: any) => a.user_id)).size],
    ]

    /* ────────────────────────────────────────────────────────────────────
       Build Sheet 4: Staff Attendance
    ──────────────────────────────────────────────────────────────────── */
    const staffAttData = (staffAttRes.data ?? []).filter(
      (a: any) => (a.users as any)?.role === "trainer"
    )
    // Build per-trainer summary
    const trainerSummary = new Map<string, { name: string; email: string; days: Set<string> }>()
    for (const a of staffAttData) {
      const uid: string = a.user_id
      if (!trainerSummary.has(uid)) {
        trainerSummary.set(uid, {
          name: (a.users as any)?.name ?? "",
          email: (a.users as any)?.email ?? "",
          days: new Set(),
        })
      }
      trainerSummary.get(uid)!.days.add(a.date)
    }

    // Working days in month (Mon–Sat)
    const workingDays = (() => {
      let count = 0
      const cursor = new Date(`${from}T00:00:00`)
      const end = new Date(`${to}T00:00:00`)
      while (cursor <= end) {
        if (cursor.getDay() !== 0) count++ // exclude Sunday
        cursor.setDate(cursor.getDate() + 1)
      }
      return count
    })()

    const staffAttRows = [
      ["PowerHouse Gym — Staff Attendance Report", "", "", "", "", ""],
      [`Period: ${monthLabel}  |  Working Days: ${workingDays}`, "", "", "", "", ""],
      [`Generated: ${fmt(new Date().toISOString())}`, "", "", "", "", ""],
      [],
      // Detailed daily log
      ["Trainer Name", "Email", "Date", "Check-in Time", "Check-out Time"],
      ...staffAttData.map((a: any) => [
        (a.users as any)?.name ?? "",
        (a.users as any)?.email ?? "",
        fmtDate(a.date),
        a.check_in_time ? fmt(a.check_in_time) : "",
        a.check_out_time ? fmt(a.check_out_time) : "—",
      ]),
      [],
      // Summary per trainer
      ["MONTHLY SUMMARY", "", "", "", ""],
      ["Trainer Name", "Email", "Days Present", "Working Days", "Attendance %"],
      ...[...trainerSummary.values()].map(({ name, email, days }) => [
        name,
        email,
        days.size,
        workingDays,
        workingDays > 0 ? `${Math.round((days.size / workingDays) * 100)}%` : "0%",
      ]),
    ]

    /* ────────────────────────────────────────────────────────────────────
       Assemble workbook
    ──────────────────────────────────────────────────────────────────── */
    const wb = XLSX.utils.book_new()

    const wsRevenue = XLSX.utils.aoa_to_sheet(revenueRows)
    const wsPayroll = XLSX.utils.aoa_to_sheet(payrollRows)
    const wsMemberAtt = XLSX.utils.aoa_to_sheet(memberAttRows)
    const wsStaffAtt = XLSX.utils.aoa_to_sheet(staffAttRows)

    // Set column widths
    const wide = (cols: number, widths: number[]) =>
      Array.from({ length: cols }, (_, i) => ({ wch: widths[i] ?? 18 }))

    wsRevenue["!cols"] = wide(6, [28, 30, 14, 12, 22, 14])
    wsPayroll["!cols"] = wide(7, [28, 30, 14, 14, 14, 12, 22])
    wsMemberAtt["!cols"] = wide(6, [28, 30, 14, 22, 22, 14])
    wsStaffAtt["!cols"] = wide(5, [28, 30, 14, 22, 22])

    XLSX.utils.book_append_sheet(wb, wsRevenue, "Revenue")
    XLSX.utils.book_append_sheet(wb, wsPayroll, "Payroll")
    XLSX.utils.book_append_sheet(wb, wsMemberAtt, "Member Attendance")
    XLSX.utils.book_append_sheet(wb, wsStaffAtt, "Staff Attendance")

    /* ────────────────────────────────────────────────────────────────────
       Stream as download
    ──────────────────────────────────────────────────────────────────── */
    const buffer = XLSX.write(wb, { type: "buffer", bookType: "xlsx" })
    const filename = `PowerHouse_Report_${month}.xlsx`

    return new NextResponse(buffer, {
      status: 200,
      headers: {
        "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "Content-Disposition": `attachment; filename="${filename}"`,
        "Content-Length": String(buffer.length),
      },
    })
  } catch (error) {
    return fail(error)
  }
}
