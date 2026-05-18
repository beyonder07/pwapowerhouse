export interface WorkoutExercise {
  name: string
  sets: number
  reps: string
  restDuration: string
  notes: string
}

export interface WorkoutDay {
  day: string
  exercises: WorkoutExercise[]
}

export interface WorkoutPlan {
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

export interface WorkoutMember {
  id: string
  name: string
  avatarUrl: string | null
  status: string
}

export interface WorkoutForm {
  id?: string
  memberId: string
  title: string
  notes: string
  status: "active" | "pending" | "archived"
  split: WorkoutDay[]
}

export interface WorkoutResponse {
  plans: WorkoutPlan[]
  members: WorkoutMember[]
  pendingCount: number
}

export const emptyExercise: WorkoutExercise = {
  name: "",
  sets: 3,
  reps: "10",
  restDuration: "60 sec",
  notes: "",
}

export function createBlankPlan(memberId = ""): WorkoutForm {
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

export function validateWorkoutForm(form: WorkoutForm) {
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

export function planToForm(plan: WorkoutPlan): WorkoutForm {
  return {
    id: plan.id,
    memberId: plan.memberId,
    title: plan.title,
    notes: plan.notes,
    status: plan.status === "archived" ? "pending" : plan.status,
    split:
      Array.isArray(plan.split) && plan.split.length > 0
        ? plan.split
        : createBlankPlan(plan.memberId).split,
  }
}
