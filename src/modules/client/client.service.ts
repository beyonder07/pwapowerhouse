import type { AuthContext } from "@/src/middleware/auth.middleware"
import { requireRole } from "@/src/middleware/role.middleware"
import {
  BadRequestError,
  ConflictError,
  ForbiddenError,
  NotFoundError,
} from "@/src/utils/errors"
import type { PaymentRequestInput } from "./client.schema"
import { parsePaymentDates, encodePaymentDates } from "@/src/utils/payment-dates"

function escapeHtml(value: unknown) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;")
}

function formatInvoiceDate(value?: string | null) {
  if (!value) return "Not available"
  return new Intl.DateTimeFormat("en-IN", { dateStyle: "medium" }).format(
    new Date(value)
  )
}

function formatInvoiceCurrency(value: number | string) {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(Number(value))
}

export class ClientService {
  constructor(private readonly ctx: AuthContext) {}

  /**
   * Aggregate Dashboard:
   * Fetches all core domain data for the client in parallel.
   */
  async getDashboard() {
    requireRole(this.ctx, ["client"])
    const userId = this.ctx.user.id
    const gymId = this.ctx.user.gymId

    const today = new Date().toISOString().split("T")[0]

    if (!gymId) {
      const [profileRes, detailsRes] = await Promise.all([
        this.ctx.supabase.from("users").select("id, name, email, role, gym_id").eq("id", userId).single(),
        this.ctx.supabase.from("user_details").select("*").eq("user_id", userId).maybeSingle(),
      ])
      if (profileRes.error) throw profileRes.error

      return {
        needsGymAssignment: true,
        user: {
          id: profileRes.data.id,
          name: profileRes.data.name,
          email: profileRes.data.email,
          role: profileRes.data.role,
          gymId: null,
          details: detailsRes.data,
        },
        gym: null,
        membership: null,
        todayAttendance: {
          checkedIn: false,
          checkedInAt: null,
          checkedOut: false,
          checkedOutAt: null,
          status: "not_checked_in",
        },
        streak: 0,
        recentPayments: [],
      }
    }

    const [profileRes, detailsRes, gymRes, membershipRes, attendanceRes, paymentsRes] = await Promise.all([
      this.ctx.supabase.from("users").select("id, name, email, role, gym_id").eq("id", userId).single(),
      this.ctx.supabase.from("user_details").select("*").eq("user_id", userId).maybeSingle(),
      this.ctx.supabase.from("gyms").select("*").eq("id", gymId).single(),
      this.ctx.supabase.from("memberships").select("*").eq("user_id", userId).maybeSingle(),
      this.ctx.supabase.from("attendance").select("*").eq("user_id", userId).eq("date", today).maybeSingle(),
      this.ctx.supabase.from("payments").select("*").eq("user_id", userId).order("created_at", { ascending: false }).limit(5)
    ])

    if (profileRes.error) throw profileRes.error
    if (gymRes.error) throw gymRes.error

    const streak = await this.calculateStreak(userId)
    const attendance = attendanceRes.data

    // Anti-Gravity Logic: Auto-calculate stale sessions (2.5 hours)
    let checkedOut = !!attendance?.check_out_time
    let checkedOutAt = attendance?.check_out_time
    let attendanceStatus = attendance?.status ?? "not_checked_in"

    if (attendance?.check_in_time && !checkedOut) {
      const checkInTime = new Date(attendance.check_in_time).getTime()
      const now = Date.now()
      const hoursPassed = (now - checkInTime) / (1000 * 60 * 60)

      if (hoursPassed > 2.5) {
        checkedOut = true
        checkedOutAt = new Date(checkInTime + 2.5 * 60 * 60 * 1000).toISOString()
        attendanceStatus = "auto_completed"
      }
    }

    return {
      needsGymAssignment: false,
      user: {
        id: profileRes.data.id,
        name: profileRes.data.name,
        email: profileRes.data.email,
        role: profileRes.data.role,
        gymId: profileRes.data.gym_id,
        details: detailsRes.data
      },
      gym: gymRes.data,
      membership: membershipRes.data ? {
        id: membershipRes.data.id,
        status: membershipRes.data.status,
        startDate: membershipRes.data.start_date,
        endDate: membershipRes.data.end_date,
        daysRemaining: Math.max(0, Math.ceil((new Date(membershipRes.data.end_date).getTime() - Date.now()) / (1000 * 60 * 60 * 24)))
      } : null,
      todayAttendance: {
        checkedIn: !!attendance,
        checkedInAt: attendance?.check_in_time,
        checkedOut,
        checkedOutAt,
        status: attendanceStatus
      },
      streak,
      recentPayments: (paymentsRes.data ?? []).map(p => ({
        id: p.id,
        amount: p.amount,
        status: p.status,
        planDuration: p.plan_duration,
        paymentMode: p.payment_mode,
        createdAt: p.created_at
      }))
    }
  }

