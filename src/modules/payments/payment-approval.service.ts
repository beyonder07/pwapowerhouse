import type { AuthContext } from "@/src/middleware/auth.middleware"
import { requireRole } from "@/src/middleware/role.middleware"
import { getOwnerGymId } from "@/src/utils/owner-gym"
import { BadRequestError, NotFoundError } from "@/src/utils/errors"
import { createSupabaseServiceRoleClient } from "@/src/services/supabase.service"
import { parsePaymentDates, encodePaymentDates } from "@/src/utils/payment-dates"

export class PaymentApprovalService {
  private readonly admin = createSupabaseServiceRoleClient()
  constructor(private readonly ctx: AuthContext) {}

  /**
   * List all payments (Pending + Recent History)
   */
  async list() {
    requireRole(this.ctx, ["owner"])
    const ownerGymId = getOwnerGymId(this.ctx)

    let pendingQuery = this.admin
      .from("payments")
      .select("*, users!payments_user_id_fkey(name)")
      .eq("status", "pending")
      .order("created_at", { ascending: false })

    let historyQuery = this.admin
      .from("payments")
      .select("*, users!payments_user_id_fkey(name)")
      .neq("status", "pending")
      .order("created_at", { ascending: false })
      .limit(20)

    if (ownerGymId) {
      pendingQuery = pendingQuery.eq("gym_id", ownerGymId)
      historyQuery = historyQuery.eq("gym_id", ownerGymId)
    }

    const [pendingRes, historyRes] = await Promise.all([pendingQuery, historyQuery])

    const mapper = (p: any) => {
      const parsed = parsePaymentDates(p.screenshot_url, p.created_at)
      return {
        id: p.id,
        memberName: p.users?.name || "Unknown",
        amount: p.amount,
        planDuration: p.plan_duration,
        status: p.status,
        paymentMode: p.payment_mode,
        screenshotUrl: parsed.screenshotUrl || undefined,
        startDate: parsed.planStartDate,
        paymentDate: parsed.paymentDate,
        createdAt: p.created_at,
        approvedAt: p.approved_at
      }
    }

    return {
      pending: (pendingRes.data || []).map(mapper),
      history: (historyRes.data || []).map(mapper)
    }
  }

  /**
   * Unified Review: Approve or Reject
   */
  async review(input: { id: string, status: "approved" | "rejected", planStartDate?: string, paymentDate?: string, amount?: number, planDuration?: number }) {
    if (input.status === "approved") {
      return this.approve(input.id, input.planStartDate, input.paymentDate, input.amount, input.planDuration)
    } else {
      return this.reject(input.id)
    }
  }

  async approve(paymentId: string, customPlanStartDate?: string, customPaymentDate?: string, customAmount?: number, customPlanDuration?: number) {
    requireRole(this.ctx, ["owner"])

    // 1. Fetch the pending payment
    const { data: payment, error: fetchError } = await this.admin
      .from("payments")
      .select("*")
      .eq("id", paymentId)
      .eq("status", "pending")
      .maybeSingle()

    if (fetchError || !payment) {
      throw new NotFoundError("Pending payment request not found")
    }

    // Parse the original dates from screenshot_url
    const parsed = parsePaymentDates(payment.screenshot_url, payment.created_at)
    
    // Override with custom dates if provided by the owner
    const finalPlanStartDate = customPlanStartDate || parsed.planStartDate
    const finalPaymentDate = customPaymentDate || parsed.paymentDate

    // Re-encode dates back into screenshot_url to persist the edited dates!
    const updatedScreenshotUrl = encodePaymentDates(
      payment.screenshot_url,
      finalPlanStartDate,
      finalPaymentDate,
      payment.payment_mode
    )

    const finalAmount = customAmount !== undefined ? customAmount : payment.amount
    const finalPlanDuration = customPlanDuration !== undefined ? customPlanDuration : payment.plan_duration

    // 2. Update payment status & encoded dates in screenshot_url
    const { error: updatePaymentError } = await this.admin
      .from("payments")
      .update({
        status: "approved",
        approved_at: new Date().toISOString(),
        approved_by: this.ctx.user.id,
        screenshot_url: updatedScreenshotUrl,
        amount: finalAmount,
        plan_duration: finalPlanDuration
      })
      .eq("id", paymentId)

    if (updatePaymentError) throw updatePaymentError

    // 3. Update or Create Membership using finalPlanStartDate
    const { data: existingMembership } = await this.admin
      .from("memberships")
      .select("*")
      .eq("user_id", payment.user_id)
      .maybeSingle()

    const durationDays = finalPlanDuration || 30
    let requestedStart = new Date(finalPlanStartDate)
    if (isNaN(requestedStart.getTime())) {
      requestedStart = new Date()
    }

    if (existingMembership) {
      // Renewal: new period starts from whichever is later — current end date or requested start date
      const currentEnd = new Date(existingMembership.end_date)
      const newStart = currentEnd > requestedStart ? currentEnd : requestedStart
      const newEnd = new Date(newStart)
      newEnd.setDate(newStart.getDate() + durationDays)

      const { error: memError } = await this.admin
        .from("memberships")
        .update({
          // Keep the original enrollment start_date unchanged; only extend the end_date
          end_date: newEnd.toISOString().split("T")[0],
          status: "active",
        })
        .eq("user_id", payment.user_id)

      if (memError) throw memError
    } else {
      // First-time membership: start from the plan start date
      const newEnd = new Date(requestedStart)
      newEnd.setDate(requestedStart.getDate() + durationDays)

      const { error: memError } = await this.admin
        .from("memberships")
        .insert({
          user_id: payment.user_id,
          gym_id: payment.gym_id,
          start_date: requestedStart.toISOString().split("T")[0],
          end_date: newEnd.toISOString().split("T")[0],
          status: "active",
        })

      if (memError) throw memError
    }

    return { success: true }
  }

  async reject(paymentId: string) {
    requireRole(this.ctx, ["owner"])

    const { error } = await this.admin
      .from("payments")
      .update({ status: "rejected" })
      .eq("id", paymentId)
      .eq("status", "pending")

    if (error) throw error
    return { success: true }
  }
}
