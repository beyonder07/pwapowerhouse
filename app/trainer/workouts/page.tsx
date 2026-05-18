"use client"

import { useEffect, useMemo, useState } from "react"
import { useRouter } from "next/navigation"
import { Dumbbell, Edit, Plus, Search, UserRound } from "lucide-react"
import { toast } from "sonner"
import { EmptyState, PageIntro, StatusPill, SurfaceCard } from "@/components/powerhouse"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import type { WorkoutPlan, WorkoutResponse } from "@/lib/trainer/workout-plan"

function formatDate(value: string) {
  return new Intl.DateTimeFormat("en-IN", {
    dateStyle: "medium",
  }).format(new Date(value))
}

function planStatusTone(plan: WorkoutPlan) {
  if (plan.needsUpdate || plan.status === "pending") return "warning"
  if (plan.status === "archived") return "neutral"
  return "success"
}

export default function TrainerWorkoutsPage() {
  const router = useRouter()
  const [plans, setPlans] = useState<WorkoutPlan[]>([])
  const [members, setMembers] = useState<WorkoutResponse["members"]>([])
  const [search, setSearch] = useState("")
  const [isLoading, setIsLoading] = useState(true)

  async function loadWorkouts() {
    try {
      const response = await fetch("/api/trainer/workouts", {
        credentials: "include",
        cache: "no-store",
      })
      const result = await response.json()

      if (!response.ok || !result.success) {
        throw new Error(result.error || "Unable to load workouts")
      }

      const data = result.data as WorkoutResponse
      setPlans(data.plans)
      setMembers(data.members)
    } catch (error) {
      toast.error("Workouts unavailable", {
        description:
          error instanceof Error ? error.message : "Please refresh and try again.",
      })
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    loadWorkouts()
  }, [])

  const filteredPlans = useMemo(() => {
    const term = search.trim().toLowerCase()
    if (!term) return plans

    return plans.filter(
      (plan) =>
        plan.title.toLowerCase().includes(term) ||
        plan.memberName.toLowerCase().includes(term)
    )
  }, [plans, search])

  const openCreate = () => router.push("/trainer/workouts/plan")
  const openEdit = (plan: WorkoutPlan) =>
    router.push(`/trainer/workouts/plan?id=${encodeURIComponent(plan.id)}`)

  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <PageIntro
          title="Workout Plans"
          description="Create and update member workout plans"
        />
        <Button onClick={openCreate} disabled={members.length === 0}>
          <Plus className="mr-2 h-4 w-4" />
          Create Plan
        </Button>
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          placeholder="Search plans or members..."
          className="bg-secondary pl-9"
        />
      </div>

      {isLoading ? (
        <div className="grid gap-4 md:grid-cols-2">
          {Array.from({ length: 4 }).map((_, index) => (
            <div
              key={index}
              className="h-52 animate-pulse rounded-xl border border-border bg-card"
            />
          ))}
        </div>
      ) : filteredPlans.length === 0 ? (
        <EmptyState
          icon={Dumbbell}
          title={search ? "No workout plans found" : "No workout plans yet"}
          description={
            members.length === 0
              ? "Members need to be added before plans can be created."
              : "Create a plan with exercises, sets, reps, rest, and notes."
          }
          action={
            members.length > 0 ? (
              <Button onClick={openCreate}>
                <Plus className="mr-2 h-4 w-4" />
                Create Plan
              </Button>
            ) : undefined
          }
        />
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {filteredPlans.map((plan) => (
            <SurfaceCard key={plan.id} className="space-y-4">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <h2 className="truncate text-lg font-semibold text-foreground">
                    {plan.title}
                  </h2>
                  <p className="flex items-center gap-1 text-sm text-muted-foreground">
                    <UserRound className="h-3.5 w-3.5" />
                    {plan.memberName}
                  </p>
                </div>
                <StatusPill
                  status={planStatusTone(plan)}
                  label={plan.needsUpdate ? "Needs Update" : plan.status}
                  size="sm"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="rounded-lg bg-background p-3">
                  <p className="text-xs text-muted-foreground">Split days</p>
                  <p className="mt-1 text-xl font-semibold text-foreground">
                    {plan.dayCount}
                  </p>
                </div>
                <div className="rounded-lg bg-background p-3">
                  <p className="text-xs text-muted-foreground">Exercises</p>
                  <p className="mt-1 text-xl font-semibold text-foreground">
                    {plan.exerciseCount}
                  </p>
                </div>
              </div>

              {plan.notes && (
                <p className="line-clamp-2 text-sm text-muted-foreground">{plan.notes}</p>
              )}

              <div className="flex items-center justify-between border-t border-border pt-3">
                <p className="text-xs text-muted-foreground">
                  Updated {formatDate(plan.updatedAt)}
                </p>
                <Button variant="outline" size="sm" onClick={() => openEdit(plan)}>
                  <Edit className="mr-2 h-4 w-4" />
                  Edit
                </Button>
              </div>
            </SurfaceCard>
          ))}
        </div>
      )}
    </div>
  )
}
