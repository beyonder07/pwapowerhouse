"use client"

import { cn } from "@/lib/utils"
import { motion } from "framer-motion"
import { StatusPill } from "./status-pill"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import { MoreHorizontal, Phone, Calendar } from "lucide-react"
import Link from "next/link"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"

interface MemberCardProps {
  name: string
  phone?: string
  email?: string
  avatar?: string | null
  branch?: string
  status: "active" | "expired" | "pending" | "inactive"
  expiryDate?: string
  feePlan?: string
  memberSince?: string
  plan?: string
  href?: string
  stats?: { label: string; value: string | number }[]
  onEdit?: () => void
  onViewDetails?: () => void
  className?: string
}

export function MemberCard({
  name,
  phone,
  avatar,
  branch,
  status,
  expiryDate,
  feePlan,
  memberSince,
  plan,
  href,
  stats,
  onEdit,
  onViewDetails,
  className,
}: MemberCardProps) {
  const initials = name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2)

  const card = (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className={cn(
        "rounded-xl border border-border bg-card p-4 card-hover",
        className
      )}
    >
      <div className="flex items-start gap-3">
        <Avatar className="h-12 w-12 border-2 border-border">
          <AvatarImage src={avatar ?? undefined} alt={name} />
          <AvatarFallback className="bg-primary/10 text-primary font-semibold">
            {initials}
          </AvatarFallback>
        </Avatar>
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              <h3 className="font-semibold text-foreground truncate">{name}</h3>
              {phone && (
                <p className="flex items-center gap-1 text-xs text-muted-foreground mt-0.5">
                  <Phone className="h-3 w-3" />
                  {phone}
                </p>
              )}
            </div>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="h-8 w-8 flex-shrink-0">
                  <MoreHorizontal className="h-4 w-4" />
                  <span className="sr-only">More options</span>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="bg-card border-border">
                {onViewDetails && (
                  <DropdownMenuItem onClick={onViewDetails}>
                    View Details
                  </DropdownMenuItem>
                )}
                {onEdit && (
                  <DropdownMenuItem onClick={onEdit}>Edit Member</DropdownMenuItem>
                )}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
          <div className="flex flex-wrap items-center gap-2 mt-2">
            <StatusPill status={status} />
            {branch && (
              <span className="text-xs text-muted-foreground bg-secondary px-2 py-0.5 rounded">
                {branch}
              </span>
            )}
          </div>
          <div className="flex items-center gap-3 mt-2 text-xs text-muted-foreground">
            {expiryDate && (
              <span className="flex items-center gap-1">
                <Calendar className="h-3 w-3" />
                Expires: {expiryDate}
              </span>
            )}
            {feePlan && <span>Rs. {feePlan}/mo</span>}
            {memberSince && <span>Since {memberSince}</span>}
            {plan && <span>{plan}</span>}
          </div>
          {stats && stats.length > 0 && (
            <div className="mt-3 grid grid-cols-2 gap-2 border-t border-border pt-3">
              {stats.map((stat) => (
                <div key={stat.label}>
                  <p className="text-[10px] uppercase tracking-wide text-muted-foreground">
                    {stat.label}
                  </p>
                  <p className="text-sm font-semibold text-foreground">{stat.value}</p>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </motion.div>
  )

  if (href) {
    return (
      <Link href={href} className="block">
        {card}
      </Link>
    )
  }

  return card
}
