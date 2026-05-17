import { NextRequest, NextResponse } from "next/server"
import { authenticateRequest } from "@/src/middleware/auth.middleware"
import { AuthModuleService } from "@/src/modules/auth/auth.service"
import { z } from "zod"

const RequestOtpSchema = z.object({
  oldPassword: z.string().min(1),
})

export async function POST(req: NextRequest) {
  try {
    const ctx = await authenticateRequest(req)
    const body = await req.json()
    const { oldPassword } = RequestOtpSchema.parse(body)
    
    const service = new AuthModuleService()
    
    await service.requestPasswordChangeOtp(
      ctx.user.id,
      ctx.user.email!,
      ctx.user.role,
      oldPassword
    )

    return NextResponse.json({
      success: true,
      message: "OTP sent to your email",
    })
  } catch (error: any) {
    console.error("[AUTH_REQUEST_OTP]", error)
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { success: false, error: "Old password is required" },
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
