import type { AuthContext } from "@/src/middleware/auth.middleware"
import type { RequestStatusUpdateInput } from "./admin-request.schema"
import { RequestProvisioningService } from "./request-provisioning.service"
import { createSupabaseServiceRoleClient } from "@/src/services/supabase.service"
import { BadRequestError, NotFoundError } from "@/src/utils/errors"
import { decrypt } from "@/src/utils/crypto"

interface RequestRow {
  id: string
  type: "client" | "trainer" | string
  data: {
    fullName?: string
    name?: string
    email?: string
    phone?: string
    branchId?: string
    branchName?: string
    govtIdUrl?: string
    govtIdType?: string
    govtIdNumber?: string
    specialization?: string
    experience?: string
    openToAnyBranch?: boolean
    encryptedPassword?: string
  }
  status: string
  created_at: string
}

export class AdminRequestService {
  private readonly admin = createSupabaseServiceRoleClient()

  async listPending(ctx: AuthContext) {
    const { data, error } = await this.admin
      .from("requests")
      .select("id,type,data,status,created_at")
      .eq("status", "pending")
      .in("type", ["client", "member", "trainer"])
      .order("created_at", { ascending: false })

    if (error) {
      const code = (error as any).code
      if (code === "42P01" || code === "PGRST200" || code === "PGRST205") {
        return { membershipRequests: [], trainerApplications: [] }
      }
      throw error
    }

    const requests = (data ?? []) as RequestRow[]
    const branchIds = [
      ...new Set(
        requests
          .map((r) => r.data.branchId)
          .filter((id): id is string => Boolean(id))
      ),
    ]

    const branchNames = new Map<string, string>()
    if (branchIds.length > 0) {
      const { data: gyms } = await this.admin
        .from("gyms")
        .select("id, name")
        .in("id", branchIds)
      for (const gym of gyms ?? []) {
        branchNames.set(gym.id, gym.name)
      }
    }

    const resolveBranch = (request: RequestRow) => {
      if (request.data.openToAnyBranch) return "Any branch"
      if (request.data.branchId && branchNames.has(request.data.branchId)) {
        return branchNames.get(request.data.branchId)!
      }
      return request.data.branchName ?? "Unassigned branch"
    }

    const getDecryptedPassword = (request: RequestRow) => {
      if (request.data.encryptedPassword) {
        try {
          return decrypt(request.data.encryptedPassword)
        } catch (e) {
          console.error("Failed to decrypt password for list pending requests:", e)
          return "[Decryption Failed]"
        }
      }
      return null
    }

    const memberships = requests.filter((request) =>
      ["client", "member"].includes(request.type)
    )
    const trainers = requests.filter((request) => request.type === "trainer")

    return {
      membershipRequests: memberships.map((request) => ({
        id: request.id,
        name: request.data.fullName ?? request.data.name ?? "Membership Request",
        email: request.data.email ?? "",
        phone: request.data.phone ?? "",
        branch: resolveBranch(request),
        status: request.status,
        createdAt: request.created_at,
        password: getDecryptedPassword(request),
      })),
      trainerApplications: trainers.map((request) => ({
        id: request.id,
        name: request.data.fullName ?? request.data.name ?? "Trainer Application",
        email: request.data.email ?? "",
        phone: request.data.phone ?? "",
        branch: resolveBranch(request),
        specialization: request.data.specialization ?? "",
        experience: request.data.experience ?? "",
        govtIdUrl: request.data.govtIdUrl ?? null,
        status: request.status,
        createdAt: request.created_at,
        password: getDecryptedPassword(request),
      })),
    }
  }

  async updateStatus(ctx: AuthContext, input: RequestStatusUpdateInput) {
    const { data: request, error: fetchError } = await this.admin
      .from("requests")
      .select("id, type, data, status")
      .eq("id", input.id)
      .maybeSingle()

    if (fetchError || !request) {
      throw new NotFoundError("Request not found")
    }

    if (request.status !== "pending") {
      throw new BadRequestError("This request has already been reviewed")
    }

    let provisioned: { tempPassword?: string; userId?: string } = {}

    if (input.status === "approved") {
      const result = await new RequestProvisioningService().provisionFromRequest(
        request.type,
        request.data as RequestRow["data"]
      )
      provisioned = { tempPassword: result.tempPassword, userId: result.userId }
    }

    const { error } = await this.admin
      .from("requests")
      .update({
        status: input.status,
        reviewed_by: ctx.authUserId,
        reviewed_at: new Date().toISOString(),
      })
      .eq("id", input.id)

    if (error) throw error

    return { updated: true, ...provisioned }
  }
}
