import type { AuthContext } from "@/src/middleware/auth.middleware"
import { requireRole } from "@/src/middleware/role.middleware"
import { calculateDistance } from "@/src/services/geo.service"
import {
  BadRequestError,
  ConflictError,
  ForbiddenError,
} from "@/src/utils/errors"
import { AttendanceCheckInSchema } from "./attendance.schema"

const MAX_RADIUS_METERS = 150
const MAX_TIMESTAMP_SKEW_MS = 2 * 60 * 1000

interface MemberRecord {
  id: number
  user_id: string
  branch_id?: string | null
  status: string
}

interface GymBranchRecord {
  id: string
  name: string
  latitude: number
  longitude: number
  radius_meters: number
  is_active: boolean
}

export class AttendanceService {
  constructor(private readonly ctx: AuthContext) {}

  async checkIn(rawInput: unknown, requestId: string) {
    requireRole(this.ctx, ["client"])

    const input = AttendanceCheckInSchema.parse(rawInput)

    if (input.clientTimestamp) {
      const skew = Math.abs(Date.now() - new Date(input.clientTimestamp).getTime())
      if (skew > MAX_TIMESTAMP_SKEW_MS) {
        throw new BadRequestError("Stale attendance request")
      }
    }

    const member = await this.getActiveMember()
    const branch = await this.getActiveBranch(member.branch_id ?? null)
    const distance = calculateDistance(
      input.latitude,
      input.longitude,
      branch.latitude,
      branch.longitude
    )
    const allowedRadius = Math.min(branch.radius_meters, MAX_RADIUS_METERS)

    if (distance > allowedRadius) {
      throw new ForbiddenError("User not within gym radius")
    }

    const { data, error } = await this.ctx.supabase.rpc("check_in_attendance", {
      p_branch_id: branch.id,
      p_latitude: input.latitude,
      p_longitude: input.longitude,
      p_request_id: requestId,
    })

    if (error) {
      if (error.message.includes("already marked")) {
        throw new ConflictError("Attendance already marked for today")
      }

      if (error.message.includes("gym radius")) {
        throw new ForbiddenError("User not within gym radius")
      }

      throw error
    }

    return data
  }

  private async getActiveMember() {
    const { data, error } = await this.ctx.supabase
      .from("members")
      .select("*")
      .eq("user_id", this.ctx.authUserId)
      .eq("status", "active")
      .single<MemberRecord>()

    if (error || !data) {
      throw new ForbiddenError("Active member profile required")
    }

    return data
  }

  private async getActiveBranch(branchId: string | null) {
    let query = this.ctx.supabase
      .from("gym_branches")
      .select("id,name,latitude,longitude,radius_meters,is_active")
      .eq("is_active", true)

    if (branchId) {
      query = query.eq("id", branchId)
    }

    const { data, error } = await query
      .order("created_at", { ascending: true })
      .limit(1)
      .maybeSingle<GymBranchRecord>()

    if (error || !data) {
      throw new BadRequestError("Gym branch not configured")
    }

    return data
  }
}
