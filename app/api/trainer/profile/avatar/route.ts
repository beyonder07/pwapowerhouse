import { NextRequest } from "next/server"
import { authenticateRequest } from "@/src/middleware/auth.middleware"
import { requireRole } from "@/src/middleware/role.middleware"
import { createSupabaseServiceRoleClient } from "@/src/services/supabase.service"
import { BadRequestError } from "@/src/utils/errors"
import { fail, ok } from "@/src/utils/response"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

const MAX_IMAGE_BYTES = 5 * 1024 * 1024
const ALLOWED_IMAGE_TYPES = new Map([
  ["image/jpeg", "jpg"],
  ["image/png", "png"],
  ["image/webp", "webp"],
])

export async function POST(req: NextRequest) {
  try {
    const auth = await authenticateRequest(req)
    requireRole(auth, ["trainer"])

    const formData = await req.formData()
    const file = formData.get("file")

    if (!(file instanceof File)) {
      throw new BadRequestError("Profile image is required")
    }

    const extension = ALLOWED_IMAGE_TYPES.get(file.type)
    if (!extension) {
      throw new BadRequestError("Only JPG, PNG, or WebP images are allowed")
    }

    if (file.size > MAX_IMAGE_BYTES) {
      throw new BadRequestError("Profile image must be 5MB or smaller")
    }

    const serviceClient = createSupabaseServiceRoleClient()
    const filePath = `trainers/${auth.authUserId}/avatar-${Date.now()}.${extension}`
    const bytes = Buffer.from(await file.arrayBuffer())

    const { error: uploadError } = await serviceClient.storage
      .from("profile-images")
      .upload(filePath, bytes, {
        contentType: file.type,
        upsert: true,
      })

    if (uploadError) {
      throw uploadError
    }

    const {
      data: { publicUrl },
    } = serviceClient.storage.from("profile-images").getPublicUrl(filePath)

    const { error: detailsError } = await serviceClient
      .from("user_details")
      .upsert(
        {
          user_id: auth.authUserId,
          profile_pic_url: publicUrl,
          updated_at: new Date().toISOString(),
        },
        { onConflict: "user_id" }
      )

    if (detailsError) {
      throw detailsError
    }

    return ok({ publicUrl })
  } catch (error) {
    return fail(error)
  }
}
