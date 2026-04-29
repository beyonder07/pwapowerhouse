"use client"

import { cn } from "@/lib/utils"
import { motion } from "framer-motion"
import type { LucideIcon } from "lucide-react"

interface MetricCardProps {
  label?: string
  title?: string
  value: string | number
  subValue?: string
  subtitle?: string
  icon?: LucideIcon
  trend?: {
    value: number
    positive?: boolean
    isPositive?: boolean
  }
  className?: string
  accentColor?: "red" | "green" | "amber" | "default"
}

const accentStyles = {
  red: "border-l-primary",
  green: "border-l-emerald-500",
  amber: "border-l-amber-500",
  default: "border-l-border",
}

export function MetricCard({
  label,
  title,
  value,
  subValue,
  subtitle,
  icon: Icon,
  trend,
  className,
  accentColor = "default",
}: MetricCardProps) {
  const displayLabel = label ?? title ?? ""
  const displaySubValue = subValue ?? subtitle
  const trendPositive = trend?.positive ?? trend?.isPositive

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className={cn(
        "relative overflow-hidden rounded-xl border border-border bg-card p-4 border-l-4",
        accentStyles[accentColor],
        className
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide truncate">
            {displayLabel}
          </p>
          <p className="mt-1.5 text-2xl font-bold text-foreground tabular-nums">
            {value}
          </p>
          {displaySubValue && (
            <p className="mt-0.5 text-xs text-muted-foreground">{displaySubValue}</p>
          )}
          {trend && (
            <p
              className={cn(
                "mt-1 text-xs font-medium",
                trendPositive ? "text-emerald-400" : "text-red-400"
              )}
            >
              {trendPositive ? "+" : ""}
              {trend.value}%
            </p>
          )}
        </div>
        {Icon && (
          <div className="flex-shrink-0 rounded-lg bg-secondary p-2">
            <Icon className="h-5 w-5 text-primary" />
          </div>
        )}
      </div>
    </motion.div>
  )
}

interface MetricGridProps {
  children: React.ReactNode
  columns?: 2 | 3 | 4
  className?: string
}

export function MetricGrid({ children, columns = 2, className }: MetricGridProps) {
  return (
    <div
      className={cn(
        "grid gap-3",
        columns === 2 && "grid-cols-2",
        columns === 3 && "grid-cols-2 lg:grid-cols-3",
        columns === 4 && "grid-cols-2 lg:grid-cols-4",
        className
      )}
    >
      {children}
    </div>
  )
}
