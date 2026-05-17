import { NextRequest } from "next/server"
import { authenticateRequest } from "@/src/middleware/auth.middleware"
import { ClientService } from "@/src/modules/client/client.service"
import { BadRequestError } from "@/src/utils/errors"
import { fail } from "@/src/utils/response"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

export async function GET(req: NextRequest) {
  try {
    const auth = await authenticateRequest(req)
    const paymentId = req.nextUrl.searchParams.get("paymentId")

    if (!paymentId) {
      throw new BadRequestError("Payment id is required")
    }

    const invoice = await new ClientService(auth).generateInvoice(paymentId)

    return new Response(invoice.html, {
      headers: {
        "Content-Type": "text/html; charset=utf-8",
        "Content-Disposition": `attachment; filename="${invoice.fileName}"`,
        "Cache-Control": "no-store",
      },
    })
  } catch (error) {
    return fail(error)
  }
}
