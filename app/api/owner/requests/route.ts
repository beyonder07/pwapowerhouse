import { NextRequest } from "next/server"
import { authenticateRequest } from "@/src/middleware/auth.middleware"
import { requireRole } from "@/src/middleware/role.middleware"
import { RequestStatusUpdateSchema } from "@/src/modules/requests/admin-request.schema"
import { AdminRequestService } from "@/src/modules/requests/admin-request.service"
import { fail, ok } from "@/src/utils/response"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

export async function GET(req: NextRequest) {
  try {
    const auth = await authenticateRequest(req)
    requireRole(auth, ["owner"])

    const data = await new AdminRequestService().listPending(auth)
    return ok(data)
  } catch (error) {
    return fail(error)
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const auth = await authenticateRequest(req)
    requireRole(auth, ["owner"])

    const input = RequestStatusUpdateSchema.parse(await req.json())
    const result = await new AdminRequestService().updateStatus(auth, input)

    return ok(result)
  } catch (error) {
    return fail(error)
  }
}
