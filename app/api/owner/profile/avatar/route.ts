import { NextRequest } from "next/server"
import { authenticateRequest } from "@/src/middleware/auth.middleware"
import { requireRole } from "@/src/middleware/role.middleware"
import {
  parseImageFile,
  saveUserDetailField,
  uploadProfileImage,
} from "@/lib/profile-upload"
import { fail, ok } from "@/src/utils/response"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

export async function POST(req: NextRequest) {
  try {
    const auth = await authenticateRequest(req)
    requireRole(auth, ["owner"])

    const formData = await req.formData()
    const file = parseImageFile(formData.get("file"))
    const publicUrl = await uploadProfileImage(
      auth,
      file,
      `owners/${auth.authUserId}/avatar-${Date.now()}`
    )
    await saveUserDetailField(auth, { profile_pic_url: publicUrl })

    return ok({ publicUrl })
  } catch (error) {
    return fail(error)
  }
}
