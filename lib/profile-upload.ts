import type { AuthContext } from "@/src/middleware/auth.middleware"
import { createSupabaseServiceRoleClient } from "@/src/services/supabase.service"
import { BadRequestError } from "@/src/utils/errors"

export const MAX_IMAGE_BYTES = 5 * 1024 * 1024
export const ALLOWED_IMAGE_TYPES = new Map([
  ["image/jpeg", "jpg"],
  ["image/png", "png"],
  ["image/webp", "webp"],
])

export function parseImageFile(file: FormDataEntryValue | null): File {
  if (!(file instanceof File)) {
    throw new BadRequestError("Image file is required")
  }

  const extension = ALLOWED_IMAGE_TYPES.get(file.type)
  if (!extension) {
    throw new BadRequestError("Only JPG, PNG, or WebP images are allowed")
  }

  if (file.size > MAX_IMAGE_BYTES) {
    throw new BadRequestError("Image must be 5MB or smaller")
  }

  return file
}

export async function uploadProfileImage(
  auth: AuthContext,
  file: File,
  storagePath: string
): Promise<string> {
  const extension = ALLOWED_IMAGE_TYPES.get(file.type)!
  const serviceClient = createSupabaseServiceRoleClient()
  const filePath = `${storagePath}.${extension}`
  const bytes = Buffer.from(await file.arrayBuffer())

  const { error: uploadError } = await serviceClient.storage
    .from("profile-images")
    .upload(filePath, bytes, {
      contentType: file.type,
      upsert: true,
    })

  if (uploadError) throw uploadError

  const {
    data: { publicUrl },
  } = serviceClient.storage.from("profile-images").getPublicUrl(filePath)

  return publicUrl
}

export async function saveUserDetailField(
  auth: AuthContext,
  fields: Record<string, string>
) {
  const serviceClient = createSupabaseServiceRoleClient()
  const { error } = await serviceClient.from("user_details").upsert(
    {
      user_id: auth.authUserId,
      ...fields,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "user_id" }
  )

  if (error) throw error
}
