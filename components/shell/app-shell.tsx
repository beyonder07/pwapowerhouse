"use client"

import { useState } from "react"
import { Sidebar } from "./sidebar"
import { TopHeader } from "./top-header"
import { MobileNav } from "./mobile-nav"
import { cn } from "@/lib/utils"
import type { NavItem } from "./types"

interface User {
  name: string
  email: string
  avatar?: string | null
  role: "owner" | "trainer" | "client"
}

interface AppShellProps {
  children: React.ReactNode
  role: "owner" | "trainer" | "client"
  navItems: NavItem[]
  user?: User
  userName?: string
  userAvatar?: string | null
  pendingCount?: number
  footerItems?: NavItem[]
  sidebarOpen?: boolean
  setSidebarOpen?: (open: boolean) => void
}

export function AppShell({
  children,
  role,
  navItems,
  user,
  userName,
  userAvatar,
  pendingCount,
  footerItems,
  sidebarOpen,
  setSidebarOpen,
}: AppShellProps) {
  const finalUserName = user?.name || userName || "User"
  const finalUserAvatar = user?.avatar || userAvatar
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false)

  return (
    <div className="app-shell lg:flex-row bg-background">
      {/* Desktop Sidebar */}
      <Sidebar
        role={role}
        navItems={navItems}
        footerItems={footerItems}
        collapsed={sidebarCollapsed}
        onToggleCollapse={() => setSidebarCollapsed(!sidebarCollapsed)}
        pendingCount={pendingCount}
        className="hidden lg:flex"
      />

      {/* Main Content Area */}
      <div className="flex flex-1 flex-col overflow-hidden">
        {/* Top Header */}
        <TopHeader
          role={role}
          userName={finalUserName}
          userAvatar={finalUserAvatar ?? undefined}
        />

        {/* Content */}
        <main
          className={cn(
            "main-content flex-1",
            "mobile-main-safe"
          )}
        >
          <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
            {children}
          </div>
        </main>
      </div>

      {/* Mobile Bottom Nav */}
      <MobileNav
        navItems={navItems}
        pendingCount={pendingCount}
        className="lg:hidden"
      />
    </div>
  )
}
