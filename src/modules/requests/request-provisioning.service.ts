import { createSupabaseServiceRoleClient } from "@/src/services/supabase.service"
import { BadRequestError, ConflictError } from "@/src/utils/errors"
import { randomBytes } from "crypto"

interface RequestData {
  fullName?: string
  name?: string
  email?: string
  phone?: string
  branchId?: string
  govtIdUrl?: string | null
  govtIdType?: string | null
  govtIdNumber?: string | null
  specialization?: string | null
  experience?: string | null
  openToAnyBranch?: boolean
  durationDays?: number
}

function generateTempPassword() {
  return randomBytes(12).toString("base64url").slice(0, 16)
}

export class RequestProvisioningService {
  private readonly admin = createSupabaseServiceRoleClient()

  async provisionFromRequest(
    requestType: string,
    data: RequestData
  ): Promise<{ userId: string; tempPassword: string }> {
    const email = data.email?.trim().toLowerCase()
    const fullName = data.fullName ?? data.name

    if (!email || !fullName) {
      throw new BadRequestError("Request is missing email or full name")
    }

    const role = ["client", "member"].includes(requestType) ? "client" : "trainer"
    const gymId = data.branchId ?? (await this.defaultGymId())
    const tempPassword = generateTempPassword()

    const { data: existing } = await this.admin
      .from("users")
      .select("id")
      .eq("email", email)
      .maybeSingle()

    if (existing) {
      throw new ConflictError("A user with this email already exists")
    }

    const { data: authData, error: createError } = await this.admin.auth.admin.createUser({
      email,
      password: tempPassword,
      email_confirm: true,
      app_metadata: { role },
      user_metadata: {
        full_name: fullName,
        phone: data.phone,
        role,
      },
    })

    if (createError || !authData.user) {
      throw createError ?? new Error("Unable to create auth user")
    }

    const userId = authData.user.id

    const { error: userError } = await this.admin.from("users").upsert({
      id: userId,
      email,
      name: fullName,
      phone: data.phone ?? null,
      role,
      gym_id: gymId,
    })

    if (userError) throw userError

    const detailsPayload: Record<string, string | null> = {
      user_id: userId,
      phone: data.phone ?? null,
      govt_id_url: data.govtIdUrl ?? null,
      govt_id_type: data.govtIdType ?? null,
      govt_id_number: data.govtIdNumber ?? null,
    }

    const { error: detailsError } = await this.admin
      .from("user_details")
      .upsert(detailsPayload)

    if (detailsError) throw detailsError

    if (role === "client" && gymId) {
      const durationDays = Number(data.durationDays ?? 30)
      const start = new Date()
      const end = new Date()
      end.setDate(end.getDate() + durationDays)

      await this.admin.from("memberships").upsert({
        user_id: userId,
        gym_id: gymId,
        start_date: start.toISOString().split("T")[0],
        end_date: end.toISOString().split("T")[0],
        status: "active",
      })
    }

    return { userId, tempPassword }
  }

  private async defaultGymId() {
    const { data } = await this.admin.from("gyms").select("id").order("name").limit(1).maybeSingle()
    return data?.id ?? null
  }
}
