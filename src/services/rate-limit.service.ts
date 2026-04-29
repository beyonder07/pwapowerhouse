import { createSupabaseAuthClient } from "@/src/services/supabase.service"
import { TooManyRequestsError } from "@/src/utils/errors"

function isMissingRateLimitMigration(error: { code?: string; message?: string }) {
  return (
    error.code === "PGRST202" ||
    error.message?.includes("consume_rate_limit") ||
    error.message?.includes("rate_limit_buckets")
  )
}

export async function rateLimitOrThrow({
  key,
  limit,
  windowSeconds,
}: {
  key: string
  limit: number
  windowSeconds: number
}) {
  const supabase = createSupabaseAuthClient()
  const { data: allowed, error } = await supabase.rpc("consume_rate_limit", {
    p_key: key,
    p_limit: limit,
    p_window_seconds: windowSeconds,
  })

  if (error) {
    if (isMissingRateLimitMigration(error)) {
      console.warn(
        "Rate limiting skipped because the Supabase migration for consume_rate_limit is not applied."
      )
      return
    }

    throw error
  }

  if (!allowed) {
    throw new TooManyRequestsError("Rate limit exceeded")
  }
}
