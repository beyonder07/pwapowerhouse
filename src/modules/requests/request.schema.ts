import { z } from "zod"

export const MembershipRequestSchema = z.object({
  fullName: z.string().trim().min(2).max(120),
  email: z.string().trim().email().max(255),
  phone: z.string().trim().min(10).max(20),
  branchId: z.string().uuid(),
  password: z.string().min(6, "Password must be at least 6 characters").max(100),
  govtIdUrl: z.string().url().optional().nullable(),
  govtIdType: z.enum(["aadhar", "pan", "license", "other"]).optional().nullable(),
  govtIdNumber: z.string().min(4).max(50).optional().nullable(),
})

export const TrainerApplicationSchema = z.object({
  fullName: z.string().trim().min(2).max(120),
  email: z.string().trim().email().max(255),
  phone: z.string().trim().min(10).max(20),
  branchId: z.string().uuid().nullable(),
  openToAnyBranch: z.boolean().default(false),
  specialization: z.string().trim().min(2).max(120),
  experience: z.string().trim().min(1).max(80),
  password: z.string().min(6, "Password must be at least 6 characters").max(100),
  govtIdUrl: z.string().url().optional().nullable(),
  about: z.string().trim().max(2000).optional(),
})

export type MembershipRequestInput = z.infer<typeof MembershipRequestSchema>
export type TrainerApplicationInput = z.infer<typeof TrainerApplicationSchema>
