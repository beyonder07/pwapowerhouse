"use client"

import { UserMinus } from "lucide-react"
import { SurfaceCard } from "@/components/powerhouse"

export function InactiveMembersCard({ count }: { count: number }) {
  return (
    <SurfaceCard>
      <div className="flex items-center justify-between">
        <div>
          <p className="mb-2 text-sm text-muted-foreground">
            Inactive Members
          </p>
          <p className="text-3xl font-bold text-orange-400">{count}</p>
          <p className="mt-1 text-xs text-muted-foreground">
            No attendance in the last 7 days
          </p>
        </div>
        <UserMinus className="h-8 w-8 text-orange-400 opacity-60" />
      </div>
    </SurfaceCard>
  )
}
