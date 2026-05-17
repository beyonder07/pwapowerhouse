import { NextRequest } from "next/server"
import { authenticateRequest } from "@/src/middleware/auth.middleware"
import { requireRole } from "@/src/middleware/role.middleware"
import { createSupabaseServiceRoleClient } from "@/src/services/supabase.service"
import { fail, ok } from "@/src/utils/response"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

const admin = createSupabaseServiceRoleClient()

export async function GET(req: NextRequest) {
  try {
    const auth = await authenticateRequest(req)
    requireRole(auth, ["client"])

    const gymId = auth.user.gymId
    if (!gymId) {
      return ok({ trainers: [] })
    }

    // Fetch trainers assigned to the same gym branch
    const { data: trainers, error } = await admin
      .from("users")
      .select("id, name, email, gym_id, created_at")
      .eq("role", "trainer")
      .eq("gym_id", gymId)
      .order("name")

    if (error) throw error

    const trainerIds = (trainers ?? []).map((t) => t.id)

    // Load details (specialization, experience, avatar)
    const detailsRes =
      trainerIds.length > 0
        ? await admin
            .from("user_details")
            .select("user_id, specialization, experience, profile_pic_url, profile_photo_url")
            .in("user_id", trainerIds)
        : { data: [] }

    const detailsByTrainer = new Map<string, any>()
    for (const d of (detailsRes.data ?? [])) {
      detailsByTrainer.set(d.user_id, d)
    }

    // Check which trainers checked in today (present status)
    const today = new Date().toISOString().split("T")[0]!
    const attendanceRes =
      trainerIds.length > 0
        ? await admin
            .from("attendance")
            .select("user_id")
            .in("user_id", trainerIds)
            .eq("date", today)
        : { data: [] }

    const checkedInToday = new Set<string>(
      (attendanceRes.data ?? []).map((a: any) => a.user_id)
    )

    const result = (trainers ?? []).map((trainer) => {
      const details = detailsByTrainer.get(trainer.id)
      return {
        id: trainer.id,
        name: trainer.name ?? "Trainer",
        email: trainer.email ?? null,
        avatarUrl: details?.profile_pic_url ?? details?.profile_photo_url ?? null,
        specialization: details?.specialization ?? null,
        experience: details?.experience ?? null,
        presentToday: checkedInToday.has(trainer.id),
        joinDate: trainer.created_at,
      }
    })

    return ok({ trainers: result })
  } catch (error) {
    return fail(error)
  }
}
