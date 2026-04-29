import { NextResponse } from "next/server"
import { ZodError } from "zod"
import { AppError } from "./errors"

export function ok<T>(data: T, status = 200) {
  return NextResponse.json({ success: true, data }, { status })
}

export function fail(error: unknown) {
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

  console.error(error)

  return NextResponse.json(
    {
      success: false,
      error: "Internal server error",
      code: "INTERNAL_ERROR",
    },
    { status: 500 }
  )
}
