"use client"

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"

interface ConfirmDialogProps {
  open?: boolean
  isOpen?: boolean
  onOpenChange?: (open: boolean) => void
  onCancel?: () => void
  title: string
  description: string
  confirmLabel?: string
  confirmText?: string
  cancelLabel?: string
  onConfirm: () => void
  destructive?: boolean
  isDestructive?: boolean
  variant?: "destructive" | "default" | string
  loading?: boolean
}

export function ConfirmDialog({
  open,
  isOpen,
  onOpenChange,
  onCancel,
  title,
  description,
  confirmLabel = "Confirm",
  confirmText,
  cancelLabel = "Cancel",
  onConfirm,
  destructive,
  isDestructive,
  variant,
  loading,
}: ConfirmDialogProps) {
  const finalOpen = open ?? isOpen ?? false
  const finalDestructive = destructive ?? isDestructive ?? variant === "destructive"
  const handleOpenChange = (nextOpen: boolean) => {
    onOpenChange?.(nextOpen)
    if (!nextOpen) onCancel?.()
  }

  return (
    <AlertDialog open={finalOpen} onOpenChange={handleOpenChange}>
      <AlertDialogContent className="bg-card border-border">
        <AlertDialogHeader>
          <AlertDialogTitle className="text-foreground">{title}</AlertDialogTitle>
          <AlertDialogDescription className="text-muted-foreground">
            {description}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel
            className="bg-secondary border-border text-foreground"
            disabled={loading}
          >
            {cancelLabel}
          </AlertDialogCancel>
          <AlertDialogAction
            onClick={onConfirm}
            disabled={loading}
            className={finalDestructive ? "bg-destructive hover:bg-destructive/90" : ""}
          >
            {loading ? "Processing..." : confirmText ?? confirmLabel}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
