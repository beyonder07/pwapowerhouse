import { NextRequest, NextResponse } from "next/server"
import { authenticateRequest } from "@/src/middleware/auth.middleware"
import { GymService } from "@/src/modules/gym/gym.service"
import { z } from "zod"

const AssignGymSchema = z.object({
  gymId: z.string().uuid(),
})

export async function POST(req: NextRequest) {
  try {
    const ctx = await authenticateRequest(req)
    const body = await req.json()
    const { gymId } = AssignGymSchema.parse(body)

    const service = new GymService(ctx)
    await service.assignGym(gymId)
    
    return NextResponse.json({ success: true, message: "Gym assigned successfully" })
  } catch (error: any) {
    console.error("[GYM_ASSIGN]", error)
    return NextResponse.json(
      { success: false, error: error.message || "Failed to assign gym" },
      { status: error.status || 500 }
    )
  }
}
