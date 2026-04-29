import type { AuthContext } from "@/src/middleware/auth.middleware"
import type { RequestStatusUpdateInput } from "./admin-request.schema"

interface RequestRow {
  id: string
  type: "client" | "trainer" | string
  data: {
    fullName?: string
    name?: string
    email?: string
    phone?: string
    branchName?: string
    specialization?: string
    experience?: string
    openToAnyBranch?: boolean
  }
  status: string
  created_at: string
}

export class AdminRequestService {
  async listPending(ctx: AuthContext) {
    const { data, error } = await ctx.supabase
      .from("requests")
      .select("id,type,data,status,created_at")
      .eq("status", "pending")
      .in("type", ["client", "member", "trainer"])
      .order("created_at", { ascending: false })

    if (error) throw error

    const requests = (data ?? []) as RequestRow[]
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
        branch: request.data.branchName ?? "PowerHouse Gym",
        status: request.status,
        createdAt: request.created_at,
      })),
      trainerApplications: trainers.map((request) => ({
        id: request.id,
        name: request.data.fullName ?? request.data.name ?? "Trainer Application",
        email: request.data.email ?? "",
        phone: request.data.phone ?? "",
        branch: request.data.openToAnyBranch
          ? "Any branch"
          : request.data.branchName ?? "PowerHouse Gym",
        specialization: request.data.specialization ?? "",
        experience: request.data.experience ?? "",
        status: request.status,
        createdAt: request.created_at,
      })),
    }
  }

  async updateStatus(ctx: AuthContext, input: RequestStatusUpdateInput) {
    const { error } = await ctx.supabase
      .from("requests")
      .update({
        status: input.status,
        reviewed_by: ctx.authUserId,
        reviewed_at: new Date().toISOString(),
      })
      .eq("id", input.id)

    if (error) {
      throw error
    }

    return { updated: true }
  }
}