  /**
   * Get All Payments:
   * Fetches the current plan and full payment history.
   */
  async getPayments() {
    requireRole(this.ctx, ["client"])
    const userId = this.ctx.user.id

    const [membershipRes, pendingRes, historyRes] = await Promise.all([
      this.ctx.supabase
        .from("memberships")
        .select("*")
        .eq("user_id", userId)
        .maybeSingle(),
      this.ctx.supabase
        .from("payments")
        .select("*")
        .eq("user_id", userId)
        .eq("status", "pending")
        .maybeSingle(),
      this.ctx.supabase
        .from("payments")
        .select("*")
        .eq("user_id", userId)
        .order("created_at", { ascending: false })
    ])

    return {
      currentPlan: membershipRes.data ? {
        id: membershipRes.data.id,
        status: membershipRes.data.status,
        startDate: membershipRes.data.start_date,
        endDate: membershipRes.data.end_date,
        daysRemaining: Math.max(0, Math.ceil((new Date(membershipRes.data.end_date).getTime() - Date.now()) / (1000 * 60 * 60 * 24)))
      } : null,
      pendingRequest: pendingRes.data ? (() => {
        const parsed = parsePaymentDates(pendingRes.data.screenshot_url, pendingRes.data.created_at)
        return {
          id: pendingRes.data.id,
          amount: pendingRes.data.amount,
          status: pendingRes.data.status,
          planDuration: pendingRes.data.plan_duration,
          paymentMode: pendingRes.data.payment_mode,
          screenshotUrl: parsed.screenshotUrl || undefined,
          startDate: parsed.planStartDate,
          paymentDate: parsed.paymentDate,
          createdAt: pendingRes.data.created_at
        }
      })() : null,
      history: (historyRes.data ?? []).map(p => {
        const parsed = parsePaymentDates(p.screenshot_url, p.created_at)
        return {
          id: p.id,
          amount: p.amount,
          status: p.status,
          planDuration: p.plan_duration,
          paymentMode: p.payment_mode,
          screenshotUrl: parsed.screenshotUrl || undefined,
          startDate: parsed.planStartDate,
          paymentDate: parsed.paymentDate,
          createdAt: p.created_at,
          approvedAt: p.approved_at
        }
      })
    }
  }

  /**
   * Request Payment:
   * Direct insert into payments table via user_id.
   */
  async requestPayment(input: PaymentRequestInput) {
    requireRole(this.ctx, ["client"])
    const userId = this.ctx.user.id
    const gymId = this.ctx.user.gymId

    if (!gymId) {
      throw new ForbiddenError("Please assign yourself to a gym branch first")
    }

    const encodedScreenshotUrl = encodePaymentDates(
      input.screenshotUrl,
      input.startDate || new Date().toISOString().split("T")[0],
      input.paymentDate || new Date().toISOString().split("T")[0],
      input.paymentMode
    )

    const { data, error } = await this.ctx.supabase
      .from("payments")
      .insert({
        user_id: userId,
        gym_id: gymId,
        amount: input.amount,
        plan_duration: input.planDuration,
        payment_mode: input.paymentMode,
        screenshot_url: encodedScreenshotUrl,
        status: "pending"
      })
      .select("*")
      .single()

    if (error) {
      // Handle Unique Constraint Violation (Anti-Gravity Conflict Handling)
      if (error.code === "23505") {
        throw new ConflictError("You already have a pending payment request. Please wait for approval.")
      }
      throw error
    }
    
    return data
  }

