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

    // Debug log members to a file in workspace
    try {
      const fs = require("fs")
      fs.writeFileSync("d:\\web development\\pwapowerhouse\\workouts_debug.json", JSON.stringify({
        trainer: { id: auth.authUserId, role: auth.role, gymId: auth.user.gymId },
        members: data.members,
        plans: data.plans
      }, null, 2))
    } catch (e) {
      // ignore
    }

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
