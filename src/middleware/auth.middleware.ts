import type { NextRequest } from "next/server"
import type { SupabaseClient } from "@supabase/supabase-js"
import { getAccessToken } from "@/src/services/auth.service"
import {
  createSupabaseAuthClient,
  createSupabaseUserClient,
} from "@/src/services/supabase.service"
import { ForbiddenError, UnauthorizedError } from "@/src/utils/errors"

export type UserRole = "owner" | "trainer" | "client"

/**
 * Lean Authenticated User:
 * Unified camelCase naming for the application context.
 */
export interface AuthenticatedUser {
  id: string
  email: string | null
  fullName: string | null
  role: UserRole
  gymId: string | null
}

export interface AuthContext {
  accessToken: string
  authUserId: string
  role: UserRole
  user: AuthenticatedUser
  supabase: SupabaseClient
}

/**
 * Anti-Gravity Middleware:
 * Strictly fetches identity from the core 'users' table.
 * No repair logic, no intermediate table fallbacks.
 */
export async function authenticateRequest(req: NextRequest): Promise<AuthContext> {
  const accessToken = getAccessToken(req)

  if (!accessToken) {
    throw new UnauthorizedError("Missing session")
  }

  const authClient = createSupabaseAuthClient()
  const { data: authData, error: authError } = await authClient.auth.getUser(accessToken)

  if (authError || !authData.user) {
    throw new UnauthorizedError("Invalid or expired session")
  }

  const supabase = createSupabaseUserClient(accessToken)
  
  // Fetch the lean profile directly from the core users table
  const { data: profile, error: profileError } = await supabase
    .from("users")
    .select("id, email, name, role, gym_id")
    .eq("id", authData.user.id)
    .single()

  if (profileError || !profile) {
    throw new UnauthorizedError("User profile not found in PowerHouse system")
  }

  return {
    accessToken,
    authUserId: authData.user.id,
    role: profile.role as UserRole,
    user: {
      id: profile.id,
      email: profile.email,
      fullName: profile.name,
      role: profile.role as UserRole,
      gymId: profile.gym_id,
    },
    supabase,
  }
}
