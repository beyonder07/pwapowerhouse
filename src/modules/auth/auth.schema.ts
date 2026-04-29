import { z } from "zod"

export const LoginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
})

export const PasswordResetRequestSchema = z.object({
  email: z.string().trim().email().max(255),
})
