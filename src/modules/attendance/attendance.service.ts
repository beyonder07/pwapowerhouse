import type { AuthContext } from "@/src/middleware/auth.middleware"
import { requireRole } from "@/src/middleware/role.middleware"
import { ForbiddenError } from "@/src/utils/errors"
import { z } from "zod"

const CheckInSchema = z.object({
  latitude: z.number(),
  longitude: z.number()
})

export class AttendanceService {
  constructor(private readonly ctx: AuthContext) {}

  /**
   * Hardened Check-in/out:
   * Uses the database RPC 'mark_gym_attendance' which enforces
   * proximity, active membership, and daily session logic.
   */
  async checkIn(rawInput: unknown, _requestId?: string) {
    requireRole(this.ctx, ["client"])
    const input = CheckInSchema.parse(rawInput)

    const { data, error } = await this.ctx.supabase.rpc(
      "mark_gym_attendance",
      {
        lat: input.latitude,
        lon: input.longitude
      }
    )

    if (error) {
      throw this.normalizeCheckInError(error)
    }

    return data
  }

  /**
   * Monthly Attendance History:
   * Fetches all logs for a specific user and month.
   */
  async getHistory(year: number, month: number) {
    const userId = this.ctx.user.id
    const startDate = `${year}-${month.toString().padStart(2, "0")}-01`
    const endDate = new Date(year, month, 0).toISOString().split("T")[0]

    const { data, error } = await this.ctx.supabase
      .from("attendance")
      .select("date, status, check_in_time, check_out_time")
      .eq("user_id", userId)
      .gte("date", startDate)
      .lte("date", endDate)
      .order("date", { ascending: true })

    if (error) throw error
    return data || []
  }

  private normalizeCheckInError(error: any) {
    const message = error.message || "Attendance failed"
    
    // Convert SQL exceptions to human-readable errors
    if (message.includes("Too far from gym")) {
      return new ForbiddenError(message)
    }
    if (message.includes("Active membership required")) {
      return new ForbiddenError("Your membership is not active or has expired.")
    }
    if (message.includes("already completed")) {
      return new ForbiddenError("You have already checked out for today.")
    }
    if (message.includes("already marked")) {
      return new ForbiddenError("Attendance already marked for today.")
    }

    return error
  }
}
