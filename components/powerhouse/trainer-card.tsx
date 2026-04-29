"use client"

import { cn } from "@/lib/utils"
import { motion } from "framer-motion"
import { StatusPill } from "./status-pill"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import { MoreHorizontal, Users, Award } from "lucide-react"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"

interface TrainerCardProps {
  name: string
  avatar?: string
  specialization?: string
  experience?: string
  branch?: string
  status: "active" | "pending"
  assignedMembers?: number
  salary?: number
  onEdit?: () => void
  onViewDetails?: () => void
  className?: string
}

export function TrainerCard({
  name,
  avatar,
  specialization,
  experience,
  branch,
  status,
  assignedMembers,
  salary,
  onEdit,
  onViewDetails,
  className,
}: TrainerCardProps) {
  const initials = name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2)

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className={cn(
        "rounded-xl border border-border bg-card p-4 card-hover",
        className
      )}
    >
      <div className="flex items-start gap-3">
        <Avatar className="h-14 w-14 border-2 border-primary/30">
          <AvatarImage src={avatar} alt={name} />
          <AvatarFallback className="bg-primary/10 text-primary font-semibold">
            {initials}
          </AvatarFallback>
        </Avatar>
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              <h3 className="font-semibold text-foreground truncate">{name}</h3>
              {specialization && (
                <p className="flex items-center gap-1 text-xs text-primary mt-0.5">
                  <Award className="h-3 w-3" />
                  {specialization}
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
                  <DropdownMenuItem onClick={onEdit}>Edit Trainer</DropdownMenuItem>
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
            {experience && <span>{experience} exp</span>}
            {assignedMembers !== undefined && (
              <span className="flex items-center gap-1">
                <Users className="h-3 w-3" />
                {assignedMembers} members
              </span>
            )}
            {salary !== undefined && <span>Rs. {salary.toLocaleString()}/mo</span>}
          </div>
        </div>
      </div>
    </motion.div>
  )
}
