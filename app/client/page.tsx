"use client"

import { useState } from "react"
import { motion } from "framer-motion"
import { MetricCard, SurfaceCard, StatusPill, PageIntro } from "@/components/powerhouse"
import { Button } from "@/components/ui/button"
import { Progress } from "@/components/ui/progress"
import {
  Dumbbell,
  Flame,
  Trophy,
  Calendar,
  Clock,
  ChevronRight,
  Play,
  TrendingUp,
  MapPin,
  Loader2,
} from "lucide-react"
import Link from "next/link"
import { toast } from "sonner"

const container = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: { staggerChildren: 0.1 },
  },
}

const item = {
  hidden: { opacity: 0, y: 20 },
  show: { opacity: 1, y: 0 },
}

// Mock data
const todayWorkout = {
  name: "Upper Body Strength",
  duration: "45 min",
  exercises: 8,
  trainer: "Mike Torres",
  scheduledTime: "10:00 AM",
}

const upcomingSessions = [
  { id: 1, name: "HIIT Cardio", time: "Tomorrow, 9:00 AM", trainer: "Sarah Lee" },
  { id: 2, name: "Leg Day", time: "Wed, 11:00 AM", trainer: "Mike Torres" },
  { id: 3, name: "Core & Flexibility", time: "Fri, 10:00 AM", trainer: "Sarah Lee" },
]

const weeklyGoal = {
  completed: 4,
  total: 5,
  calories: 2400,
  targetCalories: 3000,
}

const achievements = [
  { id: 1, name: "First Week", icon: "🏅", earned: true },
  { id: 2, name: "10 Workouts", icon: "💪", earned: true },
  { id: 3, name: "Early Bird", icon: "🌅", earned: false },
]

