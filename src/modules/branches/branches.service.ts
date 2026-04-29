import { createSupabaseAuthClient } from "@/src/services/supabase.service"

export interface BranchSummary {
  id: string
  name: string
}

export class BranchesService {
  async listActive(): Promise<BranchSummary[]> {
    const supabase = createSupabaseAuthClient()
    const { data, error } = await supabase
      .from("gym_branches")
      .select("id,name")
      .eq("is_active", true)
      .order("name")

    if (error) {
      throw error
    }

    return data ?? []
  }
}
