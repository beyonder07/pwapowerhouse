import { NextResponse } from "next/server"
import { ZodError } from "zod"
import { AppError } from "./errors"

export function ok<T>(data: T, status = 200) {
  return NextResponse.json({ success: true, data }, { status })
}

export function fail(error: unknown) {
  // Anti-Gravity: Detailed error reporting for debugging
  if (error instanceof AppError) {
    return NextResponse.json(
      { success: false, error: error.message, code: error.code },
      { status: error.status }
    )
  }

  if (error instanceof ZodError) {
    return NextResponse.json(
      {
        success: false,
        error: "Invalid request payload",
        code: "VALIDATION_ERROR",
        details: error.flatten(),
      },
      { status: 400 }
    )
  }

  // Log to server console
  console.error("API Error Trace:", error)

  const message = error instanceof Error ? error.message : "Internal server error"
  const details = (error as any)?.details || (error as any)?.hint || undefined

  return NextResponse.json(
    {
      success: false,
      error: message,
      details: details,
      code: (error as any)?.code || "INTERNAL_ERROR",
    },
    { status: 500 }
  )
}
