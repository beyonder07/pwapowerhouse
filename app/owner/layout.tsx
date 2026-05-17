"use client"

import { useEffect, useState } from "react"
import { AuthenticatedShell } from "@/components/shell"
import type { NavItem } from "@/components/shell"
import {
  BarChart3,
  Bell,
  CheckSquare,
  DollarSign,
  IndianRupee,
  Settings,
  TrendingUp,
  UserCheck,
  Users,
} from "lucide-react"

const OWNER_NAV_ITEMS: NavItem[] = [
  { label: "Dashboard", href: "/owner", icon: BarChart3 },
  { label: "Analytics", href: "/owner/analytics", icon: TrendingUp },
  { label: "Members", href: "/owner/members", icon: Users },
  { label: "Trainers", href: "/owner/trainers", icon: UserCheck },
  { label: "Payments", href: "/owner/payments", icon: DollarSign },
  { label: "Salary", href: "/owner/salary", icon: IndianRupee },
  { label: "Attendance", href: "/owner/attendance", icon: CheckSquare },
  { label: "Requests", href: "/owner/requests", icon: Bell },
]

const OWNER_FOOTER_ITEMS: NavItem[] = [
  {
    label: "Settings",
    href: "/owner/settings",
    icon: Settings,
  },
]

export default function OwnerLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const [pendingCount, setPendingCount] = useState(0)

  useEffect(() => {
    async function loadPending() {
      try {
        const [requestsRes, paymentsRes] = await Promise.all([
          fetch("/api/owner/requests", { credentials: "include", cache: "no-store" }),
          fetch("/api/owner/payments", { credentials: "include", cache: "no-store" }),
        ])
        const [requestsJson, paymentsJson] = await Promise.all([
          requestsRes.json(),
          paymentsRes.json(),
        ])
        const requestCount =
          (requestsJson.data?.membershipRequests?.length ?? 0) +
          (requestsJson.data?.trainerApplications?.length ?? 0)
        const paymentCount = paymentsJson.data?.pending?.length ?? 0
        setPendingCount(requestCount + paymentCount)
      } catch {
        setPendingCount(0)
      }
    }
    void loadPending()
  }, [])

  return (
    <AuthenticatedShell
      role="owner"
      navItems={OWNER_NAV_ITEMS}
      footerItems={OWNER_FOOTER_ITEMS}
      pendingCount={pendingCount}
    >
      {children}
    </AuthenticatedShell>
  )
}
