"use client"

import { useEffect, useState } from "react"
import {
  CalendarDays,
  Dumbbell,
  Loader2,
  RotateCcw,
  UserRound,
} from "lucide-react"
import { toast } from "sonner"
import { EmptyState, PageIntro, StatusPill, SurfaceCard } from "@/components/powerhouse"

interface WorkoutExercise {
  name: string
  sets: number
  reps: string
  restDuration: string
  notes: string
}

interface WorkoutDay {
  day: string
  exercises: WorkoutExercise[]
}

interface WorkoutPlan {
  id: string
  title: string
  notes: string
  status: "active" | "pending" | "archived"
  split: WorkoutDay[]
  dayCount: number
  exerciseCount: number
  trainerName: string | null
  updatedAt: string
  createdAt: string
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat("en-IN", { dateStyle: "medium" }).format(
    new Date(value)
  )
}

function planStatusTone(status: string) {
  if (status === "active") return "success"
  if (status === "pending") return "warning"
  return "neutral"
}

export default function ClientWorkoutsPage() {
  const [plan, setPlan] = useState<WorkoutPlan | null | undefined>(undefined)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    let mounted = true

    async function loadPlan() {
      try {
        const response = await fetch("/api/client/workouts", {
          credentials: "include",
          cache: "no-store",
        })
        const result = await response.json()

        if (!response.ok || !result.success) {
          throw new Error(result.error || "Unable to load workout plan")
        }

        if (mounted) setPlan(result.data.plan ?? null)
      } catch (error) {
        toast.error("Workout plan unavailable", {
          description:
            error instanceof Error ? error.message : "Please refresh and try again.",
        })
      } finally {
        if (mounted) setIsLoading(false)
      }
    }

    loadPlan()
    return () => {
      mounted = false
    }
  }, [])

  if (isLoading) {
    return (
      <div className="space-y-5">
        <PageIntro
          title="My Workout Plan"
          description="Your personalised trainer-assigned workout program"
        />
        <div className="flex h-48 items-center justify-center rounded-xl border border-border bg-card">
          <Loader2 className="h-6 w-6 animate-spin text-primary" />
        </div>
      </div>
    )
  }

  if (!plan) {
    return (
      <div className="space-y-5">
        <PageIntro
          title="My Workout Plan"
          description="Your personalised trainer-assigned workout program"
        />
        <EmptyState
          icon={Dumbbell}
          title="No workout plan yet"
          description="Your trainer hasn't created a workout plan for you yet. Contact the gym to get started."
        />
      </div>
    )
  }

  return (
    <div className="space-y-5">
      <PageIntro
        title="My Workout Plan"
        description="Your personalised trainer-assigned workout program"
      />

      {/* Plan Header Card */}
      <SurfaceCard>
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="text-xl font-semibold text-foreground">{plan.title}</h2>
              <StatusPill
                status={planStatusTone(plan.status)}
                label={plan.status === "pending" ? "Needs Update" : plan.status}
                size="sm"
              />
            </div>
            {plan.notes && (
              <p className="mt-2 text-sm text-muted-foreground">{plan.notes}</p>
            )}
          </div>
          <div className="flex flex-wrap gap-2 text-xs">
            {plan.trainerName && (
              <div className="flex items-center gap-1 rounded-full border border-border bg-secondary px-3 py-1">
                <UserRound className="h-3 w-3 text-primary" />
                <span className="font-medium text-foreground">{plan.trainerName}</span>
              </div>
            )}
            <div className="flex items-center gap-1 rounded-full border border-border bg-secondary px-3 py-1">
              <CalendarDays className="h-3 w-3 text-muted-foreground" />
              <span className="text-muted-foreground">Updated {formatDate(plan.updatedAt)}</span>
            </div>
          </div>
        </div>

        <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3">
          <div className="rounded-lg bg-background p-3">
            <p className="text-xs text-muted-foreground">Split Days</p>
            <p className="mt-1 text-2xl font-bold text-foreground">{plan.dayCount}</p>
          </div>
          <div className="rounded-lg bg-background p-3">
            <p className="text-xs text-muted-foreground">Total Exercises</p>
            <p className="mt-1 text-2xl font-bold text-foreground">{plan.exerciseCount}</p>
          </div>
          <div className="col-span-2 rounded-lg bg-background p-3 sm:col-span-1">
            <p className="text-xs text-muted-foreground">Plan Status</p>
            <p className="mt-1 text-sm font-semibold capitalize text-foreground">
              {plan.status === "pending" ? "Needs Update" : plan.status}
            </p>
          </div>
        </div>
      </SurfaceCard>

      {/* Day-by-day split */}
      <div className="space-y-4">
        {plan.split.map((day, dayIndex) => (
          <SurfaceCard key={dayIndex}>
            <div className="mb-4 flex items-center justify-between">
              <h3 className="text-base font-semibold text-foreground">{day.day}</h3>
              <span className="text-xs text-muted-foreground">
                {day.exercises.length} exercise{day.exercises.length !== 1 ? "s" : ""}
              </span>
            </div>

            <div className="space-y-3">
              {day.exercises.map((exercise, exerciseIndex) => (
                <div
                  key={exerciseIndex}
                  className="rounded-lg border border-border bg-background p-3"
                >
                  <div className="mb-2 flex items-start justify-between gap-2">
                    <p className="font-medium text-foreground">{exercise.name}</p>
                    <div className="flex shrink-0 gap-2 text-xs">
                      <span className="rounded bg-primary/10 px-2 py-0.5 font-bold text-primary">
                        {exercise.sets} × {exercise.reps}
                      </span>
                    </div>
                  </div>
                  <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
                    <span className="flex items-center gap-1">
                      <RotateCcw className="h-3 w-3" />
                      Rest: {exercise.restDuration}
                    </span>
                    {exercise.notes && (
                      <span className="italic">{exercise.notes}</span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </SurfaceCard>
        ))}
      </div>
    </div>
  )
}
