"use client"

import { cn } from "@/lib/utils"
import { motion } from "framer-motion"

interface PageIntroProps {
  title: string
  description?: string
  subtitle?: string
  badge?: string
  action?: React.ReactNode
  className?: string
}

export function PageIntro({
  title,
  description,
  subtitle,
  badge,
  action,
  className,
}: PageIntroProps) {
  const supportingText = description ?? subtitle

  return (
    <motion.div
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className={cn("mb-6", className)}
    >
      <div className="flex items-start justify-between gap-4">
        <div>
          {badge && (
            <span className="inline-block mb-1.5 text-xs font-medium text-primary uppercase tracking-wider">
              {badge}
            </span>
          )}
          <h1 className="text-2xl font-bold text-foreground">{title}</h1>
          {supportingText && (
            <p className="mt-1 text-sm text-muted-foreground">{supportingText}</p>
          )}
        </div>
        {action && <div className="flex-shrink-0">{action}</div>}
      </div>
    </motion.div>
  )
}
