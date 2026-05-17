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
  hidden?: boolean
  className?: string
}

// Must match --mobile-nav-height in globals.css
const NAV_H = 48

export function MobileNav({ navItems, pendingCount, hidden = false, className }: MobileNavProps) {
  const pathname = usePathname()
  const [expanded, setExpanded] = useState(false)

  const primaryItems = navItems.slice(0, 4)
  const overflowItems = navItems.slice(4)
  const hasOverflow = overflowItems.length > 0

  // Always collapse tray when nav hides
  if (hidden && expanded) setExpanded(false)

  return (
    <>
      {/* ── Overflow tray — sits flush above nav bar ───────────────── */}
      {hasOverflow && expanded && (
        <>
          {/* Backdrop */}
          <div
            className="fixed inset-0 z-40"
            onClick={() => setExpanded(false)}
          />
          {/* Tray panel — anchored above nav */}
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
                    className="flex flex-col items-center justify-center gap-1 rounded-xl px-2 py-3 transition-colors active:bg-white/10"
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

      {/* ── Bottom nav bar ────────────────────────────────────────── */}
      <nav
        className={cn(
          // Safe area padding (handles notch/home indicator)
          "bottom-nav-safe",
          // Positioning + styling
          "fixed bottom-0 left-0 right-0 z-50",
          "border-t border-white/10 bg-background/95 backdrop-blur-lg",
          // Smooth slide-down hide
          "transition-transform duration-300 ease-in-out",
          hidden ? "translate-y-full" : "translate-y-0",
          className
        )}
      >
        <ul
          className="flex items-stretch"
          style={{ height: `${NAV_H}px` }}
        >
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
                  className="flex h-full flex-col items-center justify-center gap-[3px]"
                >
                  <div className="relative">
                    <item.icon
                      className={cn(
                        "h-[18px] w-[18px]",
                        isActive ? "text-primary" : "text-muted-foreground/70"
                      )}
                    />
                    {showBadge && (
                      <span className="absolute -top-1 -right-1 h-3.5 min-w-3.5 flex items-center justify-center rounded-full bg-primary text-primary-foreground text-[9px] font-semibold px-0.5">
                        {pendingCount}
                      </span>
                    )}
                  </div>
                  <span
                    className={cn(
                      "text-[9px] font-medium leading-none",
                      isActive ? "text-primary" : "text-muted-foreground/70"
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
                className="flex h-full w-full flex-col items-center justify-center gap-[3px]"
              >
                <div className="relative">
                  <ChevronUp
                    className={cn(
                      "h-[18px] w-[18px] transition-transform duration-200",
                      expanded ? "rotate-180 text-primary" : "text-muted-foreground/70"
                    )}
                  />
                  {!expanded &&
                    overflowItems.some(
                      (i) => i.label === "Requests" && pendingCount && pendingCount > 0
                    ) && (
                      <span className="absolute -top-0.5 -right-0.5 h-2 w-2 rounded-full bg-primary" />
                    )}
                </div>
                <span
                  className={cn(
                    "text-[9px] font-medium leading-none",
                    expanded ? "text-primary" : "text-muted-foreground/70"
                  )}
                >
                  More
                </span>
              </button>
            </li>
          )}
        </ul>
      </nav>
    </>
  )
}
