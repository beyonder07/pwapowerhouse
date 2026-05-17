import { NextRequest } from "next/server"
import { authenticateRequest } from "@/src/middleware/auth.middleware"
import { TrainerMemberQuerySchema } from "@/src/modules/trainer/trainer.schema"
import { TrainerPanelService } from "@/src/modules/trainer/trainer.service"
import { fail, ok } from "@/src/utils/response"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

export async function GET(req: NextRequest) {
  try {
    const auth = await authenticateRequest(req)
    const query = TrainerMemberQuerySchema.parse(
      Object.fromEntries(req.nextUrl.searchParams)
    )
    const data = await new TrainerPanelService(auth).getMembers(query)

    return ok(data)
  } catch (error) {
    return fail(error)
  }
}
