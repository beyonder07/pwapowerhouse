"use client"

import { useEffect, useRef, useState } from "react"
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
}: AppShellProps) {
  const finalUserName = user?.name || userName || "User"
  const finalUserAvatar = user?.avatar || userAvatar
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false)
  const [navHidden, setNavHidden] = useState(false)
  const mainRef = useRef<HTMLElement>(null)
  const lastScrollY = useRef(0)
  const ticking = useRef(false)

  // Auto-hide nav: hide on scroll-down past 100px, reveal on any upward scroll
  useEffect(() => {
    const el = mainRef.current
    if (!el) return

    const onScroll = () => {
      if (ticking.current) return
      ticking.current = true
      requestAnimationFrame(() => {
        const currentY = el.scrollTop
        const delta = currentY - lastScrollY.current

        // Need to be past 100px before hiding kicks in
        if (currentY > 100 && delta > 10) {
          setNavHidden(true)
        } else if (delta < -8 || currentY <= 60) {
          // Reveal on upward scroll OR when near top
          setNavHidden(false)
        }

        lastScrollY.current = currentY
        ticking.current = false
      })
    }

    el.addEventListener("scroll", onScroll, { passive: true })
    return () => el.removeEventListener("scroll", onScroll)
  }, [])

  return (
    <div className="app-shell flex-col lg:flex-row bg-background">
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
      <div className="flex flex-1 flex-col overflow-hidden min-w-0">
        {/* Top Header */}
        <TopHeader
          role={role}
          userName={finalUserName}
          userAvatar={finalUserAvatar ?? undefined}
        />

        {/* Content — scroll container lives here */}
        <main ref={mainRef} className={cn("main-content flex-1", "mobile-main-safe")}>
          <div className="mx-auto h-full max-w-7xl px-3 py-4 sm:px-5 sm:py-5 lg:px-6 lg:py-6">
            {children}
          </div>
        </main>
      </div>

      {/* Mobile Bottom Nav — auto-hides on scroll-down */}
      <MobileNav
        navItems={navItems}
        pendingCount={pendingCount}
        hidden={navHidden}
        className="lg:hidden"
      />
    </div>
  )
}
