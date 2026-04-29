import { BranchesService } from "@/src/modules/branches/branches.service"
import { fail, ok } from "@/src/utils/response"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

export async function GET() {
  try {
    const branches = await new BranchesService().listActive()
    return ok({ branches })
  } catch (error) {
    return fail(error)
  }
}
