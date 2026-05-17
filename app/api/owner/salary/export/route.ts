import { NextRequest, NextResponse } from "next/server"
import { authenticateRequest } from "@/src/middleware/auth.middleware"
import { requireRole } from "@/src/middleware/role.middleware"
import { createSupabaseServiceRoleClient } from "@/src/services/supabase.service"
import { fail } from "@/src/utils/response"
import * as XLSX from "xlsx"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

const admin = createSupabaseServiceRoleClient()

function fmt(v: string | null | undefined) {
  if (!v) return "Not paid"
  try { return new Intl.DateTimeFormat("en-IN", { dateStyle: "medium" }).format(new Date(v)) } catch { return v }
}

function fmtCurrency(v: number | null | undefined) {
  return `₹${Number(v ?? 0).toLocaleString("en-IN")}`
}

export async function GET(req: NextRequest) {
  try {
    const auth = await authenticateRequest(req)
    requireRole(auth, ["owner"])

    const { searchParams } = new URL(req.url)
    const now = new Date()
    const defaultMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`
    const month = searchParams.get("month") ?? defaultMonth // YYYY-MM

    const [year, mon] = month.split("-").map(Number) as [number, number]
    const from = `${year}-${String(mon).padStart(2, "0")}-01`
    const lastDay = new Date(year, mon, 0).getDate()
    const to = `${year}-${String(mon).padStart(2, "0")}-${String(lastDay).padStart(2, "0")}`
    const monthLabel = new Intl.DateTimeFormat("en-IN", { month: "long", year: "numeric" })
      .format(new Date(`${from}T00:00:00`))

    const { data, error } = await admin
      .from("trainer_salaries")
      .select("user_id, base_salary, bonus, status, paid_at, month_start, users!inner(name, email)")
      .gte("month_start", from)
      .lte("month_start", to)
      .order("users(name)")

    if (error) throw error

    const rows = data ?? []
    const totalPayroll = rows.reduce((s: number, r: any) => s + Number(r.base_salary ?? 0) + Number(r.bonus ?? 0), 0)
    const paidAmount = rows.filter((r: any) => r.status === "paid")
      .reduce((s: number, r: any) => s + Number(r.base_salary ?? 0) + Number(r.bonus ?? 0), 0)
    const outstanding = totalPayroll - paidAmount

    const sheetData = [
      [`PowerHouse Gym — Payroll Report`, "", "", "", "", ""],
      [`Period: ${monthLabel}`, "", "", "", "", ""],
      [`Generated: ${new Intl.DateTimeFormat("en-IN", { dateStyle: "medium", timeStyle: "short" }).format(new Date())}`, "", "", "", "", ""],
      [],
      ["Trainer Name", "Email", "Base Salary", "Bonus", "Total", "Status", "Paid Date"],
      ...rows.map((r: any) => [
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
      ["", "", "", "", "Amount Paid:", fmtCurrency(paidAmount), ""],
      ["", "", "", "", "Outstanding:", fmtCurrency(outstanding), ""],
    ]

    const wb = XLSX.utils.book_new()
    const ws = XLSX.utils.aoa_to_sheet(sheetData)
    ws["!cols"] = [{ wch: 28 }, { wch: 30 }, { wch: 14 }, { wch: 14 }, { wch: 14 }, { wch: 14 }, { wch: 20 }]
    XLSX.utils.book_append_sheet(wb, ws, "Payroll")

    const buffer = XLSX.write(wb, { type: "buffer", bookType: "xlsx" })
    const filename = `PowerHouse_Payroll_${month}.xlsx`

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
