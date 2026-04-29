"use client"

import { useState, useEffect, useCallback } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { SurfaceCard } from "@/components/powerhouse"
import { Button } from "@/components/ui/button"
import { Progress } from "@/components/ui/progress"
import {
  Play,
  Pause,
  SkipForward,
  ChevronLeft,
  Clock,
  Dumbbell,
  CheckCircle2,
  X,
  Trophy,
} from "lucide-react"
import Link from "next/link"

// Mock workout data
const workoutData = {
  name: "Upper Body Strength",
  trainer: "Mike Torres",
  exercises: [
    { id: 1, name: "Bench Press", sets: 4, reps: 10, weight: "135 lbs", rest: 90 },
    { id: 2, name: "Dumbbell Rows", sets: 4, reps: 12, weight: "45 lbs", rest: 60 },
    { id: 3, name: "Shoulder Press", sets: 3, reps: 10, weight: "95 lbs", rest: 90 },
    { id: 4, name: "Bicep Curls", sets: 3, reps: 12, weight: "30 lbs", rest: 45 },
    { id: 5, name: "Tricep Dips", sets: 3, reps: 15, weight: "BW", rest: 45 },
    { id: 6, name: "Lat Pulldowns", sets: 4, reps: 10, weight: "120 lbs", rest: 60 },
    { id: 7, name: "Cable Flyes", sets: 3, reps: 12, weight: "30 lbs", rest: 45 },
    { id: 8, name: "Plank Hold", sets: 3, reps: 1, weight: "60 sec", rest: 30 },
  ],
}

type WorkoutState = "active" | "rest" | "completed"

