"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { cn } from "@/lib/utils"
import type { NavItem } from "./types"

interface MobileNavProps {
  navItems: NavItem[]
  pendingCount?: number
  className?: string
}

export function MobileNav({ navItems, pendingCount, className }: MobileNavProps) {
  const pathname = usePathname()

  // Show max 5 items in mobile nav
  const visibleItems = navItems.slice(0, 5)

  return (
    <nav
      className={cn(
        "fixed bottom-0 left-0 right-0 z-40 border-t border-border bg-card/95 backdrop-blur-lg safe-bottom",
        className
      )}
    >
      <ul className="flex items-center justify-around h-16">
        {visibleItems.map((item) => {
          const isActive = pathname === item.href || 
            (item.href.split("/").length > 2 && pathname.startsWith(item.href))
          const showBadge = item.label === "Requests" && pendingCount && pendingCount > 0

          return (
            <li key={item.href}>
              <Link
                href={item.href}
                className={cn(
                  "flex flex-col items-center justify-center px-3 py-2 min-w-[60px] tap-target",
                  "transition-colors"
                )}
              >
                <div className="relative">
                  <item.icon
                    className={cn(
                      "h-5 w-5 mb-1",
                      isActive ? "text-primary" : "text-muted-foreground"
                    )}
                  />
                  {showBadge && (
                    <span className="absolute -top-1 -right-1 h-4 min-w-4 flex items-center justify-center rounded-full bg-primary text-primary-foreground text-[10px] font-semibold px-1">
                      {pendingCount}
                    </span>
                  )}
                </div>
                <span
                  className={cn(
                    "text-[10px] font-medium",
                    isActive ? "text-primary" : "text-muted-foreground"
                  )}
                >
                  {item.label}
                </span>
              </Link>
            </li>
          )
        })}
      </ul>
    </nav>
  )
}