  async generateInvoice(paymentId: string) {
    requireRole(this.ctx, ["client"])
    const userId = this.ctx.user.id

    const { data: payment, error: paymentError } = await this.ctx.supabase
      .from("payments")
      .select("id,user_id,gym_id,amount,plan_duration,status,payment_mode,created_at,approved_at")
      .eq("id", paymentId)
      .eq("user_id", userId)
      .maybeSingle()

    if (paymentError) throw paymentError
    if (!payment) throw new NotFoundError("Payment not found")

    if (!["approved", "paid"].includes(payment.status)) {
      throw new BadRequestError("Invoice is available only after payment approval")
    }

    const [profileRes, gymRes] = await Promise.all([
      this.ctx.supabase
        .from("users")
        .select("name,email,phone")
        .eq("id", userId)
        .single(),
      this.ctx.supabase
        .from("gyms")
        .select("name")
        .eq("id", payment.gym_id)
        .maybeSingle(),
    ])

    if (profileRes.error) throw profileRes.error

    const invoiceNumber = `PH-${new Date(payment.created_at).getFullYear()}-${String(payment.id).padStart(6, "0")}`
    const gymName = gymRes.data?.name ?? "PowerHouse Gym"
    const paymentMode = String(payment.payment_mode ?? "manual").toUpperCase()
    const approvedDate = payment.approved_at ?? payment.created_at

    return {
      invoiceNumber,
      fileName: `${invoiceNumber}.html`,
      html: `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>${escapeHtml(invoiceNumber)} - PowerHouse Invoice</title>
  <style>
    * { box-sizing: border-box; }
    body {
      margin: 0;
      background: #f3f4f6;
      color: #111827;
      font-family: Arial, Helvetica, sans-serif;
      line-height: 1.5;
      padding: 32px;
    }
    .invoice {
      max-width: 820px;
      margin: 0 auto;
      background: #fff;
      border: 1px solid #e5e7eb;
      border-radius: 16px;
      overflow: hidden;
      box-shadow: 0 24px 80px rgba(15, 23, 42, 0.12);
    }
    .header {
      background: #05070b;
      color: #fff;
      padding: 32px;
      display: flex;
      justify-content: space-between;
      gap: 24px;
    }
    .brand {
      font-size: 28px;
      font-weight: 800;
      letter-spacing: -0.02em;
    }
    .brand span { color: #ef4444; }
    .label {
      color: #6b7280;
      font-size: 11px;
      font-weight: 800;
      letter-spacing: 0.12em;
      text-transform: uppercase;
    }
    .value {
      margin-top: 4px;
      font-size: 15px;
      font-weight: 700;
    }
    .section { padding: 28px 32px; }
    .grid {
      display: grid;
      grid-template-columns: repeat(2, minmax(0, 1fr));
      gap: 24px;
    }
    table {
      width: 100%;
      border-collapse: collapse;
      margin-top: 18px;
    }
    th, td {
      padding: 14px 0;
      border-bottom: 1px solid #e5e7eb;
      text-align: left;
    }
    th {
      color: #6b7280;
      font-size: 11px;
      letter-spacing: 0.12em;
      text-transform: uppercase;
    }
    td:last-child, th:last-child { text-align: right; }
    .total {
      display: flex;
      justify-content: flex-end;
      padding-top: 20px;
      font-size: 24px;
      font-weight: 800;
    }
    .status {
      display: inline-block;
      border: 1px solid #10b981;
      color: #047857;
      background: #ecfdf5;
      border-radius: 999px;
      padding: 4px 10px;
      font-size: 11px;
      font-weight: 800;
      text-transform: uppercase;
    }
    .footer {
      background: #f9fafb;
      color: #6b7280;
      font-size: 12px;
      padding: 20px 32px;
    }
    @media print {
      body { background: #fff; padding: 0; }
      .invoice { box-shadow: none; border-radius: 0; }
    }
  </style>
</head>
<body>
  <main class="invoice">
    <header class="header">
      <div>
        <div class="brand">Power<span>House</span></div>
        <p>${escapeHtml(gymName)}</p>
      </div>
      <div>
        <div class="label">Invoice</div>
        <div class="value">${escapeHtml(invoiceNumber)}</div>
        <p class="status">${escapeHtml(payment.status)}</p>
      </div>
    </header>

    <section class="section grid">
      <div>
        <div class="label">Billed To</div>
        <div class="value">${escapeHtml(profileRes.data.name)}</div>
        <div>${escapeHtml(profileRes.data.email)}</div>
        <div>${escapeHtml(profileRes.data.phone ?? "")}</div>
      </div>
      <div>
        <div class="label">Payment Details</div>
        <div class="value">Mode: ${escapeHtml(paymentMode)}</div>
        <div>Requested: ${escapeHtml(formatInvoiceDate(payment.created_at))}</div>
        <div>Approved: ${escapeHtml(formatInvoiceDate(approvedDate))}</div>
      </div>
    </section>

    <section class="section">
      <div class="label">Membership Plan</div>
      <table>
        <thead>
          <tr>
            <th>Description</th>
            <th>Duration</th>
            <th>Amount</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td>PowerHouse Gym Membership</td>
            <td>${escapeHtml(payment.plan_duration)} days</td>
            <td>${escapeHtml(formatInvoiceCurrency(payment.amount))}</td>
          </tr>
        </tbody>
      </table>
      <div class="total">Total: ${escapeHtml(formatInvoiceCurrency(payment.amount))}</div>
    </section>

    <footer class="footer">
      This invoice was generated by PowerHouse for a manually approved membership payment.
    </footer>
  </main>
</body>
</html>`,
    }
  }

  /**
   * Simple consecutive-day streak counter.
   */
  private async calculateStreak(userId: string): Promise<number> {
    const { data } = await this.ctx.supabase
      .from("attendance")
      .select("date")
      .eq("user_id", userId)
      .order("date", { ascending: false })
      .limit(31)

    if (!data || data.length === 0) return 0

    let streak = 0
    const cursor = new Date()
    
    // If not checked in today, streak might have ended yesterday
    const todayStr = cursor.toISOString().split("T")[0]
    const hasToday = data[0].date === todayStr
    
    if (!hasToday) {
      cursor.setDate(cursor.getDate() - 1)
    }

    const attendanceDates = new Set(data.map(a => a.date))

    while (attendanceDates.has(cursor.toISOString().split("T")[0])) {
      streak++
      cursor.setDate(cursor.getDate() - 1)
    }

    return streak
  }
}
