"use client"

import { AuthenticatedShell } from "@/components/shell"
import type { NavItem } from "@/components/shell"
import {
  CalendarCheck,
  CreditCard,
  Dumbbell,
  LayoutDashboard,
  Settings,
  Users,
} from "lucide-react"

const clientNavItems: NavItem[] = [
  { label: "Dashboard", href: "/client", icon: LayoutDashboard },
  { label: "Attendance", href: "/client/attendance", icon: CalendarCheck },
  { label: "Workouts", href: "/client/workouts", icon: Dumbbell },
  { label: "Trainers", href: "/client/trainers", icon: Users },
  { label: "Payments", href: "/client/payments", icon: CreditCard },
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
