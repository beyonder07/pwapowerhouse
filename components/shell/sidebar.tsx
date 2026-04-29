"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { motion } from "framer-motion"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { ChevronLeft, ChevronRight } from "lucide-react"
import { BrandLogo } from "@/components/brand-logo"
import type { NavItem, UserRole } from "./types"

interface SidebarProps {
  role: UserRole
  navItems: NavItem[]
  footerItems?: NavItem[]
  collapsed: boolean
  onToggleCollapse: () => void
  pendingCount?: number
  className?: string
}

const roleLabels: Record<UserRole, string> = {
  owner: "Owner",
  trainer: "Trainer",
  client: "Member",
}

export function Sidebar({
  role,
  navItems,
  footerItems,
  collapsed,
  onToggleCollapse,
  pendingCount,
  className,
}: SidebarProps) {
  const pathname = usePathname()

  return (
    <motion.aside
      initial={false}
      animate={{ width: collapsed ? 72 : 260 }}
      transition={{ duration: 0.2 }}
      className={cn(
        "relative flex flex-col border-r border-sidebar-border bg-sidebar",
        className
      )}
    >
      {/* Logo */}
      <div
        className={cn(
          "flex h-20 items-center gap-3 border-b border-sidebar-border",
          collapsed ? "justify-center px-2" : "px-4"
        )}
      >
        <BrandLogo showText={false} size={collapsed ? "md" : "lg"} />
        {!collapsed && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="overflow-hidden"
          >
            <span className="font-bold text-lg text-sidebar-foreground whitespace-nowrap">
              Power<span className="text-primary">House</span>
            </span>
            <p className="text-xs text-sidebar-foreground/60">{roleLabels[role]} Portal</p>
          </motion.div>
        )}
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto py-4 px-2 scrollbar-hide">
        <ul className="space-y-1">
          {navItems.map((item) => {
            const isActive = pathname === item.href || 
              (item.href !== `/${role}` && pathname.startsWith(item.href))
            const showBadge = item.label === "Requests" && pendingCount && pendingCount > 0

            return (
              <li key={item.href}>
                <Link
                  href={item.href}
                  className={cn(
                    "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors tap-target",
                    isActive
                      ? "bg-sidebar-accent text-sidebar-primary"
                      : "text-sidebar-foreground/70 hover:bg-sidebar-accent/50 hover:text-sidebar-foreground"
                  )}
                >
                  <item.icon className={cn(
                    "h-5 w-5 flex-shrink-0",
                    isActive ? "text-sidebar-primary" : ""
                  )} />
                  {!collapsed && (
                    <motion.span
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      className="flex-1 truncate"
                    >
                      {item.label}
                    </motion.span>
                  )}
                  {!collapsed && showBadge && (
                    <span className="flex items-center justify-center h-5 min-w-5 px-1.5 rounded-full bg-primary text-primary-foreground text-xs font-semibold">
                      {pendingCount}
                    </span>
                  )}
                  {collapsed && showBadge && (
                    <span className="absolute right-2 top-1 h-2 w-2 rounded-full bg-primary" />
                  )}
                </Link>
              </li>
            )
          })}
        </ul>
      </nav>

      {/* Footer Items */}
      {footerItems && footerItems.length > 0 && (
        <nav className="border-t border-sidebar-border py-2 px-2">
          <ul className="space-y-1">
            {footerItems.map((item) => {
              const isActive = pathname === item.href
              return (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    className={cn(
                      "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors tap-target",
                      isActive
                        ? "bg-sidebar-accent text-sidebar-primary"
                        : "text-sidebar-foreground/70 hover:bg-sidebar-accent/50 hover:text-sidebar-foreground"
                    )}
                  >
                    <item.icon className={cn(
                      "h-5 w-5 flex-shrink-0",
                      isActive ? "text-sidebar-primary" : ""
                    )} />
                    {!collapsed && (
                      <motion.span
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="flex-1 truncate"
                      >
                        {item.label}
                      </motion.span>
                    )}
                  </Link>
                </li>
              )
            })}
          </ul>
        </nav>
      )}

      {/* Collapse Button */}
      <div className="border-t border-sidebar-border p-2">
        <Button
          variant="ghost"
          size="sm"
          onClick={onToggleCollapse}
          className="w-full justify-center text-sidebar-foreground/60 hover:text-sidebar-foreground"
        >
          {collapsed ? (
            <ChevronRight className="h-4 w-4" />
          ) : (
            <>
              <ChevronLeft className="h-4 w-4 mr-2" />
              <span>Collapse</span>
            </>
          )}
        </Button>
      </div>
    </motion.aside>
  )
}
