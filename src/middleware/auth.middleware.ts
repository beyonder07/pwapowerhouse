import type { NextRequest } from "next/server"
import type { SupabaseClient } from "@supabase/supabase-js"
import { getAccessToken } from "@/src/services/auth.service"
import {
  createSupabaseAuthClient,
  createSupabaseServiceRoleClient,
  createSupabaseUserClient,
} from "@/src/services/supabase.service"
import { ForbiddenError, UnauthorizedError } from "@/src/utils/errors"

export type UserRole = "owner" | "trainer" | "client"

export interface AuthenticatedUser {
  id: string
  email: string | null
  full_name: string | null
  avatar_url: string | null
  role: UserRole
  branch_id: string | null
}

export interface AuthContext {
  accessToken: string
  authUserId: string
  role: UserRole
  user: AuthenticatedUser
  supabase: SupabaseClient
}

const VALID_ROLES = new Set<UserRole>(["owner", "trainer", "client"])

function roleFromAuthUser(user: {
  app_metadata?: Record<string, unknown>
  user_metadata?: Record<string, unknown>
}): UserRole {
  const role =
    typeof user.app_metadata?.role === "string"
      ? user.app_metadata.role
      : typeof user.user_metadata?.role === "string"
        ? user.user_metadata.role
        : "client"

  return VALID_ROLES.has(role as UserRole) ? (role as UserRole) : "client"
}

function metadataString(
  user: { user_metadata?: Record<string, unknown> },
  key: string
) {
  const value = user.user_metadata?.[key]
  return typeof value === "string" && value.trim() ? value.trim() : null
}

function metadataUuid(
  user: { user_metadata?: Record<string, unknown> },
  key: string
) {
  const value = metadataString(user, key)
  if (!value) return null

  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
    value
  )
    ? value
    : null
}

async function repairProfile(user: {
  id: string
  email?: string | null
  app_metadata?: Record<string, unknown>
  user_metadata?: Record<string, unknown>
}) {
  try {
    const serviceClient = createSupabaseServiceRoleClient()
    const legacyResult = await serviceClient
      .from("users")
      .upsert(
        {
          id: user.id,
          email: user.email ?? "",
          name:
            metadataString(user, "full_name") ??
            metadataString(user, "name") ??
            user.email?.split("@")[0] ??
            "PowerHouse User",
          phone: metadataString(user, "phone") ?? "0000000000",
          role: roleFromAuthUser(user),
        },
        { onConflict: "id" }
      )
      .select("*")
      .single()

    if (!legacyResult.error) {
      return legacyResult.data
    }

    const { data, error } = await serviceClient
      .from("users")
      .upsert(
        {
          id: user.id,
          email: user.email ?? "",
          full_name:
            metadataString(user, "full_name") ??
            metadataString(user, "name") ??
            user.email?.split("@")[0] ??
            "PowerHouse User",
          avatar_url:
            metadataString(user, "avatar_url") ??
            metadataString(user, "profile_photo_url"),
          phone: metadataString(user, "phone"),
          role: roleFromAuthUser(user),
          branch_id: metadataUuid(user, "branch_id"),
          is_active: true,
        },
        { onConflict: "id" }
      )
      .select("*")
      .single()

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

export async function authenticateRequest(req: NextRequest): Promise<AuthContext> {
  const accessToken = getAccessToken(req)

  if (!accessToken) {
    throw new UnauthorizedError("Missing session")
  }

  const authClient = createSupabaseAuthClient()
  const { data: authData, error: authError } =
    await authClient.auth.getUser(accessToken)

  if (authError || !authData.user) {
    throw new UnauthorizedError("Invalid or expired session")
  }

  const supabase = createSupabaseUserClient(accessToken)
  const { data: existingProfile, error: profileError } = await supabase
    .from("users")
    .select("*")
    .eq("id", authData.user.id)
    .maybeSingle()

  const profile = existingProfile ?? (await repairProfile(authData.user))

  if (profileError || !profile) {
    return {
      accessToken,
      authUserId: authData.user.id,
      role: roleFromAuthUser(authData.user),
      user: {
        id: authData.user.id,
        email: authData.user.email ?? null,
        full_name: metadataString(authData.user, "full_name"),
        avatar_url: metadataString(authData.user, "avatar_url"),
        role: roleFromAuthUser(authData.user),
        branch_id: metadataUuid(authData.user, "branch_id"),
      },
      supabase,
    }
  }

  if (profile.is_active === false) {
    throw new ForbiddenError("User account is disabled")
  }

  return {
    accessToken,
    authUserId: authData.user.id,
    role: profile.role as UserRole,
    user: {
      id: profile.id,
      email: profile.email,
      full_name: profile.full_name ?? profile.name ?? null,
      avatar_url: profile.avatar_url ?? profile.profile_photo_url ?? null,
      role: profile.role as UserRole,
      branch_id: profile.branch_id ?? null,
    },
    supabase,
  }
}
