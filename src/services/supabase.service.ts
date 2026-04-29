import { createClient, type SupabaseClient } from "@supabase/supabase-js"
import { ConfigurationError } from "@/src/utils/errors"

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabasePublishableKey =
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ??
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

function normalizeSupabaseUrl(url: string) {
  return url.replace(/\/rest\/v1\/?$/, "").replace(/\/$/, "")
}

function requireSupabaseEnv() {
  if (!supabaseUrl) {
    throw new ConfigurationError("NEXT_PUBLIC_SUPABASE_URL is required")
  }

  if (!supabasePublishableKey) {
    throw new ConfigurationError("NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY is required")
  }
}

export function createSupabaseAuthClient(): SupabaseClient {
  requireSupabaseEnv()

  return createClient(normalizeSupabaseUrl(supabaseUrl!), supabasePublishableKey!, {
    auth: {
      autoRefreshToken: false,
      detectSessionInUrl: false,
      persistSession: false,
    },
  })
}

export function createSupabaseUserClient(accessToken: string): SupabaseClient {
  requireSupabaseEnv()

  return createClient(normalizeSupabaseUrl(supabaseUrl!), supabasePublishableKey!, {
    auth: {
      autoRefreshToken: false,
      detectSessionInUrl: false,
      persistSession: false,
    },
    global: {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    },
  })
}

export function createSupabaseServiceRoleClient(): SupabaseClient {
  requireSupabaseEnv()

  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!serviceRoleKey) {
    throw new ConfigurationError("SUPABASE_SERVICE_ROLE_KEY is required")
  }

  return createClient(normalizeSupabaseUrl(supabaseUrl!), serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      detectSessionInUrl: false,
      persistSession: false,
    },
  })
}
