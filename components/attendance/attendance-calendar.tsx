"use client"

import { useEffect, useMemo, useState } from "react"
import { 
  format, 
  startOfMonth, 
  endOfMonth, 
  eachDayOfInterval, 
  isSameDay, 
  isToday,
  startOfWeek,
  endOfWeek,
  isFuture
} from "date-fns"
import { cn } from "@/lib/utils"
import { SurfaceCard } from "@/components/powerhouse"
import { Flame, Loader2 } from "lucide-react"

interface AttendanceRecord {
  date: string
  status: "present" | "absent" | string
}

interface AttendanceCalendarProps {
  history?: AttendanceRecord[]
  streak?: number
  isLoading?: boolean
}

export function AttendanceCalendar({ 
  history: initialHistory, 
  streak = 0, 
  isLoading: initialLoading = false 
}: AttendanceCalendarProps) {
  const [history, setHistory] = useState<AttendanceRecord[]>(initialHistory || [])
  const [isLoading, setIsLoading] = useState(!initialHistory)
  const now = new Date()

  // Self-fetch history if not provided
  useEffect(() => {
    if (initialHistory) {
      setHistory(initialHistory)
      setIsLoading(false)
      return
    }

    async function loadHistory() {
      try {
        const year = now.getFullYear()
        const month = now.getMonth() + 1
        const response = await fetch(`/api/attendance/history?year=${year}&month=${month}`, {
          credentials: "include",
        })
        const result = await response.json()
        if (result.success) {
          setHistory(result.data || [])
        } else {
          throw new Error(result.error || "Failed to load history")
        }
      } catch (error) {
        console.error("Failed to load calendar history", error)
      } finally {
        setIsLoading(false)
      }
    }

    loadHistory()
  }, [initialHistory])

  const days = useMemo(() => {
    const start = startOfWeek(startOfMonth(now))
    const end = endOfWeek(endOfMonth(now))
    return eachDayOfInterval({ start, end })
  }, [])

  const getDayStatus = (day: Date) => {
    if (!history) return null
    const record = history.find((r) => isSameDay(new Date(r.date), day))
    if (!record) return null
    return "present" // All history records in this schema are presence logs
  }

  return (
    <SurfaceCard className="overflow-hidden h-full">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h3 className="text-lg font-bold text-foreground">Attendance</h3>
          <p className="text-sm text-muted-foreground">{format(now, "MMMM yyyy")}</p>
        </div>
        
        {isLoading ? (
          <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
        ) : streak > 0 ? (
          <div className="flex items-center gap-2 bg-emerald-500/10 px-3 py-1.5 rounded-full border border-emerald-500/20">
            <Flame className="h-4 w-4 text-emerald-500 animate-pulse" />
            <span className="text-sm font-bold text-emerald-500">{streak} Day Streak</span>
          </div>
        ) : null}
      </div>

      <div className="grid grid-cols-7 gap-1.5 sm:gap-2">
        {["S", "M", "T", "W", "T", "F", "S"].map((day, idx) => (
          <div key={idx} className="text-[10px] uppercase font-bold text-muted-foreground text-center mb-1">
            {day}
          </div>
        ))}
        
        {days.map((day, i) => {
          const status = getDayStatus(day)
          const isCurrentMonth = day.getMonth() === now.getMonth()
          const isFutureDay = isFuture(day) && !isToday(day)
          
          return (
            <div
              key={i}
              className={cn(
                "relative aspect-square flex items-center justify-center rounded-lg text-xs font-medium transition-all duration-300",
                !isCurrentMonth && "opacity-20",
                isLoading && "animate-pulse bg-muted/50",
                !status && !isFutureDay && isCurrentMonth && "border border-dashed border-muted-foreground/30 text-muted-foreground",
                status === "present" && "bg-emerald-500 text-white shadow-lg shadow-emerald-500/20 scale-105 z-10",
                isToday(day) && !status && "border-2 border-emerald-500 ring-2 ring-emerald-500/20"
              )}
            >
              {format(day, "d")}
              {isToday(day) && (
                <div className="absolute -top-1 -right-1 w-2 h-2 bg-emerald-500 rounded-full ring-2 ring-background" />
              )}
            </div>
          )
        })}
      </div>

      <div className="mt-6 flex flex-wrap items-center gap-x-4 gap-y-2 text-[10px] font-bold uppercase tracking-wider text-muted-foreground border-t border-border/50 pt-4">
        <div className="flex items-center gap-1.5">
          <div className="w-2.5 h-2.5 rounded-sm bg-emerald-500" />
          <span>Present</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-2.5 h-2.5 rounded-sm border border-dashed border-muted-foreground/50" />
          <span>No Data</span>
        </div>
      </div>
    </SurfaceCard>
  )
}
