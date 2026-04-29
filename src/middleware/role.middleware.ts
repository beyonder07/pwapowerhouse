import type { AuthContext, UserRole } from "./auth.middleware"
import { ForbiddenError } from "@/src/utils/errors"

export function requireRole(ctx: AuthContext, roles: UserRole[]) {
  if (!roles.includes(ctx.role)) {
    throw new ForbiddenError("Insufficient role permissions")
  }
}
