import { z } from "zod"

export const MembershipRequestSchema = z.object({
  fullName: z.string().trim().min(2).max(120),
  email: z.string().trim().email().max(255),
  phone: z.string().trim().min(10).max(20),
  branchId: z.string().uuid(),
})

export const TrainerApplicationSchema = z.object({
  fullName: z.string().trim().min(2).max(120),
  email: z.string().trim().email().max(255),
  phone: z.string().trim().min(10).max(20),
  branchId: z.string().uuid().nullable(),
  openToAnyBranch: z.boolean().default(false),
  specialization: z.string().trim().min(2).max(120),
  experience: z.string().trim().min(1).max(80),
  about: z.string().trim().max(2000).optional(),
})

export type MembershipRequestInput = z.infer<typeof MembershipRequestSchema>
export type TrainerApplicationInput = z.infer<typeof TrainerApplicationSchema>
