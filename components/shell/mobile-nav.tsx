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

// NAV_H must match --mobile-nav-height in globals.css
const NAV_H = 56

export function MobileNav({ navItems, pendingCount, className }: MobileNavProps) {
  const pathname = usePathname()
  const [expanded, setExpanded] = useState(false)

  const primaryItems = navItems.slice(0, 4)
  const overflowItems = navItems.slice(4)
  const hasOverflow = overflowItems.length > 0

  return (
    <>
      {/* ── Overflow tray ─────────────────────────────────────────────── */}
      {/* Sits immediately ABOVE the nav bar — never overlaps it */}
      {hasOverflow && expanded && (
        <>
          {/* Backdrop — full screen dimmer, closes tray on tap */}
          <div
            className="fixed inset-0 z-40"
            onClick={() => setExpanded(false)}
          />

          {/* Tray panel — anchored above the nav bar using bottom = NAV_H + safe-area */}
          <div
            className="fixed left-0 right-0 z-40 border-t border-white/10 bg-background/98 backdrop-blur-xl"
            style={{
              bottom: `calc(${NAV_H}px + env(safe-area-inset-bottom, 0px))`,
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="grid grid-cols-4 gap-0 px-2 py-3">
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
                    className="flex flex-col items-center justify-center gap-1 rounded-xl px-2 py-3 transition-colors hover:bg-white/5 active:bg-white/10"
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
                )
              })}
            </div>
          </div>
        </>
      )}

      {/* ── Bottom nav bar ────────────────────────────────────────────── */}
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

          {/* More button */}
          {hasOverflow && (
            <li className="flex-1">
              <button
                onClick={() => setExpanded((v) => !v)}
                className={cn(
                  "flex h-full w-full flex-col items-center justify-center gap-0.5 tap-target transition-colors",
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
                  {!expanded &&
                    overflowItems.some(
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
