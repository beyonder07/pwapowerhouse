import { NextRequest } from "next/server"
import { TrainerApplicationSchema } from "@/src/modules/requests/request.schema"
import { RequestService } from "@/src/modules/requests/request.service"
import { rateLimitOrThrow } from "@/src/services/rate-limit.service"
import { fail, ok } from "@/src/utils/response"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

export async function POST(req: NextRequest) {
  try {
    const ip = req.headers.get("x-forwarded-for")?.split(",")[0] ?? "unknown"
    await rateLimitOrThrow({
      key: `requests:trainer:${ip}`,
      limit: 5,
      windowSeconds: 60,
    })

    const input = TrainerApplicationSchema.parse(await req.json())
    const result = await new RequestService().createTrainerApplication(input)

    return ok(result, 201)
  } catch (error) {
    return fail(error)
  }
}
