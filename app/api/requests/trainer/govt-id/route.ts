import { NextRequest } from "next/server"
import { rateLimitOrThrow } from "@/src/services/rate-limit.service"
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
    const ip = req.headers.get("x-forwarded-for")?.split(",")[0] ?? "unknown"
    await rateLimitOrThrow({
      key: `requests:trainer:govt-id:${ip}`,
      limit: 10,
      windowSeconds: 600,
    })

    const formData = await req.formData()
    const file = formData.get("file")

    if (!(file instanceof File)) {
      throw new BadRequestError("Government ID photo is required")
    }

    const extension = ALLOWED_IMAGE_TYPES.get(file.type)
    if (!extension) {
      throw new BadRequestError("Only JPG, PNG, or WebP images are allowed")
    }

    if (file.size > MAX_IMAGE_BYTES) {
      throw new BadRequestError("Government ID photo must be 5MB or smaller")
    }

    const serviceClient = createSupabaseServiceRoleClient()
    const filePath = `trainer-govt-ids/applications/${crypto.randomUUID()}.${extension}`
    const bytes = Buffer.from(await file.arrayBuffer())

    const { error: uploadError } = await serviceClient.storage
      .from("profile-images")
      .upload(filePath, bytes, {
        contentType: file.type,
        upsert: false,
      })

    if (uploadError) {
      throw uploadError
    }

    const {
      data: { publicUrl },
    } = serviceClient.storage.from("profile-images").getPublicUrl(filePath)

    return ok({ publicUrl })
  } catch (error) {
    return fail(error)
  }
}
