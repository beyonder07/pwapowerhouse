"use client"

import { cn } from "@/lib/utils"
import type { ReactNode } from "react"

type KnownStatus =
  | "active"
  | "inactive"
  | "pending"
  | "expired"
  | "approved"
  | "rejected"
  | "warning"
  | "success"
  | "error"
  | "info"
  | "neutral"
  | "completed"
  | "failed"

interface StatusPillProps {
  status: KnownStatus | string
  label?: string
  children?: ReactNode
  pulse?: boolean
  size?: "sm" | "md"
  className?: string
}

const statusStyles: Record<KnownStatus, string> = {
  active: "bg-emerald-500/20 text-emerald-400 border-emerald-500/30",
  inactive: "bg-slate-500/20 text-slate-300 border-slate-500/30",
  pending: "bg-amber-500/20 text-amber-400 border-amber-500/30",
  expired: "bg-red-500/20 text-red-400 border-red-500/30",
  approved: "bg-emerald-500/20 text-emerald-400 border-emerald-500/30",
  rejected: "bg-red-500/20 text-red-400 border-red-500/30",
  warning: "bg-amber-500/20 text-amber-400 border-amber-500/30",
  success: "bg-emerald-500/20 text-emerald-400 border-emerald-500/30",
  error: "bg-red-500/20 text-red-400 border-red-500/30",
  info: "bg-sky-500/20 text-sky-300 border-sky-500/30",
  neutral: "bg-slate-500/20 text-slate-300 border-slate-500/30",
  completed: "bg-emerald-500/20 text-emerald-400 border-emerald-500/30",
  failed: "bg-red-500/20 text-red-400 border-red-500/30",
}

const statusLabels: Record<KnownStatus, string> = {
  active: "Active",
  inactive: "Inactive",
  pending: "Pending",
  expired: "Expired",
  approved: "Approved",
  rejected: "Rejected",
  warning: "Warning",
  success: "Success",
  error: "Error",
  info: "Info",
  neutral: "Neutral",
  completed: "Completed",
  failed: "Failed",
}

export function StatusPill({
  status,
  label,
  children,
  pulse,
  size = "md",
  className,
}: StatusPillProps) {
  const dotClass =
    status === "active" ||
    status === "approved" ||
    status === "success" ||
    status === "completed"
      ? "bg-emerald-400"
      : status === "pending" || status === "warning"
        ? "bg-amber-400"
        : status === "info"
          ? "bg-sky-300"
          : status === "neutral" || status === "inactive"
            ? "bg-slate-300"
            : "bg-red-400"

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border text-xs font-medium",
        size === "sm" ? "px-2 py-0.5" : "px-2.5 py-0.5",
        statusStyles[status as KnownStatus] ?? statusStyles.neutral,
        pulse && "animate-pulse-subtle",
        className
      )}
    >
      <span className={cn("h-1.5 w-1.5 rounded-full", dotClass)} />
      {children ?? label ?? statusLabels[status as KnownStatus] ?? status}
    </span>
  )
}
