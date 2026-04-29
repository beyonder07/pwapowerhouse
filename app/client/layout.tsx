"use client"

import { AuthenticatedShell } from "@/components/shell"
import type { NavItem } from "@/components/shell"
import {
  LayoutDashboard,
  Dumbbell,
  Calendar,
  Users,
  CreditCard,
  Settings,
  User,
} from "lucide-react"

const clientNavItems: NavItem[] = [
  { label: "Dashboard", href: "/client", icon: LayoutDashboard },
  { label: "My Workouts", href: "/client/workouts", icon: Dumbbell },
  { label: "My Schedule", href: "/client/schedule", icon: Calendar },
  { label: "My Trainers", href: "/client/trainers", icon: Users },
  { label: "Payments", href: "/client/payments", icon: CreditCard },
  { label: "Profile", href: "/client/profile", icon: User },
  { label: "Settings", href: "/client/settings", icon: Settings },
]

export default function ClientLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <AuthenticatedShell navItems={clientNavItems} role="client">
      {children}
    </AuthenticatedShell>
  )
}
