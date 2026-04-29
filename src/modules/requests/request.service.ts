import { createSupabaseAuthClient } from "@/src/services/supabase.service"
import type {
  MembershipRequestInput,
  TrainerApplicationInput,
} from "./request.schema"

export class RequestService {
  async createMembershipRequest(input: MembershipRequestInput) {
    const supabase = createSupabaseAuthClient()
    const { error } = await supabase.from("requests").insert({
      type: "client",
      data: {
        fullName: input.fullName,
        email: input.email,
        phone: input.phone,
        branchId: input.branchId,
      },
      status: "pending",
    })

    if (error) {
      throw error
    }

    return { submitted: true }
  }

  async createTrainerApplication(input: TrainerApplicationInput) {
    const supabase = createSupabaseAuthClient()
    const { error } = await supabase.from("requests").insert({
      type: "trainer",
      data: {
        fullName: input.fullName,
        email: input.email,
        phone: input.phone,
        branchId: input.branchId,
        openToAnyBranch: input.openToAnyBranch,
        specialization: input.specialization,
        experience: input.experience,
        about: input.about ?? null,
      },
      status: "pending",
    })

    if (error) {
      throw error
    }

    return { submitted: true }
  }
}
