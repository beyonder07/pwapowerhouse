"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { Loader2 } from "lucide-react"
import { AppShell } from "./app-shell"
import type { NavItem, UserRole } from "./types"

interface SessionUser {
  id: string
  email: string | null
  fullName: string | null
  avatarUrl: string | null
  role: UserRole
}

interface AuthenticatedShellProps {
  children: React.ReactNode
  role: UserRole
  navItems: NavItem[]
  footerItems?: NavItem[]
  pendingCount?: number
}

function displayNameFor(user: SessionUser) {
  if (user.fullName) return user.fullName
  if (user.email) return user.email.split("@")[0]
  return "PowerHouse User"
}

export function AuthenticatedShell({
  children,
  role,
  navItems,
  footerItems,
  pendingCount,
}: AuthenticatedShellProps) {
  const router = useRouter()
  const [user, setUser] = useState<SessionUser | null>(null)

  useEffect(() => {
    let mounted = true

    async function loadSession() {
      const response = await fetch("/api/auth/me", {
        credentials: "include",
        cache: "no-store",
      })

      if (!response.ok) {
        router.replace("/login")
        return
      }

      const result = await response.json()
      const nextUser = result.data.user as SessionUser

      if (nextUser.role !== role) {
        router.replace(`/${nextUser.role}`)
        return
      }

      if (mounted) {
        setUser(nextUser)
      }
    }

    loadSession().catch(() => {
      router.replace("/login")
    })

    return () => {
      mounted = false
    }
  }, [role, router])

  if (!user) {
    return (
      <div className="flex min-h-dvh items-center justify-center bg-background">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </div>
    )
  }

  return (
    <AppShell
      role={role}
      navItems={navItems}
      footerItems={footerItems}
      pendingCount={pendingCount}
      user={{
        name: displayNameFor(user),
        email: user.email ?? "",
        avatar: user.avatarUrl,
        role: user.role,
      }}
    >
      {children}
    </AppShell>
  )
}
