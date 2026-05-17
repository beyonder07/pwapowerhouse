import { NextRequest, NextResponse } from "next/server"
import { authenticateRequest } from "@/src/middleware/auth.middleware"
import { GymService } from "@/src/modules/gym/gym.service"

export async function GET(req: NextRequest) {
  try {
    const ctx = await authenticateRequest(req)
    const { searchParams } = new URL(req.url)
    const lat = parseFloat(searchParams.get("lat") || "")
    const lon = parseFloat(searchParams.get("lon") || "")

    if (isNaN(lat) || isNaN(lon)) {
      return NextResponse.json(
        { success: false, error: "Invalid coordinates" },
        { status: 400 }
      )
    }

    const service = new GymService(ctx)
    const nearby = await service.findNearbyGyms(lat, lon)
    
    return NextResponse.json({ success: true, data: nearby })
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message },
      { status: error.status || 500 }
    )
  }
}
