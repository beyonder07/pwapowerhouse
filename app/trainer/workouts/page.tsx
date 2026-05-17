"use client"

import { useEffect, useMemo, useState } from "react"
import {
  Dumbbell,
  Edit,
  Loader2,
  Plus,
  Save,
  Search,
  Trash2,
  UserRound,
} from "lucide-react"
import { toast } from "sonner"
import { EmptyState, PageIntro, StatusPill, SurfaceCard } from "@/components/powerhouse"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"

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
  memberId: string
  memberName: string
  title: string
  notes: string
  status: "active" | "pending" | "archived"
  split: WorkoutDay[]
  dayCount: number
  exerciseCount: number
  updatedAt: string
  needsUpdate: boolean
}

interface WorkoutMember {
  id: string
  name: string
  avatarUrl: string | null
  status: string
}

interface WorkoutForm {
  id?: string
  memberId: string
  title: string
  notes: string
  status: "active" | "pending" | "archived"
  split: WorkoutDay[]
}

interface WorkoutResponse {
  plans: WorkoutPlan[]
  members: WorkoutMember[]
  pendingCount: number
}

const emptyExercise: WorkoutExercise = {
  name: "",
  sets: 3,
  reps: "10",
  restDuration: "60 sec",
  notes: "",
}

function createBlankPlan(memberId = ""): WorkoutForm {
  return {
    id: undefined,
    memberId,
    title: "",
    notes: "",
    status: "active",
    split: [
      {
        day: "Day 1",
        exercises: [{ ...emptyExercise }],
      },
    ],
  }
}

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
  const [plans, setPlans] = useState<WorkoutPlan[]>([])
  const [members, setMembers] = useState<WorkoutMember[]>([])
  const [search, setSearch] = useState("")
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [form, setForm] = useState(createBlankPlan())

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

  const openCreateDialog = () => {
    setForm(createBlankPlan(members[0]?.id ?? ""))
    setDialogOpen(true)
  }

  const openEditDialog = (plan: WorkoutPlan) => {
    setForm({
      id: plan.id,
      memberId: plan.memberId,
      title: plan.title,
      notes: plan.notes,
      status: plan.status === "archived" ? "pending" : plan.status,
      split:
        Array.isArray(plan.split) && plan.split.length > 0
          ? plan.split
          : createBlankPlan(plan.memberId).split,
    })
    setDialogOpen(true)
  }

  const updateDay = (dayIndex: number, value: string) => {
    setForm((current) => ({
      ...current,
      split: current.split.map((day, index) =>
        index === dayIndex ? { ...day, day: value } : day
      ),
    }))
  }

  const updateExercise = (
    dayIndex: number,
    exerciseIndex: number,
    field: keyof WorkoutExercise,
    value: string | number
  ) => {
    setForm((current) => ({
      ...current,
      split: current.split.map((day, index) =>
        index === dayIndex
          ? {
              ...day,
              exercises: day.exercises.map((exercise, innerIndex) =>
                innerIndex === exerciseIndex
                  ? { ...exercise, [field]: value }
                  : exercise
              ),
            }
          : day
      ),
    }))
  }

  const addExercise = (dayIndex: number) => {
    setForm((current) => ({
      ...current,
      split: current.split.map((day, index) =>
        index === dayIndex
          ? { ...day, exercises: [...day.exercises, { ...emptyExercise }] }
          : day
      ),
    }))
  }

  const removeExercise = (dayIndex: number, exerciseIndex: number) => {
    setForm((current) => ({
      ...current,
      split: current.split.map((day, index) =>
        index === dayIndex
          ? {
              ...day,
              exercises:
                day.exercises.length === 1
                  ? day.exercises
                  : day.exercises.filter((_, innerIndex) => innerIndex !== exerciseIndex),
            }
          : day
      ),
    }))
  }

  const addDay = () => {
    setForm((current) => ({
      ...current,
      split: [
        ...current.split,
        {
          day: `Day ${current.split.length + 1}`,
          exercises: [{ ...emptyExercise }],
        },
      ],
    }))
  }

  const removeDay = (dayIndex: number) => {
    setForm((current) => ({
      ...current,
      split:
        current.split.length === 1
          ? current.split
          : current.split.filter((_, index) => index !== dayIndex),
    }))
  }

  const validateForm = () => {
    if (!form.memberId) return "Select a member"
    if (!form.title.trim()) return "Add a workout plan title"

    for (const day of form.split) {
      if (!day.day.trim()) return "Each split day needs a name"
      for (const exercise of day.exercises) {
        if (!exercise.name.trim()) return "Exercise name is required"
        if (Number(exercise.sets) < 1) return "Sets must be at least 1"
        if (!String(exercise.reps).trim()) return "Reps are required"
      }
    }

    return null
  }

  const handleSave = async () => {
    const validationError = validateForm()
    if (validationError) {
      toast.error("Invalid workout plan", {
        description: validationError,
      })
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
      setDialogOpen(false)
      await loadWorkouts()
    } catch (error) {
      toast.error("Could not save plan", {
        description:
          error instanceof Error ? error.message : "Please check the plan details.",
      })
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <PageIntro
          title="Workout Plans"
          description="Create and update member workout plans"
        />
        <Button onClick={openCreateDialog} disabled={members.length === 0}>
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
              <Button onClick={openCreateDialog}>
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
                <p className="line-clamp-2 text-sm text-muted-foreground">
                  {plan.notes}
                </p>
              )}

              <div className="flex items-center justify-between border-t border-border pt-3">
                <p className="text-xs text-muted-foreground">
                  Updated {formatDate(plan.updatedAt)}
                </p>
                <Button variant="outline" size="sm" onClick={() => openEditDialog(plan)}>
                  <Edit className="mr-2 h-4 w-4" />
                  Edit
                </Button>
              </div>
            </SurfaceCard>
          ))}
        </div>
      )}

      {/* ── Workout Plan Dialog ─────────────────────────────────── */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent
          className={[
            // Full width on mobile with 8px gutters, capped on desktop
            "w-[calc(100vw-16px)] max-w-2xl",
            // Height: almost full screen on mobile
            "max-h-[88dvh]",
            // Flex column so header + footer can be sticky
            "flex flex-col",
            // Remove default padding — we'll control it per-section
            "gap-0 p-0",
            "overflow-hidden",
          ].join(" ")}
        >
          {/* ── Sticky header ── */}
          <div className="shrink-0 border-b border-border px-4 py-4 sm:px-6">
            <DialogHeader>
              <DialogTitle className="text-base sm:text-lg">
                {form.id ? "Edit Workout Plan" : "Create Workout Plan"}
              </DialogTitle>
              <DialogDescription className="text-xs sm:text-sm">
                Add day-wise exercises with sets, reps, rest, and coaching notes.
              </DialogDescription>
            </DialogHeader>
          </div>

          {/* ── Scrollable body ── */}
          <div className="flex-1 overflow-y-auto overscroll-contain px-4 py-4 sm:px-6">
            <div className="space-y-4">

              {/* Member + Status — stack on mobile, side by side on sm+ */}
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Member</Label>
                  <Select
                    value={form.memberId}
                    onValueChange={(value) => setForm((c) => ({ ...c, memberId: value }))}
                  >
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="Select member" />
                    </SelectTrigger>
                    <SelectContent>
                      {members.map((member) => (
                        <SelectItem key={member.id} value={member.id}>{member.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Status</Label>
                  <Select
                    value={form.status}
                    onValueChange={(value: "active" | "pending" | "archived") =>
                      setForm((c) => ({ ...c, status: value }))
                    }
                  >
                    <SelectTrigger className="w-full">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="active">Active</SelectItem>
                      <SelectItem value="pending">Needs Update</SelectItem>
                      <SelectItem value="archived">Archived</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Plan title */}
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Plan Title</Label>
                <Input
                  value={form.title}
                  onChange={(e) => setForm((c) => ({ ...c, title: e.target.value }))}
                  placeholder="Example: Beginner Strength Split"
                  className="w-full"
                />
              </div>

              {/* Notes */}
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Notes</Label>
                <Textarea
                  value={form.notes}
                  onChange={(e) => setForm((c) => ({ ...c, notes: e.target.value }))}
                  placeholder="Add coaching cues, injury notes, or progression goals"
                  className="w-full resize-none"
                  rows={2}
                />
              </div>

              {/* Day cards */}
              <div className="space-y-3">
                {form.split.map((day, dayIndex) => (
                  <div key={dayIndex} className="rounded-xl border border-border bg-card overflow-hidden">
                    {/* Day header */}
                    <div className="flex items-center gap-2 border-b border-border bg-muted/30 px-3 py-2">
                      <Input
                        value={day.day}
                        onChange={(e) => updateDay(dayIndex, e.target.value)}
                        className="h-8 min-w-0 flex-1 border-0 bg-transparent p-0 text-sm font-semibold focus-visible:ring-0"
                      />
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7 shrink-0 text-muted-foreground hover:text-destructive"
                        onClick={() => removeDay(dayIndex)}
                        disabled={form.split.length === 1}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                        <span className="sr-only">Remove day</span>
                      </Button>
                    </div>

                    {/* Exercises */}
                    <div className="space-y-2 p-3">
                      {day.exercises.map((exercise, exerciseIndex) => (
                        <div
                          key={exerciseIndex}
                          className="rounded-lg border border-border bg-background p-3 space-y-2"
                        >
                          {/* Exercise name + delete */}
                          <div className="flex items-center gap-2">
                            <div className="min-w-0 flex-1 space-y-1">
                              <Label className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">Exercise</Label>
                              <Input
                                value={exercise.name}
                                onChange={(e) => updateExercise(dayIndex, exerciseIndex, "name", e.target.value)}
                                placeholder="Exercise name"
                                className="h-8 w-full text-sm"
                              />
                            </div>
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon"
                              className="mt-5 h-8 w-8 shrink-0 text-muted-foreground hover:text-destructive"
                              onClick={() => removeExercise(dayIndex, exerciseIndex)}
                              disabled={day.exercises.length === 1}
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                              <span className="sr-only">Remove</span>
                            </Button>
                          </div>

                          {/* Sets / Reps / Rest — 3 compact columns always */}
                          <div className="grid grid-cols-3 gap-2">
                            <div className="space-y-1">
                              <Label className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">Sets</Label>
                              <Input
                                type="number"
                                min={1}
                                value={exercise.sets}
                                onChange={(e) => updateExercise(dayIndex, exerciseIndex, "sets", Number(e.target.value))}
                                className="h-8 w-full text-center text-sm"
                              />
                            </div>
                            <div className="space-y-1">
                              <Label className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">Reps</Label>
                              <Input
                                value={exercise.reps}
                                onChange={(e) => updateExercise(dayIndex, exerciseIndex, "reps", e.target.value)}
                                placeholder="10"
                                className="h-8 w-full text-center text-sm"
                              />
                            </div>
                            <div className="space-y-1">
                              <Label className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">Rest</Label>
                              <Input
                                value={exercise.restDuration}
                                onChange={(e) => updateExercise(dayIndex, exerciseIndex, "restDuration", e.target.value)}
                                placeholder="60s"
                                className="h-8 w-full text-center text-sm"
                              />
                            </div>
                          </div>

                          {/* Notes */}
                          <div className="space-y-1">
                            <Label className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">Notes</Label>
                            <Input
                              value={exercise.notes}
                              onChange={(e) => updateExercise(dayIndex, exerciseIndex, "notes", e.target.value)}
                              placeholder="Tempo, form cues, progression"
                              className="h-8 w-full text-sm"
                            />
                          </div>
                        </div>
                      ))}

                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        className="mt-1 w-full text-xs"
                        onClick={() => addExercise(dayIndex)}
                      >
                        <Plus className="mr-1.5 h-3.5 w-3.5" />
                        Add Exercise
                      </Button>
                    </div>
                  </div>
                ))}
              </div>

              <Button type="button" variant="outline" onClick={addDay} className="w-full">
                <Plus className="mr-2 h-4 w-4" />
                Add Split Day
              </Button>

              {/* Bottom spacer so content clears the sticky footer */}
              <div className="h-2" />
            </div>
          </div>

          {/* ── Sticky footer ── */}
          <div className="shrink-0 border-t border-border bg-background px-4 py-3 sm:px-6">
            <Button onClick={handleSave} disabled={isSaving} className="w-full">
              {isSaving ? (
                <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Saving...</>
              ) : (
                <><Save className="mr-2 h-4 w-4" />Save Workout Plan</>
              )}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
