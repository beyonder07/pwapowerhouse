"use client"

import { Suspense, useEffect, useState } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { Loader2 } from "lucide-react"
import { toast } from "sonner"
import { WorkoutPlanScreen } from "@/components/trainer/workout-plan-screen"
import {
  createBlankPlan,
  planToForm,
  validateWorkoutForm,
  type WorkoutForm,
  type WorkoutMember,
  type WorkoutPlan,
  type WorkoutResponse,
} from "@/lib/trainer/workout-plan"

function TrainerWorkoutPlanPageContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const planId = searchParams.get("id")

  const [members, setMembers] = useState<WorkoutMember[]>([])
  const [form, setForm] = useState<WorkoutForm>(createBlankPlan())
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)

  useEffect(() => {
    let mounted = true

    async function load() {
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
        if (!mounted) return

        setMembers(data.members)

        if (planId) {
          const plan = data.plans.find((item: WorkoutPlan) => item.id === planId)
          if (!plan) {
            throw new Error("Workout plan not found")
          }
          setForm(planToForm(plan))
        } else {
          setForm(createBlankPlan(data.members[0]?.id ?? ""))
        }
      } catch (error) {
        toast.error("Unable to open workout plan", {
          description:
            error instanceof Error ? error.message : "Please go back and try again.",
        })
        router.replace("/trainer/workouts")
      } finally {
        if (mounted) setIsLoading(false)
      }
    }

    load()

    return () => {
      mounted = false
    }
  }, [planId, router])

  const handleSave = async () => {
    const validationError = validateWorkoutForm(form)
    if (validationError) {
      toast.error("Invalid workout plan", { description: validationError })
      return
    }

    setIsSaving(true)

    try {
      const response = await fetch("/api/trainer/workouts", {
        method: form.id ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          ...form,
          split: form.split.map((day) => ({
            ...day,
            exercises: day.exercises.map((exercise) => ({
              ...exercise,
              sets: Number(exercise.sets),
            })),
          })),
        }),
      })
      const result = await response.json()

      if (!response.ok || !result.success) {
        throw new Error(result.error || "Unable to save workout plan")
      }

      toast.success("Workout plan saved")
      router.push("/trainer/workouts")
      router.refresh()
    } catch (error) {
      toast.error("Could not save plan", {
        description:
          error instanceof Error ? error.message : "Please check the plan details.",
      })
    } finally {
      setIsSaving(false)
    }
  }

  if (isLoading) {
    return (
      <div className="fixed inset-0 z-[60] flex items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    )
  }

  return (
    <WorkoutPlanScreen
      mode="page"
      title={form.id ? "Edit Workout Plan" : "Create Workout Plan"}
      description="Add day-wise exercises with sets, reps, rest, and coaching notes."
      form={form}
      members={members}
      isSaving={isSaving}
      onChange={setForm}
      onSave={handleSave}
    />
  )
}

export default function TrainerWorkoutPlanPage() {
  return (
    <Suspense
      fallback={
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-background">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      }
    >
      <TrainerWorkoutPlanPageContent />
    </Suspense>
  )
}
