"use client"

import { AuthenticatedShell } from "@/components/shell"
import type { NavItem } from "@/components/shell"
import {
  CalendarCheck,
  Dumbbell,
  LayoutDashboard,
  Settings,
  Users,
  WalletCards,
} from "lucide-react"

const trainerNavItems: NavItem[] = [
  { label: "Dashboard", href: "/trainer/dashboard", icon: LayoutDashboard },
  { label: "Members", href: "/trainer/members", icon: Users },
  { label: "Attendance", href: "/trainer/attendance", icon: CalendarCheck },
  { label: "Workouts", href: "/trainer/workouts", icon: Dumbbell },
  { label: "Salary", href: "/trainer/salary", icon: WalletCards },
  { label: "Settings", href: "/trainer/settings", icon: Settings },
]

export default function TrainerLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <AuthenticatedShell navItems={trainerNavItems} role="trainer">
      {children}
    </AuthenticatedShell>
  )
}