export default function ActiveWorkoutPage() {
  const [currentExerciseIndex, setCurrentExerciseIndex] = useState(0)
  const [currentSet, setCurrentSet] = useState(1)
  const [workoutState, setWorkoutState] = useState<WorkoutState>("active")
  const [isPaused, setIsPaused] = useState(false)
  const [restTimer, setRestTimer] = useState(0)
  const [totalTime, setTotalTime] = useState(0)
  const [completedExercises, setCompletedExercises] = useState<number[]>([])

  const currentExercise = workoutData.exercises[currentExerciseIndex]
  const isLastExercise = currentExerciseIndex === workoutData.exercises.length - 1
  const isLastSet = currentSet === currentExercise.sets

  // Total workout timer
  useEffect(() => {
    if (workoutState === "completed" || isPaused) return
    const interval = setInterval(() => {
      setTotalTime((t) => t + 1)
    }, 1000)
    return () => clearInterval(interval)
  }, [workoutState, isPaused])

  // Rest timer
  useEffect(() => {
    if (workoutState !== "rest" || isPaused) return
    if (restTimer <= 0) {
      setWorkoutState("active")
      return
    }
    const interval = setInterval(() => {
      setRestTimer((t) => t - 1)
    }, 1000)
    return () => clearInterval(interval)
  }, [workoutState, restTimer, isPaused])

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`
  }

  const completeSet = useCallback(() => {
    if (isLastSet) {
      setCompletedExercises((prev) => [...prev, currentExercise.id])
      if (isLastExercise) {
        setWorkoutState("completed")
      } else {
        setCurrentExerciseIndex((prev) => prev + 1)
        setCurrentSet(1)
        setRestTimer(currentExercise.rest)
        setWorkoutState("rest")
      }
    } else {
      setCurrentSet((prev) => prev + 1)
      setRestTimer(currentExercise.rest)
      setWorkoutState("rest")
    }
  }, [isLastSet, isLastExercise, currentExercise])

  const skipRest = () => {
    setRestTimer(0)
    setWorkoutState("active")
  }

  const progress = ((currentExerciseIndex + (currentSet / currentExercise.sets)) / workoutData.exercises.length) * 100

  if (workoutState === "completed") {
    return (
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        className="min-h-[80vh] flex items-center justify-center"
      >
        <SurfaceCard className="max-w-md w-full text-center">
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ delay: 0.2, type: "spring" }}
            className="w-20 h-20 mx-auto mb-6 rounded-full bg-primary/20 flex items-center justify-center"
          >
            <Trophy className="h-10 w-10 text-primary" />
          </motion.div>
          
          <h2 className="text-2xl font-bold text-foreground mb-2">Workout Complete!</h2>
          <p className="text-muted-foreground mb-6">Great job crushing {workoutData.name}</p>

          <div className="grid grid-cols-2 gap-4 mb-6">
            <div className="p-4 rounded-lg bg-muted/50">
              <p className="text-2xl font-bold text-foreground">{formatTime(totalTime)}</p>
              <p className="text-sm text-muted-foreground">Total Time</p>
            </div>
            <div className="p-4 rounded-lg bg-muted/50">
              <p className="text-2xl font-bold text-foreground">{workoutData.exercises.length}</p>
              <p className="text-sm text-muted-foreground">Exercises</p>
            </div>
          </div>

          <div className="flex flex-col gap-2">
            <Button asChild>
              <Link href="/client/workouts">Back to Workouts</Link>
            </Button>
            <Button variant="outline" asChild>
              <Link href="/client">Go to Dashboard</Link>
            </Button>
          </div>
        </SurfaceCard>
      </motion.div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <Button variant="ghost" size="sm" asChild>
          <Link href="/client/workouts">
            <ChevronLeft className="mr-1 h-4 w-4" />
            Exit Workout
          </Link>
        </Button>
        <div className="flex items-center gap-2 text-muted-foreground">
          <Clock className="h-4 w-4" />
          <span className="font-mono">{formatTime(totalTime)}</span>
        </div>
      </div>

      {/* Progress */}
      <div>
        <div className="flex items-center justify-between text-sm mb-2">
          <span className="text-muted-foreground">{workoutData.name}</span>
          <span className="text-foreground">
            {currentExerciseIndex + 1}/{workoutData.exercises.length}
          </span>
        </div>
        <Progress value={progress} className="h-2" />
      </div>

      {/* Exercise List */}
      <div className="grid gap-2">
        {workoutData.exercises.map((exercise, index) => (
          <motion.div
            key={exercise.id}
            initial={false}
            animate={{
              opacity: index < currentExerciseIndex ? 0.5 : 1,
              scale: index === currentExerciseIndex ? 1 : 0.98,
            }}
          >
            <SurfaceCard
              className={`transition-colors ${
                index === currentExerciseIndex
                  ? "border-primary bg-primary/5"
                  : completedExercises.includes(exercise.id)
                  ? "bg-muted/30"
                  : ""
              }`}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div
                    className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
                      completedExercises.includes(exercise.id)
                        ? "bg-primary text-primary-foreground"
                        : index === currentExerciseIndex
                        ? "bg-primary/20 text-primary"
                        : "bg-muted text-muted-foreground"
                    }`}
                  >
                    {completedExercises.includes(exercise.id) ? (
                      <CheckCircle2 className="h-4 w-4" />
                    ) : (
                      index + 1
                    )}
                  </div>
                  <div>
                    <p className="font-medium text-foreground">{exercise.name}</p>
                    <p className="text-sm text-muted-foreground">
                      {exercise.sets} x {exercise.reps} @ {exercise.weight}
                    </p>
                  </div>
                </div>
                {index === currentExerciseIndex && (
                  <span className="text-sm text-primary font-medium">
                    Set {currentSet}/{exercise.sets}
                  </span>
                )}
              </div>
            </SurfaceCard>
          </motion.div>
        ))}
      </div>

      {/* Rest Timer Overlay */}
      <AnimatePresence>
        {workoutState === "rest" && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-background/95 flex items-center justify-center"
          >
            <div className="text-center">
              <p className="text-muted-foreground mb-2">Rest Time</p>
              <motion.p
                key={restTimer}
                initial={{ scale: 1.2, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                className="text-7xl font-bold text-foreground mb-8 font-mono"
              >
                {restTimer}
              </motion.p>
              <p className="text-muted-foreground mb-6">
                Next: {isLastSet && !isLastExercise
                  ? workoutData.exercises[currentExerciseIndex + 1].name
                  : `${currentExercise.name} - Set ${currentSet}`}
              </p>
              <div className="flex items-center gap-4 justify-center">
                <Button variant="outline" onClick={() => setIsPaused(!isPaused)}>
                  {isPaused ? <Play className="h-4 w-4" /> : <Pause className="h-4 w-4" />}
                </Button>
                <Button onClick={skipRest}>
                  <SkipForward className="mr-2 h-4 w-4" />
                  Skip Rest
                </Button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Action Buttons */}
      <div className="fixed bottom-20 left-0 right-0 p-4 bg-gradient-to-t from-background via-background to-transparent md:bottom-0">
        <div className="max-w-md mx-auto flex items-center gap-4">
          <Button
            variant="outline"
            size="icon"
            onClick={() => setIsPaused(!isPaused)}
          >
            {isPaused ? <Play className="h-5 w-5" /> : <Pause className="h-5 w-5" />}
          </Button>
          <Button className="flex-1 h-14 text-lg" onClick={completeSet}>
            <CheckCircle2 className="mr-2 h-5 w-5" />
            Complete Set
          </Button>
        </div>
      </div>
    </div>
  )
}
