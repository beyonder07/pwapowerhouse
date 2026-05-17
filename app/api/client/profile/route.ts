import { NextRequest } from "next/server"
import { authenticateRequest } from "@/src/middleware/auth.middleware"
import { ProfileService } from "@/src/modules/client/profile.service"
import { fail, ok } from "@/src/utils/response"
import { z } from "zod"

const UpdateProfileSchema = z.object({
  fullName: z.string().min(2).optional().nullable(),
  phone: z.string().optional().nullable(), // Removed regex for now to avoid save failures
  govtIdUrl: z.string().url().optional().nullable(),
  govtIdType: z.string().optional().nullable(),
  govtIdNumber: z.string().optional().nullable(),
  profilePicUrl: z.string().url().optional().nullable(),
  currentPassword: z.string().min(1, "Password is required"),
})

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

export async function GET(req: NextRequest) {
  try {
    const auth = await authenticateRequest(req)
    const data = await new ProfileService(auth).getFullProfile()
    return ok(data)
  } catch (error) {
    return fail(error)
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const auth = await authenticateRequest(req)
    const body = await req.json()
    
    // Use safeParse to provide better error messages for debugging
    const result = UpdateProfileSchema.safeParse(body)
    if (!result.success) {
      return fail(result.error)
    }
    
    const data = await new ProfileService(auth).updateProfile(result.data)
    return ok(data)
  } catch (error) {
    console.error("[PROFILE_PATCH_ERROR]", error)
    return fail(error)
  }
}
