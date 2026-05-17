import { NextRequest } from "next/server"
import { authenticateRequest } from "@/src/middleware/auth.middleware"
import { requireRole } from "@/src/middleware/role.middleware"
import { createSupabaseServiceRoleClient } from "@/src/services/supabase.service"
import { fail, ok } from "@/src/utils/response"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

const admin = createSupabaseServiceRoleClient()

const TRAINER_DATA_BUCKET = "trainer-data"
const WORKOUT_PLANS_PATH = "workout-plans/plans.json"

export async function GET(req: NextRequest) {
  try {
    const auth = await authenticateRequest(req)
    requireRole(auth, ["client"])

    const userId = auth.user.id

    // Load the global workout plans file from trainer-data bucket
    const { data: storageData, error: storageError } = await admin.storage
      .from(TRAINER_DATA_BUCKET)
      .download(WORKOUT_PLANS_PATH)

    if (storageError) {
      // File may not exist yet — no plans
      return ok({ plan: null })
    }

    const text = await storageData.text()
    const plans = JSON.parse(text) as Array<{
      id: string
      memberId: string
      trainerId: string | null
      title: string
      notes: string
      status: string
      split: unknown[]
      createdAt: string
      updatedAt: string
    }>

    // Find the most recent active plan for this client
    const myPlan = plans
      .filter((p) => p.memberId === userId && p.status !== "archived")
      .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())[0]

    if (!myPlan) {
      return ok({ plan: null })
    }

    // Fetch trainer name if available
    let trainerName: string | null = null
    if (myPlan.trainerId) {
      const { data: trainerData } = await admin
        .from("users")
        .select("name")
        .eq("id", myPlan.trainerId)
        .maybeSingle()
      trainerName = trainerData?.name ?? null
    }

    return ok({
      plan: {
        id: myPlan.id,
        title: myPlan.title,
        notes: myPlan.notes,
        status: myPlan.status,
        split: myPlan.split,
        dayCount: Array.isArray(myPlan.split) ? myPlan.split.length : 0,
        exerciseCount: Array.isArray(myPlan.split)
          ? myPlan.split.reduce((sum: number, day: any) => {
              return sum + (Array.isArray(day?.exercises) ? day.exercises.length : 0)
            }, 0)
          : 0,
        trainerName,
        updatedAt: myPlan.updatedAt,
        createdAt: myPlan.createdAt,
      },
    })
  } catch (error) {
    return fail(error)
  }
}
