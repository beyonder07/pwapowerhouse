"use client"

import { useState } from "react"
import { MapPin, Loader2, CheckCircle2, LogOut } from "lucide-react"
import { Button } from "@/components/ui/button"
import { toast } from "sonner"
import { cn } from "@/lib/utils"

interface Props {
  gymRadius: number
  isCheckedIn: boolean
  isCheckedOut: boolean
  onSuccess?: () => void
}

export function AttendanceCheckIn({ gymRadius, isCheckedIn, isCheckedOut, onSuccess }: Props) {
  const [isLoading, setIsLoading] = useState(false)

  async function handleAction() {
    if (!navigator.geolocation) {
      toast.error("Geolocation not supported")
      return
    }

    setIsLoading(true)
    navigator.geolocation.getCurrentPosition(
      async (position) => {
        try {
          const response = await fetch("/api/attendance/check-in", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              "Idempotency-Key": crypto.randomUUID(),
            },
            credentials: "include",
            body: JSON.stringify({
              latitude: position.coords.latitude,
              longitude: position.coords.longitude,
              clientTimestamp: new Date().toISOString(),
            }),
          })

          const result = await response.json()

          if (!response.ok || !result.success) {
            throw new Error(result.error || "Action failed")
          }

          const actionLabel = result.data?.action === "check_out" ? "Checked out" : "Checked in"
          toast.success(actionLabel, {
            description: "Your session has been updated."
          })

          if (onSuccess) onSuccess()
        } catch (error: any) {
          toast.error("Action failed", { description: error.message })
        } finally {
          setIsLoading(false)
        }
      },
      (error) => {
        toast.error("Location access required", { description: error.message })
        setIsLoading(false)
      }
    )
  }

  if (isCheckedOut) {
    return (
      <div className="flex items-center justify-between p-4 bg-emerald-500/10 border border-emerald-500/20 rounded-xl">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-full bg-emerald-500/20 flex items-center justify-center">
            <CheckCircle2 className="h-6 w-6 text-emerald-500" />
          </div>
          <div>
            <p className="font-semibold text-emerald-500">Session Completed</p>
            <p className="text-xs text-muted-foreground">You have checked out for today. See you tomorrow!</p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className={cn(
      "relative overflow-hidden rounded-xl border p-4 transition-all duration-300",
      isCheckedIn ? "bg-amber-500/5 border-amber-500/20" : "bg-primary/5 border-primary/20"
    )}>
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <h3 className={cn("font-bold text-lg", isCheckedIn ? "text-amber-500" : "text-primary")}>
              GPS Attendance
            </h3>
            {isCheckedIn && (
              <span className="px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-500 text-[10px] font-bold uppercase tracking-wider">
                Checked In
              </span>
            )}
          </div>
          <p className="text-xs text-muted-foreground leading-relaxed max-w-md">
            {isCheckedIn 
              ? "Don't forget to check out before you leave the gym premises."
              : `Check in only when you are inside your assigned branch radius (${gymRadius}m).`}
          </p>
        </div>

        <Button
          size="lg"
          className={cn(
            "h-12 px-8 font-bold shadow-lg transition-all active:scale-95",
            isCheckedIn ? "bg-amber-500 hover:bg-amber-600 text-white" : "bg-primary hover:bg-primary/90"
          )}
          onClick={handleAction}
          disabled={isLoading}
        >
          {isLoading ? (
            <Loader2 className="mr-2 h-5 w-5 animate-spin" />
          ) : isCheckedIn ? (
            <LogOut className="mr-2 h-5 w-5" />
          ) : (
            <MapPin className="mr-2 h-5 w-5" />
          )}
          {isCheckedIn ? "Check Out Now" : "Mark Attendance"}
        </Button>
      </div>
    </div>
  )
}
