import {
  createSupabaseAuthClient,
  createSupabaseServiceRoleClient,
  createSupabaseUserClient,
} from "@/src/services/supabase.service"
import { UnauthorizedError } from "@/src/utils/errors"

type UserRole = "owner" | "trainer" | "client"

interface AuthUserShape {
  id: string
  email?: string | null
  app_metadata?: Record<string, unknown>
  user_metadata?: Record<string, unknown>
}

interface ProfileRecord {
  id: string
  email: string | null
  full_name?: string | null
  name?: string | null
  avatar_url?: string | null
  profile_photo_url?: string | null
  phone?: string | null
  role: UserRole
  branch_id?: string | null
  is_active?: boolean | null
}

const VALID_ROLES = new Set<UserRole>(["owner", "trainer", "client"])

function roleFromAuthUser(user: AuthUserShape): UserRole {
  const role =
    typeof user.app_metadata?.role === "string"
      ? user.app_metadata.role
      : typeof user.user_metadata?.role === "string"
        ? user.user_metadata.role
        : "client"

  return VALID_ROLES.has(role as UserRole) ? (role as UserRole) : "client"
}

function metadataString(user: AuthUserShape, key: string) {
  const value = user.user_metadata?.[key]
  return typeof value === "string" && value.trim() ? value.trim() : null
}

function metadataUuid(user: AuthUserShape, key: string) {
  const value = metadataString(user, key)
  if (!value) return null

  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
    value
  )
    ? value
    : null
}

export class AuthModuleService {
  async login(email: string, password: string) {
    const authClient = createSupabaseAuthClient()
    const { data, error } = await authClient.auth.signInWithPassword({
      email,
      password,
    })

    if (error || !data.session || !data.user) {
      throw new UnauthorizedError("Invalid email or password")
    }

    const profile = await this.getOrRepairProfile(
      data.session.access_token,
      data.user
    )

    if (profile.is_active === false) {
      throw new UnauthorizedError("User is not allowed to sign in")
    }

    return {
      session: data.session,
      user: {
        id: profile.id,
        email: profile.email,
        fullName: profile.full_name ?? profile.name ?? null,
        avatarUrl: profile.avatar_url ?? profile.profile_photo_url ?? null,
        role: profile.role,
        branchId: profile.branch_id ?? null,
      },
    }
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

  private async getOrRepairProfile(accessToken: string, authUser: AuthUserShape) {
    const userClient = createSupabaseUserClient(accessToken)
    const { data: profile } = await userClient
      .from("users")
      .select("*")
      .eq("id", authUser.id)
      .maybeSingle<ProfileRecord>()

    if (profile) {
      return profile
    }

    const repaired = await this.repairProfile(authUser)
    if (repaired) {
      return repaired
    }

    return {
      id: authUser.id,
      email: authUser.email ?? null,
      full_name:
        metadataString(authUser, "full_name") ?? metadataString(authUser, "name"),
      avatar_url:
        metadataString(authUser, "avatar_url") ??
        metadataString(authUser, "profile_photo_url"),
      role: roleFromAuthUser(authUser),
      branch_id: metadataUuid(authUser, "branch_id"),
      is_active: true,
    }
  }

  private async repairProfile(authUser: AuthUserShape) {
    try {
      const serviceClient = createSupabaseServiceRoleClient()
      const legacyProfile = {
        id: authUser.id,
        email: authUser.email ?? "",
        name:
          metadataString(authUser, "full_name") ??
          metadataString(authUser, "name") ??
          authUser.email?.split("@")[0] ??
          "PowerHouse User",
        phone: metadataString(authUser, "phone") ?? "0000000000",
        role: roleFromAuthUser(authUser),
      }

      const legacyResult = await serviceClient
        .from("users")
        .upsert(legacyProfile, { onConflict: "id" })
        .select("*")
        .single<ProfileRecord>()

      if (!legacyResult.error) {
        return legacyResult.data
      }

      const modernProfile = {
        id: authUser.id,
        email: authUser.email ?? "",
        full_name:
          metadataString(authUser, "full_name") ??
          metadataString(authUser, "name") ??
          authUser.email?.split("@")[0] ??
          "PowerHouse User",
        avatar_url:
          metadataString(authUser, "avatar_url") ??
          metadataString(authUser, "profile_photo_url"),
        phone: metadataString(authUser, "phone"),
        role: roleFromAuthUser(authUser),
        branch_id: metadataUuid(authUser, "branch_id"),
        is_active: true,
      }

      const { data, error } = await serviceClient
        .from("users")
        .upsert(modernProfile, { onConflict: "id" })
        .select("*")
        .single<ProfileRecord>()

      if (error) {
        console.warn(
          "Could not repair Supabase user profile:",
          legacyResult.error.message,
          error.message
        )
        return null
      }

      return data
    } catch (error) {
      console.warn(
        "Could not repair Supabase user profile:",
        error instanceof Error ? error.message : error
      )
      return null
    }
  }
}
