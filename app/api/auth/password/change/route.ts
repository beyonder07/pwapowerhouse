import { NextRequest, NextResponse } from "next/server"
import { authenticateRequest } from "@/src/middleware/auth.middleware"
import { AuthModuleService } from "@/src/modules/auth/auth.service"
import { z } from "zod"

const ChangePasswordSchema = z.object({
  otp: z.string().length(6),
  newPassword: z.string().min(8),
})

export async function POST(req: NextRequest) {
  try {
    const ctx = await authenticateRequest(req)
    const body = await req.json()
    const { otp, newPassword } = ChangePasswordSchema.parse(body)
    
    const service = new AuthModuleService()
    await service.confirmPasswordChange(ctx.user.id, otp, newPassword)

    return NextResponse.json({
      success: true,
      message: "Password updated successfully",
    })
  } catch (error: any) {
    console.error("[AUTH_CHANGE_PASSWORD]", error)
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { success: false, error: "Invalid input data" },
        { status: 400 }
      )
    }
    return NextResponse.json(
      { 
        success: false, 
        error: error.message || "Internal server error" 
      },
      { status: error.status || 500 }
    )
  }
}
