import { NextRequest, NextResponse } from "next/server"
import { authenticateRequest } from "@/src/middleware/auth.middleware"
import { AttendanceService } from "@/src/modules/attendance/attendance.service"

export async function GET(req: NextRequest) {
  try {
    const ctx = await authenticateRequest(req)
    const { searchParams } = new URL(req.url)
    
    const now = new Date()
    const year = parseInt(searchParams.get("year") ?? now.getFullYear().toString())
    const month = parseInt(searchParams.get("month") ?? (now.getMonth() + 1).toString())

    const service = new AttendanceService(ctx)
    const history = await service.getHistory(year, month)

    return NextResponse.json({
      success: true,
      data: history,
    })
  } catch (error: any) {
    console.error("[ATTENDANCE_HISTORY_GET]", error)
    return NextResponse.json(
      { 
        success: false, 
        error: error.message || "Internal server error" 
      },
      { status: error.status || 500 }
    )
  }
}
