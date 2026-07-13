import {
  createSupabaseAuthClient,
  createSupabaseServiceRoleClient,
  createSupabaseUserClient,
} from "@/src/services/supabase.service"
import { UnauthorizedError } from "@/src/utils/errors"

type UserRole = "owner" | "trainer" | "client"

interface ProfileRecord {
  id: string
  email: string | null
  name: string
  role: UserRole
  gym_id?: string | null
}

const VALID_ROLES = new Set<UserRole>(["owner", "trainer", "client"])

export class AuthModuleService {
  /**
   * Lean Login: Authenticates and returns profile from the core users table.
   */
  async login(email: string, password: string) {
    const authClient = createSupabaseAuthClient()
    const { data, error } = await authClient.auth.signInWithPassword({
      email,
      password,
    })

    if (error || !data.session || !data.user) {
      throw new UnauthorizedError("Invalid email or password")
    }

    const profile = await this.getProfile(data.session.access_token, data.user.id)

    return {
      session: data.session,
      user: {
        id: profile.id,
        email: profile.email,
        fullName: profile.name,
        role: profile.role,
        gymId: profile.gym_id,
      },
    }
  }

  /**
   * Simple Profile Fetch: No repairs, no extra tables.
   */
  private async getProfile(accessToken: string, userId: string): Promise<ProfileRecord> {
    const userClient = createSupabaseUserClient(accessToken)
    const { data: profile, error } = await userClient
      .from("users")
      .select("id, email, name, role, gym_id")
      .eq("id", userId)
      .single()

    if (error || !profile) {
      throw new UnauthorizedError("User profile not found")
    }

    return profile as ProfileRecord
  }

  async refresh(refreshToken: string) {
    const authClient = createSupabaseAuthClient()
    const { data, error } = await authClient.auth.refreshSession({
      refresh_token: refreshToken,
    })

    if (error || !data.session) {
      throw new UnauthorizedError("Invalid refresh token")
    }

    return data.session
  }

  async requestPasswordChangeOtp(userId: string, email: string, role: string, oldPassword?: string) {
    if (oldPassword) {
      const authClient = createSupabaseAuthClient()
      const { error: loginError } = await authClient.auth.signInWithPassword({
        email,
        password: oldPassword,
      })
      if (loginError) {
        throw new UnauthorizedError("Incorrect old password")
      }
    }

    const serviceClient = createSupabaseServiceRoleClient()
    const otpCode = Math.floor(100000 + Math.random() * 900000).toString()
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000).toISOString()

    const { error } = await serviceClient.from("password_reset_requests").insert({
      user_id: userId,
      role,
      destination: email,
      otp_code: otpCode,
      expires_at: expiresAt,
    })

    if (error) throw error
    return { success: true }
  }

  async confirmPasswordChange(userId: string, otp: string, newPassword: string) {
    const serviceClient = createSupabaseServiceRoleClient()

    const { data: request, error: fetchError } = await serviceClient
      .from("password_reset_requests")
      .select("*")
      .eq("user_id", userId)
      .eq("otp_code", otp)
      .is("verified_at", null)
      .gt("expires_at", new Date().toISOString())
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle()

    if (fetchError || !request) {
      throw new UnauthorizedError("Invalid or expired OTP")
    }

    const { error: updateError } = await serviceClient.auth.admin.updateUserById(
      userId,
      { password: newPassword }
    )

    if (updateError) throw updateError

    await serviceClient
      .from("password_reset_requests")
      .update({ verified_at: new Date().toISOString() })
      .eq("id", request.id)

    return { success: true }
  }
}
