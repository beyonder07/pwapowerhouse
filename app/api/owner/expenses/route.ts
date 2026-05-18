import { NextRequest } from "next/server"
import { authenticateRequest } from "@/src/middleware/auth.middleware"
import { addExpense, deleteExpense } from "@/src/modules/gym/profit.service"
import { fail, ok } from "@/src/utils/response"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

export async function POST(req: NextRequest) {
  try {
    const auth = await authenticateRequest(req)
    const body = await req.json()
    await addExpense(auth, body)
    return ok({ message: "Expense added" })
  } catch (error) {
    if ((error as any).message === "TABLE_MISSING") {
      return fail(new Error("TABLE_MISSING"))
    }
    return fail(error)
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const auth = await authenticateRequest(req)
    const { searchParams } = new URL(req.url)
    const id = searchParams.get("id")
    if (!id) throw new Error("ID required")
    await deleteExpense(auth, id)
    return ok({ message: "Expense deleted" })
  } catch (error) {
    return fail(error)
  }
}
