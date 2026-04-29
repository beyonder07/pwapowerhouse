import type { LucideIcon } from "lucide-react"

export interface NavItem {
  href: string
  label: string
  icon: LucideIcon
  badge?: number
}

export type UserRole = "owner" | "trainer" | "client"
