import { NextRequest } from "next/server"
import { authenticateRequest } from "@/src/middleware/auth.middleware"
import { listOwnerSalaries, updateSalaryRecord } from "@/src/modules/gym/owner-roster.service"
import { fail, ok } from "@/src/utils/response"
import { z } from "zod"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

const PatchSchema = z.object({
  id: z.string().min(1),
  status: z.enum(["paid", "processing", "pending"]).optional(),
  baseSalary: z.number().min(0).optional(),
  bonus: z.number().min(0).optional(),
})

export async function GET(req: NextRequest) {
  try {
    const auth = await authenticateRequest(req)
    const { searchParams } = new URL(req.url)
    const month = searchParams.get("month") ?? undefined
    const data = await listOwnerSalaries(auth, { month })
    return ok(data)
  } catch (error) {
    return fail(error)
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const auth = await authenticateRequest(req)
    const body = await req.json()
    const input = PatchSchema.parse(body)
    await updateSalaryRecord(auth, input)
    return ok({ updated: true })
  } catch (error) {
    return fail(error)
  }
}
