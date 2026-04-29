"use client"

import { AuthenticatedShell } from "@/components/shell"
import type { NavItem } from "@/components/shell"
import {
  LayoutDashboard,
  Users,
  Calendar,
  Dumbbell,
  MessageSquare,
  DollarSign,
  Settings,
  User,
} from "lucide-react"

const trainerNavItems: NavItem[] = [
  { label: "Dashboard", href: "/trainer", icon: LayoutDashboard },
  { label: "My Clients", href: "/trainer/clients", icon: Users },
  { label: "Schedule", href: "/trainer/schedule", icon: Calendar },
  { label: "Workouts", href: "/trainer/workouts", icon: Dumbbell },
  { label: "Messages", href: "/trainer/messages", icon: MessageSquare },
  { label: "Earnings", href: "/trainer/earnings", icon: DollarSign },
  { label: "Profile", href: "/trainer/profile", icon: User },
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
