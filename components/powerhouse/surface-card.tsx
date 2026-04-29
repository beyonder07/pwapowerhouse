"use client"

import { cn } from "@/lib/utils"
import { motion, type HTMLMotionProps } from "framer-motion"
import { forwardRef } from "react"

interface SurfaceCardProps extends HTMLMotionProps<"div"> {
  elevated?: boolean
  interactive?: boolean
  glow?: boolean
}

export const SurfaceCard = forwardRef<HTMLDivElement, SurfaceCardProps>(
  ({ className, elevated, interactive, glow, children, ...props }, ref) => {
    return (
      <motion.div
        ref={ref}
        className={cn(
          "rounded-xl border border-border p-4",
          elevated ? "bg-ph-surface-elevated" : "bg-card",
          interactive && "card-hover cursor-pointer",
          glow && "glow-red-subtle",
          className
        )}
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
        {...props}
      >
        {children}
      </motion.div>
    )
  }
)

SurfaceCard.displayName = "SurfaceCard"
