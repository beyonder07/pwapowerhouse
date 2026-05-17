import { NextRequest } from "next/server"
import { authenticateRequest } from "@/src/middleware/auth.middleware"
import { ClientService } from "@/src/modules/client/client.service"
import { fail, ok } from "@/src/utils/response"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

export async function GET(req: NextRequest) {
  try {
    const auth = await authenticateRequest(req)
    const data = await new ClientService(auth).getDashboard()

    return ok(data)
  } catch (error) {
    return fail(error)
  }
}
