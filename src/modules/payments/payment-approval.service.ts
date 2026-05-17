import type { AuthContext } from "@/src/middleware/auth.middleware"
import { requireRole } from "@/src/middleware/role.middleware"
import { getOwnerGymId } from "@/src/utils/owner-gym"
import { BadRequestError, NotFoundError } from "@/src/utils/errors"
import { z } from "zod"

export class PaymentApprovalService {
  constructor(private readonly ctx: AuthContext) {}

  /**
   * List all payments (Pending + Recent History)
   */
  async list() {
    requireRole(this.ctx, ["owner"])
    const ownerGymId = getOwnerGymId(this.ctx)

    let pendingQuery = this.ctx.supabase
      .from("payments")
      .select("*, users(name)")
      .eq("status", "pending")
      .order("created_at", { ascending: false })

    let historyQuery = this.ctx.supabase
      .from("payments")
      .select("*, users(name)")
      .neq("status", "pending")
      .order("created_at", { ascending: false })
      .limit(20)

    if (ownerGymId) {
      pendingQuery = pendingQuery.eq("gym_id", ownerGymId)
      historyQuery = historyQuery.eq("gym_id", ownerGymId)
    }

    const [pendingRes, historyRes] = await Promise.all([pendingQuery, historyQuery])

    const mapper = (p: any) => ({
      id: p.id,
      memberName: p.users?.name || "Unknown",
      amount: p.amount,
      planDuration: p.plan_duration,
      status: p.status,
      paymentMode: p.payment_mode,
      screenshotUrl: p.screenshot_url,
      createdAt: p.created_at,
      approvedAt: p.approved_at
    })

    return {
      pending: (pendingRes.data || []).map(mapper),
      history: (historyRes.data || []).map(mapper)
    }
  }

  /**
   * Unified Review: Approve or Reject
   */
  async review(input: { id: string, status: "approved" | "rejected" }) {
    if (input.status === "approved") {
      return this.approve(input.id)
    } else {
      return this.reject(input.id)
    }
  }

  async approve(paymentId: string) {
    requireRole(this.ctx, ["owner"])

    // 1. Fetch the pending payment
    const { data: payment, error: fetchError } = await this.ctx.supabase
      .from("payments")
      .select("*")
      .eq("id", paymentId)
      .eq("status", "pending")
      .maybeSingle()

    if (fetchError || !payment) {
      throw new NotFoundError("Pending payment request not found")
    }

    // 2. Update payment status
    const { error: updatePaymentError } = await this.ctx.supabase
      .from("payments")
      .update({
        status: "approved",
        approved_at: new Date().toISOString(),
        approved_by: this.ctx.user.id,
      })
      .eq("id", paymentId)

    if (updatePaymentError) throw updatePaymentError

    // 3. Update or Create Membership
    const { data: existingMembership } = await this.ctx.supabase
      .from("memberships")
      .select("*")
      .eq("user_id", payment.user_id)
      .maybeSingle()

    const durationDays = payment.plan_duration || 30
    let startDate = new Date()
    let endDate = new Date()

    if (existingMembership) {
      const currentEnd = new Date(existingMembership.end_date)
      startDate = currentEnd > new Date() ? currentEnd : new Date()
      endDate = new Date(startDate)
      endDate.setDate(startDate.getDate() + durationDays)

      const { error: memError } = await this.ctx.supabase
        .from("memberships")
        .update({
          start_date: startDate.toISOString().split("T")[0],
          end_date: endDate.toISOString().split("T")[0],
          status: "active",
        })
        .eq("user_id", payment.user_id)
      
      if (memError) throw memError
    } else {
      endDate.setDate(startDate.getDate() + durationDays)
      const { error: memError } = await this.ctx.supabase
        .from("memberships")
        .insert({
          user_id: payment.user_id,
          gym_id: payment.gym_id,
          start_date: startDate.toISOString().split("T")[0],
          end_date: endDate.toISOString().split("T")[0],
          status: "active",
        })
      
      if (memError) throw memError
    }

    return { success: true }
  }

  async reject(paymentId: string) {
    requireRole(this.ctx, ["owner"])

    const { error } = await this.ctx.supabase
      .from("payments")
      .update({ status: "rejected" })
      .eq("id", paymentId)
      .eq("status", "pending")

    if (error) throw error
    return { success: true }
  }
}
