import type { AuthContext } from "@/src/middleware/auth.middleware"
import { requireRole } from "@/src/middleware/role.middleware"
import { BadRequestError, UnauthorizedError } from "@/src/utils/errors"
import { createSupabaseAuthClient } from "@/src/services/supabase.service"

export interface UpdateProfileInput {
  fullName?: string | null
  phone?: string | null
  govtIdUrl?: string | null
  govtIdType?: string | null
  govtIdNumber?: string | null
  profilePicUrl?: string | null
  currentPassword?: string
}

export class ProfileService {
  constructor(private readonly ctx: AuthContext) {}

  async updateProfile(input: UpdateProfileInput) {
    requireRole(this.ctx, ["client", "trainer", "owner"])
    const userId = this.ctx.user.id
    const email = this.ctx.user.email

    if (!email) {
      throw new BadRequestError("User email not found")
    }

    // 1. Password Verification
    if (!input.currentPassword) {
      throw new BadRequestError("Current password is required to save changes")
    }

    const authClient = createSupabaseAuthClient()
    const { error: authError } = await authClient.auth.signInWithPassword({
      email,
      password: input.currentPassword,
    })

    if (authError) {
      throw new UnauthorizedError("Incorrect current password. Verification failed.")
    }

    // 2. Update Users Table
    if (input.fullName) {
      const { error: userError } = await this.ctx.supabase
        .from("users")
        .update({ name: input.fullName })
        .eq("id", userId)

      if (userError) {
        console.error("[PROFILE_UPDATE_USER_ERROR]", userError)
        throw new Error(`Failed to update name: ${userError.message}`)
      }
    }

    // 3. Update User Details Table
    const updateData: any = {}
    if (input.phone !== undefined) updateData.phone = input.phone
    if (input.govtIdUrl !== undefined) updateData.govt_id_url = input.govtIdUrl
    if (input.govtIdType !== undefined) updateData.govt_id_type = input.govtIdType
    if (input.govtIdNumber !== undefined) updateData.govt_id_number = input.govtIdNumber
    if (input.profilePicUrl !== undefined) updateData.profile_pic_url = input.profilePicUrl

    if (Object.keys(updateData).length > 0) {
      const { error: detailsError } = await this.ctx.supabase
        .from("user_details")
        .upsert({ 
          user_id: userId,
          ...updateData
        })

      if (detailsError) {
        console.error("[PROFILE_UPDATE_DETAILS_ERROR]", detailsError)
        throw new Error(`Database Error: ${detailsError.message} (Code: ${detailsError.code})`)
      }
    }

    return { success: true, message: "Profile updated successfully" }
  }

  async getFullProfile() {
    requireRole(this.ctx, ["client", "trainer", "owner"])
    const userId = this.ctx.user.id

    const [userRes, detailsRes] = await Promise.all([
      this.ctx.supabase.from("users").select("*").eq("id", userId).single(),
      this.ctx.supabase.from("user_details").select("*").eq("user_id", userId).maybeSingle()
    ])

    if (userRes.error) throw userRes.error

    return {
      user: userRes.data,
      details: detailsRes.data || null
    }
  }
}
