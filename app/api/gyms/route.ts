import { NextRequest, NextResponse } from "next/server"
import { authenticateRequest } from "@/src/middleware/auth.middleware"
import { GymService } from "@/src/modules/gym/gym.service"

export async function GET(req: NextRequest) {
  try {
    const ctx = await authenticateRequest(req)
    const service = new GymService(ctx)
    const gyms = await service.getAllGyms()
    return NextResponse.json({ success: true, data: gyms })
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message },
      { status: error.status || 500 }
    )
  }
}
