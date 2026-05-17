import { NextRequest } from "next/server"
import { authenticateRequest } from "@/src/middleware/auth.middleware"
import { WorkoutPlanUpsertSchema } from "@/src/modules/trainer/trainer.schema"
import { TrainerPanelService } from "@/src/modules/trainer/trainer.service"
import { fail, ok } from "@/src/utils/response"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

export async function GET(req: NextRequest) {
  try {
    const auth = await authenticateRequest(req)
    const data = await new TrainerPanelService(auth).getWorkouts()

    return ok(data)
  } catch (error) {
    return fail(error)
  }
}

export async function POST(req: NextRequest) {
  try {
    const auth = await authenticateRequest(req)
    const input = WorkoutPlanUpsertSchema.parse(await req.json())
    const data = await new TrainerPanelService(auth).saveWorkoutPlan(input)

    return ok(data, 201)
  } catch (error) {
    return fail(error)
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const auth = await authenticateRequest(req)
    const input = WorkoutPlanUpsertSchema.parse(await req.json())
    const data = await new TrainerPanelService(auth).saveWorkoutPlan(input)

    return ok(data)
  } catch (error) {
    return fail(error)
  }
}
