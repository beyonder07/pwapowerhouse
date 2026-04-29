import { z } from "zod"

export const OwnerSetupSchema = z
  .object({
    fullName: z.string().trim().min(2).max(120),
    email: z.string().trim().email().max(255),
    phone: z.string().trim().min(10).max(20),
    password: z.string().min(8).max(128),
    confirmPassword: z.string().min(8).max(128),
    setupKey: z.string().min(1),
  })
  .refine((input) => input.password === input.confirmPassword, {
    message: "Passwords do not match",
    path: ["confirmPassword"],
  })

export type OwnerSetupInput = z.infer<typeof OwnerSetupSchema>
