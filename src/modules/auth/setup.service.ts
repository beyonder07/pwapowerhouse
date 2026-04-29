import { createSupabaseServiceRoleClient } from "@/src/services/supabase.service"
import { ConflictError, ForbiddenError } from "@/src/utils/errors"
import type { OwnerSetupInput } from "./setup.schema"

export class OwnerSetupService {
  async createOwner(input: OwnerSetupInput) {
    const setupKey = process.env.OWNER_SETUP_KEY
    if (!setupKey || input.setupKey !== setupKey) {
      throw new ForbiddenError("Invalid setup key")
    }

    const supabase = createSupabaseServiceRoleClient()
    const { count, error: countError } = await supabase
      .from("users")
      .select("id", { count: "exact", head: true })
      .eq("role", "owner")

    if (countError) {
      throw countError
    }

    if ((count ?? 0) > 0) {
      throw new ConflictError("Owner account already exists")
    }

    const { data: authData, error: createError } =
      await supabase.auth.admin.createUser({
        email: input.email,
        password: input.password,
        email_confirm: true,
        app_metadata: {
          role: "owner",
        },
        user_metadata: {
          full_name: input.fullName,
          phone: input.phone,
          role: "owner",
        },
      })

    if (createError || !authData.user) {
      throw createError ?? new Error("Unable to create owner account")
    }

    const { error: profileError } = await supabase.from("users").upsert({
      id: authData.user.id,
      email: input.email,
      full_name: input.fullName,
      phone: input.phone,
      role: "owner",
      is_active: true,
    })

    if (profileError) {
      throw profileError
    }

    return {
      id: authData.user.id,
      email: input.email,
      fullName: input.fullName,
      role: "owner" as const,
    }
  }
}
