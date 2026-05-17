"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { useState } from "react"
import { cn } from "@/lib/utils"
import type { NavItem } from "./types"
import { ChevronUp } from "lucide-react"

interface MobileNavProps {
  navItems: NavItem[]
  pendingCount?: number
  className?: string
}

export function MobileNav({ navItems, pendingCount, className }: MobileNavProps) {
  const pathname = usePathname()
  const [expanded, setExpanded] = useState(false)

  // Primary items always visible (first 4), rest in overflow tray
  const primaryItems = navItems.slice(0, 4)
  const overflowItems = navItems.slice(4)
  const hasOverflow = overflowItems.length > 0

  return (
    <>
      {/* Overflow tray — slides up when expanded */}
      {hasOverflow && expanded && (
        <div
          className="fixed inset-0 z-40"
          onClick={() => setExpanded(false)}
        >
          <div
            className="bottom-nav-safe absolute bottom-0 left-0 right-0 border-t border-white/10 bg-background/98 backdrop-blur-xl"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Tray items */}
            <div className="grid grid-cols-4 gap-0 px-2 pt-3 pb-2">
              {overflowItems.map((item) => {
                const isActive =
                  pathname === item.href ||
                  (item.href.split("/").length > 2 && pathname.startsWith(item.href))
                const showBadge =
                  item.label === "Requests" && pendingCount && pendingCount > 0

                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={() => setExpanded(false)}
                    className="flex flex-col items-center justify-center px-2 py-3 tap-target"
                  >
                    <div className="relative mb-1">
                      <item.icon
                        className={cn(
                          "h-5 w-5",
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
                )
              })}
            </div>
          </div>
        </div>
      )}

      {/* Bottom nav bar */}
      <nav
        className={cn(
          "bottom-nav-safe fixed bottom-0 left-0 right-0 z-50 border-t border-white/10 bg-background/95 backdrop-blur-lg",
          className
        )}
      >
        <ul className="flex h-[56px] items-stretch">
          {primaryItems.map((item) => {
            const isActive =
              pathname === item.href ||
              (item.href.split("/").length > 2 && pathname.startsWith(item.href))
            const showBadge =
              item.label === "Requests" && pendingCount && pendingCount > 0

            return (
              <li key={item.href} className="flex-1">
                <Link
                  href={item.href}
                  className="flex h-full flex-col items-center justify-center gap-0.5 tap-target"
                >
                  <div className="relative">
                    <item.icon
                      className={cn(
                        "h-5 w-5",
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
                      "text-[10px] font-medium leading-none",
                      isActive ? "text-primary" : "text-muted-foreground"
                    )}
                  >
                    {item.label}
                  </span>
                </Link>
              </li>
            )
          })}

          {/* More button — only when overflow exists */}
          {hasOverflow && (
            <li className="flex-1">
              <button
                onClick={() => setExpanded((v) => !v)}
                className={cn(
                  "flex h-full w-full flex-col items-center justify-center gap-0.5 tap-target",
                  expanded ? "text-primary" : "text-muted-foreground"
                )}
              >
                <div className="relative">
                  <ChevronUp
                    className={cn(
                      "h-5 w-5 transition-transform duration-200",
                      expanded ? "rotate-180 text-primary" : ""
                    )}
                  />
                  {/* Dot indicator if any overflow item has badge */}
                  {!expanded && overflowItems.some(
                    (i) => i.label === "Requests" && pendingCount && pendingCount > 0
                  ) && (
                    <span className="absolute -top-1 -right-1 h-2 w-2 rounded-full bg-primary" />
                  )}
                </div>
                <span className="text-[10px] font-medium leading-none">More</span>
              </button>
            </li>
          )}
        </ul>
      </nav>
    </>
  )
}
