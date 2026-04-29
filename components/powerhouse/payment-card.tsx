"use client"

import { cn } from "@/lib/utils"
import { motion } from "framer-motion"
import { StatusPill } from "./status-pill"
import { Button } from "@/components/ui/button"
import {
  CreditCard,
  Banknote,
  Smartphone,
  Image as ImageIcon,
  Check,
  X,
} from "lucide-react"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"

type PaymentMode = "cash" | "upi" | "card" | "bank"
type SavedCardType = "visa" | "mastercard"

interface PaymentCardProps {
  memberName?: string
  amount?: number
  date?: string
  mode?: PaymentMode
  status?: "approved" | "pending" | "rejected"
  screenshot?: string
  branch?: string
  onApprove?: () => void
  onReject?: () => void
  type?: SavedCardType
  last4?: string
  expiryMonth?: string
  expiryYear?: string
  isDefault?: boolean
  onSetDefault?: () => void
  onRemove?: () => void
  className?: string
}

const modeIcons: Record<PaymentMode, typeof CreditCard> = {
  cash: Banknote,
  upi: Smartphone,
  card: CreditCard,
  bank: CreditCard,
}

const modeLabels: Record<PaymentMode, string> = {
  cash: "Cash",
  upi: "UPI",
  card: "Card",
  bank: "Bank Transfer",
}

export function PaymentCard({
  memberName,
  amount,
  date,
  mode = "card",
  status = "pending",
  screenshot,
  branch,
  onApprove,
  onReject,
  type,
  last4,
  expiryMonth,
  expiryYear,
  isDefault,
  onSetDefault,
  onRemove,
  className,
}: PaymentCardProps) {
  const ModeIcon = modeIcons[mode]

  if (last4 && type) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className={cn("rounded-xl border border-border bg-card p-4", className)}
      >
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-start gap-3">
            <div className="rounded-lg bg-secondary p-2">
              <CreditCard className="h-5 w-5 text-primary" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-semibold text-foreground uppercase">{type}</h3>
                {isDefault && <StatusPill status="success" label="Default" size="sm" />}
              </div>
              <p className="mt-1 text-sm text-muted-foreground">
                Ending in {last4}
              </p>
              <p className="text-xs text-muted-foreground">
                Expires {expiryMonth}/{expiryYear}
              </p>
            </div>
          </div>
        </div>

        <div className="mt-4 flex gap-2 border-t border-border pt-4">
          {!isDefault && onSetDefault && (
            <Button variant="outline" size="sm" onClick={onSetDefault} className="flex-1">
              Set Default
            </Button>
          )}
          {onRemove && (
            <Button
              variant="outline"
              size="sm"
              onClick={onRemove}
              className="flex-1 border-red-500/50 text-red-400 hover:bg-red-500/10"
            >
              Remove
            </Button>
          )}
        </div>
      </motion.div>
    )
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className={cn(
        "rounded-xl border border-border bg-card p-4",
        className
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <h3 className="font-semibold text-foreground truncate">{memberName}</h3>
            <StatusPill status={status} />
          </div>
          <p className="text-2xl font-bold text-foreground mt-1">
            Rs. {(amount ?? 0).toLocaleString()}
          </p>
          <div className="flex flex-wrap items-center gap-3 mt-2 text-xs text-muted-foreground">
            <span>{date}</span>
            <span className="flex items-center gap-1">
              <ModeIcon className="h-3 w-3" />
              {modeLabels[mode]}
            </span>
            {branch && (
              <span className="bg-secondary px-2 py-0.5 rounded">{branch}</span>
            )}
          </div>
        </div>
        {screenshot && mode !== "cash" && (
          <Dialog>
            <DialogTrigger asChild>
              <Button variant="outline" size="sm" className="flex-shrink-0">
                <ImageIcon className="h-4 w-4 mr-1" />
                Receipt
              </Button>
            </DialogTrigger>
            <DialogContent className="bg-card border-border">
              <DialogHeader>
                <DialogTitle>Payment Screenshot</DialogTitle>
              </DialogHeader>
              <div className="relative aspect-[3/4] w-full rounded-lg overflow-hidden bg-secondary">
                <img
                  src={screenshot}
                  alt="Payment receipt"
                  className="object-contain w-full h-full"
                />
              </div>
            </DialogContent>
          </Dialog>
        )}
      </div>
      {status === "pending" && (onApprove || onReject) && (
        <div className="flex items-center gap-2 mt-4 pt-4 border-t border-border">
          {onApprove && (
            <Button
              size="sm"
              onClick={onApprove}
              className="flex-1 bg-emerald-600 hover:bg-emerald-700"
            >
              <Check className="h-4 w-4 mr-1" />
              Approve
            </Button>
          )}
          {onReject && (
            <Button
              size="sm"
              variant="outline"
              onClick={onReject}
              className="flex-1 border-red-500/50 text-red-400 hover:bg-red-500/10"
            >
              <X className="h-4 w-4 mr-1" />
              Reject
            </Button>
          )}
        </div>
      )}
    </motion.div>
  )
}