export default function ClientDashboard() {
  const [isCheckingIn, setIsCheckingIn] = useState(false)

  const handleAttendanceCheckIn = () => {
    if (!navigator.geolocation) {
      toast.error("Location unavailable", {
        description: "Your browser does not support location services.",
      })
      return
    }

    setIsCheckingIn(true)

    navigator.geolocation.getCurrentPosition(
      async (position) => {
        try {
          const response = await fetch("/api/attendance/check-in", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              "Idempotency-Key": crypto.randomUUID(),
            },
            credentials: "include",
            body: JSON.stringify({
              latitude: position.coords.latitude,
              longitude: position.coords.longitude,
              clientTimestamp: new Date().toISOString(),
            }),
          })

          const result = await response.json()

          if (!response.ok || !result.success) {
            throw new Error(result.error || "Unable to mark attendance")
          }

          toast.success("Attendance marked", {
            description: "You're checked in for today.",
          })
        } catch (error) {
          toast.error("Check-in failed", {
            description:
              error instanceof Error
                ? error.message
                : "Please try again from inside the gym.",
          })
        } finally {
          setIsCheckingIn(false)
        }
      },
      () => {
        setIsCheckingIn(false)
        toast.error("Location permission required", {
          description: "Allow location access to verify you are at the gym.",
        })
      },
      {
        enableHighAccuracy: true,
        maximumAge: 0,
        timeout: 10000,
      }
    )
  }

  return (
    <motion.div
      variants={container}
      initial="hidden"
      animate="show"
      className="space-y-6"
    >
      <PageIntro
        title="Welcome back, Alex"
        subtitle="Ready to crush your goals today?"
      />

      {/* Stats Overview */}
      <motion.div variants={item} className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <MetricCard
          label="Weekly Workouts"
          value={`${weeklyGoal.completed}/${weeklyGoal.total}`}
          icon={Dumbbell}
          trend={{ value: 20, isPositive: true }}
          accentColor="red"
        />
        <MetricCard
          label="Calories Burned"
          value={weeklyGoal.calories.toLocaleString()}
          icon={Flame}
          trend={{ value: 15, isPositive: true }}
          accentColor="red"
        />
        <MetricCard
          label="Current Streak"
          value={`12 days`}
          icon={Trophy}
          accentColor="red"
        />
        <MetricCard
          label="Next Session"
          value="Today"
          subValue="10:00 AM"
          icon={Calendar}
          accentColor="red"
        />
      </motion.div>

      <motion.div variants={item}>
        <SurfaceCard>
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-start gap-3">
              <div className="rounded-lg bg-primary/10 p-2">
                <MapPin className="h-5 w-5 text-primary" />
              </div>
              <div>
                <h3 className="font-semibold text-foreground">Gym Attendance</h3>
                <p className="text-sm text-muted-foreground">
                  Check in from within 150 meters of your branch.
                </p>
              </div>
            </div>
            <Button onClick={handleAttendanceCheckIn} disabled={isCheckingIn}>
              {isCheckingIn ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Checking location...
                </>
              ) : (
                <>
                  <MapPin className="mr-2 h-4 w-4" />
                  Mark Attendance
                </>
              )}
            </Button>
          </div>
        </SurfaceCard>
      </motion.div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Today's Workout */}
        <motion.div variants={item} className="lg:col-span-2">
          <SurfaceCard className="p-0 overflow-hidden">
            <div className="relative">
              <div className="absolute inset-0 bg-gradient-to-br from-primary/20 to-transparent" />
              <div className="relative p-6">
                <div className="flex items-start justify-between mb-4">
                  <div>
                    <p className="text-sm text-muted-foreground mb-1">{"Today's Workout"}</p>
                    <h3 className="text-2xl font-bold text-foreground">{todayWorkout.name}</h3>
                  </div>
                  <StatusPill status="active">Scheduled</StatusPill>
                </div>
                
                <div className="grid grid-cols-3 gap-4 mb-6">
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <Clock className="h-4 w-4" />
                    <span className="text-sm">{todayWorkout.duration}</span>
                  </div>
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <Dumbbell className="h-4 w-4" />
                    <span className="text-sm">{todayWorkout.exercises} exercises</span>
                  </div>
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <Calendar className="h-4 w-4" />
                    <span className="text-sm">{todayWorkout.scheduledTime}</span>
                  </div>
                </div>

                <div className="flex items-center justify-between">
                  <p className="text-sm text-muted-foreground">
                    Trainer: <span className="text-foreground">{todayWorkout.trainer}</span>
                  </p>
                  <Button asChild>
                    <Link href="/client/workouts/active">
                      <Play className="mr-2 h-4 w-4" />
                      Start Workout
                    </Link>
                  </Button>
                </div>
              </div>
            </div>
          </SurfaceCard>
        </motion.div>

        {/* Weekly Progress */}
        <motion.div variants={item}>
          <SurfaceCard className="h-full">
            <h3 className="font-semibold text-foreground mb-4">Weekly Progress</h3>
            
            <div className="space-y-4">
              <div>
                <div className="flex items-center justify-between text-sm mb-2">
                  <span className="text-muted-foreground">Workouts</span>
                  <span className="text-foreground font-medium">
                    {weeklyGoal.completed}/{weeklyGoal.total}
                  </span>
                </div>
                <Progress 
                  value={(weeklyGoal.completed / weeklyGoal.total) * 100} 
                  className="h-2"
                />
              </div>

              <div>
                <div className="flex items-center justify-between text-sm mb-2">
                  <span className="text-muted-foreground">Calories</span>
                  <span className="text-foreground font-medium">
                    {weeklyGoal.calories.toLocaleString()}/{weeklyGoal.targetCalories.toLocaleString()}
                  </span>
                </div>
                <Progress 
                  value={(weeklyGoal.calories / weeklyGoal.targetCalories) * 100} 
                  className="h-2"
                />
              </div>

              <div className="pt-4 border-t border-border">
                <div className="flex items-center gap-2 text-primary">
                  <TrendingUp className="h-4 w-4" />
                  <span className="text-sm font-medium">{"You're ahead of last week!"}</span>
                </div>
              </div>
            </div>
          </SurfaceCard>
        </motion.div>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Upcoming Sessions */}
        <motion.div variants={item}>
          <SurfaceCard>
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold text-foreground">Upcoming Sessions</h3>
              <Button variant="ghost" size="sm" asChild>
                <Link href="/client/schedule">
                  View All
                  <ChevronRight className="ml-1 h-4 w-4" />
                </Link>
              </Button>
            </div>

            <div className="space-y-3">
              {upcomingSessions.map((session) => (
                <div
                  key={session.id}
                  className="flex items-center justify-between p-3 rounded-lg bg-muted/50 hover:bg-muted transition-colors"
                >
                  <div>
                    <p className="font-medium text-foreground">{session.name}</p>
                    <p className="text-sm text-muted-foreground">{session.trainer}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm text-muted-foreground">{session.time}</p>
                  </div>
                </div>
              ))}
            </div>
          </SurfaceCard>
        </motion.div>

        {/* Achievements */}
        <motion.div variants={item}>
          <SurfaceCard>
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold text-foreground">Recent Achievements</h3>
              <Button variant="ghost" size="sm" asChild>
                <Link href="/client/profile#achievements">
                  View All
                  <ChevronRight className="ml-1 h-4 w-4" />
                </Link>
              </Button>
            </div>

            <div className="grid grid-cols-3 gap-3">
              {achievements.map((achievement) => (
                <div
                  key={achievement.id}
                  className={`flex flex-col items-center justify-center p-4 rounded-lg border ${
                    achievement.earned
                      ? "border-primary/50 bg-primary/5"
                      : "border-border bg-muted/30 opacity-50"
                  }`}
                >
                  <span className="text-2xl mb-2">{achievement.icon}</span>
                  <span className="text-xs text-center text-muted-foreground">
                    {achievement.name}
                  </span>
                </div>
              ))}
            </div>
          </SurfaceCard>
        </motion.div>
      </div>
    </motion.div>
  )
}
