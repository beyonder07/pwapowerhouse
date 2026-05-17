"use client"

import { useEffect, useState } from "react"
import { Loader2, Users, CheckCircle2, XCircle } from "lucide-react"
import { toast } from "sonner"
import { EmptyState, PageIntro, StatusPill, SurfaceCard } from "@/components/powerhouse"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"

interface TrainerInfo {
  id: string
  name: string
  email: string | null
  avatarUrl: string | null
  specialization: string | null
  experience: string | null
  presentToday: boolean
  joinDate: string
}

function initials(name: string) {
  return name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("")
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat("en-IN", { dateStyle: "medium" }).format(
    new Date(value)
  )
}

export default function ClientTrainersPage() {
  const [trainers, setTrainers] = useState<TrainerInfo[]>([])
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    let mounted = true

    async function loadTrainers() {
      try {
        const response = await fetch("/api/client/trainer", {
          credentials: "include",
          cache: "no-store",
        })
        const result = await response.json()

        if (!response.ok || !result.success) {
          throw new Error(result.error || "Unable to load trainers")
        }

        if (mounted) setTrainers(result.data.trainers)
      } catch (error) {
        toast.error("Trainers unavailable", {
          description:
            error instanceof Error ? error.message : "Please refresh and try again.",
        })
      } finally {
        if (mounted) setIsLoading(false)
      }
    }

    loadTrainers()
    return () => {
      mounted = false
    }
  }, [])

  if (isLoading) {
    return (
      <div className="space-y-5">
        <PageIntro
          title="My Trainers"
          description="Trainers assigned to your gym branch"
        />
        <div className="flex h-48 items-center justify-center rounded-xl border border-border bg-card">
          <Loader2 className="h-6 w-6 animate-spin text-primary" />
        </div>
      </div>
    )
  }

  if (trainers.length === 0) {
    return (
      <div className="space-y-5">
        <PageIntro
          title="My Trainers"
          description="Trainers assigned to your gym branch"
        />
        <EmptyState
          icon={Users}
          title="No trainers found"
          description="There are no trainers assigned to your branch yet. Contact the gym owner."
        />
      </div>
    )
  }

  const presentCount = trainers.filter((t) => t.presentToday).length

  return (
    <div className="space-y-5">
      <PageIntro
        title="My Trainers"
        description="Trainers assigned to your gym branch"
      />

      {/* Summary */}
      <div className="grid grid-cols-2 gap-3">
        <SurfaceCard>
          <p className="text-xs text-muted-foreground">Total Trainers</p>
          <p className="mt-1 text-3xl font-bold text-foreground">{trainers.length}</p>
        </SurfaceCard>
        <SurfaceCard>
          <p className="text-xs text-muted-foreground">Present Today</p>
          <p className="mt-1 text-3xl font-bold text-emerald-500">{presentCount}</p>
        </SurfaceCard>
      </div>

      {/* Trainer Cards */}
      <div className="grid gap-4 md:grid-cols-2">
        {trainers.map((trainer) => (
          <SurfaceCard key={trainer.id} className="space-y-4">
            <div className="flex items-start gap-3">
              <Avatar className="h-12 w-12 shrink-0">
                <AvatarImage src={trainer.avatarUrl ?? undefined} alt={trainer.name} />
                <AvatarFallback className="bg-primary/10 text-sm font-semibold text-primary">
                  {initials(trainer.name)}
                </AvatarFallback>
              </Avatar>

              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <h2 className="text-base font-semibold text-foreground">
                    {trainer.name}
                  </h2>
                  <StatusPill
                    status={trainer.presentToday ? "success" : "neutral"}
                    label={trainer.presentToday ? "Present Today" : "Absent"}
                    size="sm"
                  />
                </div>
                {trainer.specialization && (
                  <p className="truncate text-sm text-muted-foreground">
                    {trainer.specialization}
                  </p>
                )}
              </div>
            </div>

            <div className="grid gap-2">
              {trainer.experience && (
                <div className="rounded-lg bg-background p-3">
                  <p className="text-xs text-muted-foreground">Experience</p>
                  <p className="mt-0.5 text-sm font-medium text-foreground">
                    {trainer.experience}
                  </p>
                </div>
              )}
              {trainer.email && (
                <div className="rounded-lg bg-background p-3">
                  <p className="text-xs text-muted-foreground">Contact</p>
                  <p className="mt-0.5 truncate text-sm font-medium text-foreground">
                    {trainer.email}
                  </p>
                </div>
              )}
              <div className="rounded-lg bg-background p-3">
                <p className="text-xs text-muted-foreground">Member since</p>
                <p className="mt-0.5 text-sm font-medium text-foreground">
                  {formatDate(trainer.joinDate)}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 border-t border-border pt-3">
              {trainer.presentToday ? (
                <CheckCircle2 className="h-4 w-4 text-emerald-500" />
              ) : (
                <XCircle className="h-4 w-4 text-muted-foreground" />
              )}
              <p className="text-xs text-muted-foreground">
                {trainer.presentToday
                  ? "This trainer has checked in today and is available"
                  : "This trainer has not checked in today"}
              </p>
            </div>
          </SurfaceCard>
        ))}
      </div>
    </div>
  )
}
