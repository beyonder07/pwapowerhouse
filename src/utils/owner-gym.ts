import type { AuthContext } from "@/src/middleware/auth.middleware"

/** Returns owner gym id when set; callers may skip filter when null (single-gym installs). */
export function getOwnerGymId(ctx: AuthContext): string | null {
  return ctx.user.gymId ?? null
}

export function applyGymFilter<T extends { eq: (col: string, val: string) => T }>(
  query: T,
  ctx: AuthContext,
  column = "gym_id"
): T {
  const gymId = getOwnerGymId(ctx)
  if (gymId) {
    return query.eq(column, gymId)
  }
  return query
}
