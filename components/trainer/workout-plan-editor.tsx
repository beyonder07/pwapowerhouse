"use client"

import { Plus, Trash2 } from "lucide-react"
import { Button } from "@/components/ui/button"
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
import type {
  WorkoutExercise,
  WorkoutForm,
  WorkoutMember,
} from "@/lib/trainer/workout-plan"
import { emptyExercise } from "@/lib/trainer/workout-plan"

interface WorkoutPlanEditorProps {
  form: WorkoutForm
  members: WorkoutMember[]
  onChange: (updater: (current: WorkoutForm) => WorkoutForm) => void
}

export function WorkoutPlanEditor({ form, members, onChange }: WorkoutPlanEditorProps) {
  const updateDay = (dayIndex: number, value: string) => {
    onChange((current) => ({
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
    onChange((current) => ({
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
    onChange((current) => ({
      ...current,
      split: current.split.map((day, index) =>
        index === dayIndex
          ? { ...day, exercises: [...day.exercises, { ...emptyExercise }] }
          : day
      ),
    }))
  }

  const removeExercise = (dayIndex: number, exerciseIndex: number) => {
    onChange((current) => ({
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
    onChange((current) => ({
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
    onChange((current) => ({
      ...current,
      split:
        current.split.length === 1
          ? current.split
          : current.split.filter((_, index) => index !== dayIndex),
    }))
  }

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <div className="space-y-1.5">
          <Label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Member
          </Label>
          <Select
            value={form.memberId}
            onValueChange={(value) => onChange((c) => ({ ...c, memberId: value }))}
          >
            <SelectTrigger className="w-full">
              <SelectValue placeholder="Select member" />
            </SelectTrigger>
            <SelectContent>
              {members.map((member) => (
                <SelectItem key={member.id} value={member.id}>
                  {member.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-1.5">
          <Label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Status
          </Label>
          <Select
            value={form.status}
            onValueChange={(value: "active" | "pending" | "archived") =>
              onChange((c) => ({ ...c, status: value }))
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

      <div className="space-y-1.5">
        <Label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          Plan Title
        </Label>
        <Input
          value={form.title}
          onChange={(e) => onChange((c) => ({ ...c, title: e.target.value }))}
          placeholder="Example: Beginner Strength Split"
          className="w-full"
        />
      </div>

      <div className="space-y-1.5">
        <Label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          Notes
        </Label>
        <Textarea
          value={form.notes}
          onChange={(e) => onChange((c) => ({ ...c, notes: e.target.value }))}
          placeholder="Add coaching cues, injury notes, or progression goals"
          className="w-full resize-none"
          rows={3}
        />
      </div>

      <div className="space-y-3">
        {form.split.map((day, dayIndex) => (
          <div
            key={dayIndex}
            className="overflow-hidden rounded-xl border border-border bg-card"
          >
            <div className="flex items-center gap-2 border-b border-border bg-muted/30 px-3 py-2">
              <Input
                value={day.day}
                onChange={(e) => updateDay(dayIndex, e.target.value)}
                className="h-9 min-w-0 flex-1 border-0 bg-transparent p-0 text-sm font-semibold focus-visible:ring-0"
              />
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="h-8 w-8 shrink-0 text-muted-foreground hover:text-destructive"
                onClick={() => removeDay(dayIndex)}
                disabled={form.split.length === 1}
              >
                <Trash2 className="h-4 w-4" />
                <span className="sr-only">Remove day</span>
              </Button>
            </div>

            <div className="space-y-3 p-3">
              {day.exercises.map((exercise, exerciseIndex) => (
                <div
                  key={exerciseIndex}
                  className="space-y-3 rounded-lg border border-border bg-background p-3"
                >
                  <div className="flex items-start gap-2">
                    <div className="min-w-0 flex-1 space-y-1">
                      <Label className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                        Exercise
                      </Label>
                      <Input
                        value={exercise.name}
                        onChange={(e) =>
                          updateExercise(dayIndex, exerciseIndex, "name", e.target.value)
                        }
                        placeholder="Exercise name"
                        className="h-10 w-full"
                      />
                    </div>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="mt-5 h-9 w-9 shrink-0 text-muted-foreground hover:text-destructive"
                      onClick={() => removeExercise(dayIndex, exerciseIndex)}
                      disabled={day.exercises.length === 1}
                      aria-label="Remove exercise"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>

                  <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                    <div className="space-y-1">
                      <Label className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                        Sets
                      </Label>
                      <Input
                        type="number"
                        min={1}
                        inputMode="numeric"
                        value={exercise.sets}
                        onChange={(e) =>
                          updateExercise(
                            dayIndex,
                            exerciseIndex,
                            "sets",
                            Number(e.target.value)
                          )
                        }
                        className="h-10 w-full"
                      />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                        Reps
                      </Label>
                      <Input
                        value={exercise.reps}
                        onChange={(e) =>
                          updateExercise(dayIndex, exerciseIndex, "reps", e.target.value)
                        }
                        placeholder="10"
                        className="h-10 w-full"
                      />
                    </div>
                    <div className="col-span-2 space-y-1 sm:col-span-1">
                      <Label className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                        Rest
                      </Label>
                      <Input
                        value={exercise.restDuration}
                        onChange={(e) =>
                          updateExercise(
                            dayIndex,
                            exerciseIndex,
                            "restDuration",
                            e.target.value
                          )
                        }
                        placeholder="60 sec"
                        className="h-10 w-full"
                      />
                    </div>
                  </div>

                  <div className="space-y-1">
                    <Label className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                      Notes
                    </Label>
                    <Input
                      value={exercise.notes}
                      onChange={(e) =>
                        updateExercise(dayIndex, exerciseIndex, "notes", e.target.value)
                      }
                      placeholder="Tempo, form cues, progression"
                      className="h-10 w-full"
                    />
                  </div>
                </div>
              ))}

              <Button
                type="button"
                variant="outline"
                size="sm"
                className="w-full"
                onClick={() => addExercise(dayIndex)}
              >
                <Plus className="mr-2 h-4 w-4" />
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
    </div>
  )
}
