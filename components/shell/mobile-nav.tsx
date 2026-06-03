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

const NAV_H = 64 // must match --mobile-nav-height in globals.css

export function MobileNav({ navItems, pendingCount, hidden = false, className }: MobileNavProps) {
  const pathname = usePathname()
  const [expanded, setExpanded] = useState(false)
  const [isCollapsed, setIsCollapsed] = useState(false)

  const primaryItems = navItems.slice(0, 4)
  const overflowItems = navItems.slice(4)
  const hasOverflow = overflowItems.length > 0

  if (hidden && expanded) setExpanded(false)
  if (hidden && isCollapsed) setIsCollapsed(false)

  const isActive = (href: string) =>
    pathname === href || (href.split("/").length > 2 && pathname.startsWith(href))

  const showBadge = (item: NavItem) =>
    typeof item.badge === "number"
      ? item.badge > 0
      : (item.label === "Requests" && pendingCount && pendingCount > 0)

  const getBadgeCount = (item: NavItem) =>
    typeof item.badge === "number" ? item.badge : pendingCount

  return (
    <>
      {/* ── Overflow tray ────────────────────────────────────────────── */}
      {hasOverflow && expanded && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setExpanded(false)} />
          <div
            className="fixed left-0 right-0 z-40 border-t border-white/10 bg-background/98 backdrop-blur-xl"
            style={{ bottom: `calc(${NAV_H}px + env(safe-area-inset-bottom, 0px))` }}
            onClick={e => e.stopPropagation()}
          >
            <div className="grid grid-cols-4 gap-0 px-2 py-3">
              {overflowItems.map(item => {
                const active = isActive(item.href)
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={() => setExpanded(false)}
                    className="flex flex-col items-center justify-center gap-1.5 rounded-xl px-2 py-3 transition-colors active:bg-white/10"
                  >
                    <div className="relative">
                      <item.icon className={cn("h-5 w-5", active ? "text-primary" : "text-muted-foreground")} />
                      {showBadge(item) && (
                        <span className="absolute -top-1 -right-1 h-4 min-w-4 flex items-center justify-center rounded-full bg-primary text-primary-foreground text-[10px] font-semibold px-1">
                          {getBadgeCount(item)}
                        </span>
                      )}
                    </div>
                    <span className={cn("text-[10px] font-medium leading-none", active ? "text-primary" : "text-muted-foreground")}>
                      {item.label}
                    </span>
                  </Link>
                )
              })}
            </div>
          </div>
        </>
      )}

      {/* Collapse/Expand Toggle Tab (Visible on mobile only) */}
      {!hidden && (
        <button
          onClick={() => {
            if (!isCollapsed) setExpanded(false)
            setIsCollapsed(v => !v)
          }}
          className={cn(
            "fixed right-4 z-50 flex h-7 w-12 items-center justify-center rounded-t-xl border border-b-0 border-white/10 bg-background/98 backdrop-blur-lg text-muted-foreground/80 transition-all duration-300 shadow-md",
            isCollapsed 
              ? "bottom-0 rounded-b-none border-b" 
              : "bottom-[calc(64px+env(safe-area-inset-bottom,0px))]"
          )}
          aria-label={isCollapsed ? "Expand navigation" : "Collapse navigation"}
        >
          <ChevronUp className={cn("h-4 w-4 transition-transform duration-300", isCollapsed ? "" : "rotate-180")} />
        </button>
      )}

      {/* ── Bottom nav bar ───────────────────────────────────────────── */}
      <nav
        className={cn(
          "fixed bottom-0 left-0 right-0 z-50",
          "border-t border-white/10 bg-background/96 backdrop-blur-lg",
          "transition-transform duration-300 ease-in-out",
          (hidden || isCollapsed) ? "translate-y-full" : "translate-y-0",
          className
        )}
        // Safe area padding handled inline so it's always exact
        style={{ paddingBottom: "env(safe-area-inset-bottom, 0px)" }}
      >
        <ul className="flex items-stretch" style={{ height: `${NAV_H}px` }}>
          {primaryItems.map(item => {
            const active = isActive(item.href)
            return (
              <li key={item.href} className="flex-1">
                <Link
                  href={item.href}
                  className="flex h-full flex-col items-center justify-center gap-1"
                >
                  <div className="relative">
                    <item.icon className={cn("h-5 w-5", active ? "text-primary" : "text-muted-foreground/70")} />
                    {showBadge(item) && (
                      <span className="absolute -top-1 -right-1 h-3.5 min-w-3.5 flex items-center justify-center rounded-full bg-primary text-primary-foreground text-[9px] font-semibold px-0.5">
                        {getBadgeCount(item)}
                      </span>
                    )}
                  </div>
                  {/* Active indicator dot */}
                  {active
                    ? <span className="h-1 w-1 rounded-full bg-primary" />
                    : <span className={cn("text-[10px] font-medium leading-none text-muted-foreground/70")}>
                        {item.label}
                      </span>
                  }
                </Link>
              </li>
            )
          })}

          {/* More button */}
          {hasOverflow && (
            <li className="flex-1">
              <button
                onClick={() => setExpanded(v => !v)}
                className="flex h-full w-full flex-col items-center justify-center gap-1"
              >
                <div className="relative">
                  <ChevronUp className={cn(
                    "h-5 w-5 transition-transform duration-200",
                    expanded ? "rotate-180 text-primary" : "text-muted-foreground/70"
                  )} />
                  {!expanded && overflowItems.some(i => showBadge(i)) && (
                    <span className="absolute -top-0.5 -right-0.5 h-2 w-2 rounded-full bg-primary" />
                  )}
                </div>
                <span className={cn("text-[10px] font-medium leading-none", expanded ? "text-primary" : "text-muted-foreground/70")}>
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
