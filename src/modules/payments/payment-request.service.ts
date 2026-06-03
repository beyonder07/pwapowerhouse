import type { AuthContext } from "@/src/middleware/auth.middleware"
import { requireRole } from "@/src/middleware/role.middleware"
import { BadRequestError, ConflictError, ForbiddenError } from "@/src/utils/errors"
import { createSupabaseServiceRoleClient } from "@/src/services/supabase.service"

export interface PaymentRequestInput {
  memberId: string
  amount: number
  month: string
  paymentMode: 'cash' | 'upi' | 'card' | 'bank-transfer' | 'other'
  notes?: string
  screenshotUrl?: string
  createdBy: 'trainer' | 'member'
}

export class PaymentRequestService {
  private readonly admin = createSupabaseServiceRoleClient()

  constructor(private readonly ctx: AuthContext) {}

  /**
   * Check if a request or payment already exists for the member and month.
   */
  async checkDuplicate(memberId: string, month: string) {
    // 1. Check pending request in payment_requests
    const { data: existingRequest, error: reqError } = await this.admin
      .from("payment_requests")
      .select("id, status")
      .eq("member_id", memberId)
      .eq("month", month)
      .eq("status", "pending")
      .maybeSingle()

    if (reqError) throw reqError
    if (existingRequest) {
      return { exists: true, type: "request" as const }
    }

    // 2. Check approved/paid payment in payments
    const { data: existingPayment, error: payError } = await this.admin
      .from("payments")
      .select("id")
      .eq("user_id", memberId)
      .eq("month", month)
      .maybeSingle()

    if (payError) throw payError
    if (existingPayment) {
      return { exists: true, type: "payment" as const }
    }

    return { exists: false, type: null }
  }

  /**
   * Create a new payment request.
   */
  async createRequest(input: PaymentRequestInput) {
    const isTrainer = this.ctx.user.role === "trainer"
    const isClient = this.ctx.user.role === "client"

    if (isTrainer) {
      requireRole(this.ctx, ["trainer"])
    } else if (isClient) {
      requireRole(this.ctx, ["client"])
    } else {
      requireRole(this.ctx, ["trainer", "client"])
    }

    // Validate screenshot for UPI mode
    if (input.paymentMode === "upi" && !input.screenshotUrl) {
      throw new BadRequestError("Screenshot is required for UPI payments")
    }

    // Enforce trainer daily limits (Max 3 requests per day)
    if (input.createdBy === "trainer" && isTrainer) {
      const todayStr = new Date().toISOString().split("T")[0]
      
      const { count, error: countError } = await this.admin
        .from("payment_requests")
        .select("*", { count: "exact", head: true })
        .eq("trainer_id", this.ctx.user.id)
        .gte("created_at", `${todayStr}T00:00:00Z`)
        .lte("created_at", `${todayStr}T23:59:59Z`)

      if (countError) throw countError
      if (count !== null && count >= 3) {
        throw new ForbiddenError("Daily limit reached. You can only submit up to 3 requests per day.")
      }
    }

    // Check duplicates before inserting
    const duplicate = await this.checkDuplicate(input.memberId, input.month)
    if (duplicate.exists) {
      if (duplicate.type === "request") {
        throw new ConflictError("A pending request already exists for this month")
      } else {
        throw new ConflictError("Payment already exists for this month")
      }
    }

    // Insert payment request
    const { data, error } = await this.admin
      .from("payment_requests")
      .insert({
        member_id: input.memberId,
        trainer_id: input.createdBy === "trainer" ? this.ctx.user.id : null,
        amount: input.amount,
        month: input.month,
        status: "pending",
        created_by: input.createdBy,
        payment_mode: input.paymentMode,
        notes: input.notes || null,
        screenshot_url: input.screenshotUrl || null,
      })
      .select("*")
      .single()

    if (error) {
      // Catch DB unique constraint error
      if (error.code === "23505") {
        throw new ConflictError("A request has already been submitted for this month")
      }
      throw error
    }

    return data
  }

  /**
   * List all pending requests for the owner.
   */
  async listPending() {
    requireRole(this.ctx, ["owner"])

    // Self-cleaning: Automatically delete pending requests older than 7 days
    const sevenDaysAgo = new Date()
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7)
    
    await this.admin
      .from("payment_requests")
      .delete()
      .eq("status", "pending")
      .lt("created_at", sevenDaysAgo.toISOString())

    // Fetch pending requests with member user profiles
    const { data, error } = await this.admin
      .from("payment_requests")
      .select("*, users!payment_requests_member_id_fkey(name, email)")
      .eq("status", "pending")
      .order("created_at", { ascending: false })

    if (error) throw error

    return (data || []).map((row: any) => ({
      id: row.id,
      memberId: row.member_id,
      trainerId: row.trainer_id,
      memberName: row.users?.name || "Unknown Member",
      memberEmail: row.users?.email || "No Email",
      amount: Number(row.amount),
      month: row.month,
      status: row.status,
      createdBy: row.created_by,
      paymentMode: row.payment_mode,
      notes: row.notes,
      screenshotUrl: row.screenshot_url,
      createdAt: row.created_at,
    }))
  }

  /**
   * List requests history for a specific member.
   */
  async listMemberHistory(memberId: string) {
    const { data, error } = await this.admin
      .from("payment_requests")
      .select("*")
      .eq("member_id", memberId)
      .order("created_at", { ascending: false })

    if (error) throw error
    return data || []
  }

  /**
   * Review (Approve or Reject) a payment request.
   */
  async review(requestId: string, status: "approved" | "rejected") {
    requireRole(this.ctx, ["owner"])

    if (!["approved", "rejected"].includes(status)) {
      throw new BadRequestError("Invalid status. Must be approved or rejected.")
    }

    const { data, error } = await this.admin.rpc("review_trainer_payment_request", {
      p_request_id: requestId,
      p_status: status,
      p_owner_id: this.ctx.user.id
    })

    if (error) {
      throw new BadRequestError(error.message)
    }

    return data
  }
}
