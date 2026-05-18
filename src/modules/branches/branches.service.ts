import { createSupabaseServiceRoleClient } from "@/src/services/supabase.service"

export interface BranchSummary {
  id: string
  name: string
  radius: number
}

export class BranchesService {
  async listActive(): Promise<BranchSummary[]> {
    const supabase = createSupabaseServiceRoleClient()
    const { data, error } = await supabase
      .from("gyms")
      .select("id,name,radius")
      .order("name")

    if (!error) {
      return data ?? []
    }

    const legacy = await supabase
      .from("gym_branches")
      .select("id,name,radius_meters")
      .eq("is_active", true)
      .order("name")

    if (legacy.error) {
      throw error
    }

    return (legacy.data ?? []).map((branch) => ({
      id: branch.id,
      name: branch.name,
      radius: branch.radius_meters,
    }))
  }
}
