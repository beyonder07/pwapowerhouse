"use client"

import { useState } from "react"
import { motion } from "framer-motion"
import { PageIntro, SurfaceCard, StatusPill, SearchToolbar, EmptyState } from "@/components/powerhouse"
import { Button } from "@/components/ui/button"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Progress } from "@/components/ui/progress"
import {
  Dumbbell,
  Clock,
  Play,
  CheckCircle2,
  Calendar,
  ChevronRight,
  BarChart3,
} from "lucide-react"
import Link from "next/link"

const container = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: { staggerChildren: 0.05 },
  },
}

const item = {
  hidden: { opacity: 0, y: 20 },
  show: { opacity: 1, y: 0 },
}

// Mock data
const assignedWorkouts = [
  {
    id: "1",
    name: "Upper Body Strength",
    trainer: "Mike Torres",
    duration: "45 min",
    exercises: 8,
    difficulty: "intermediate",
    lastCompleted: null,
    scheduled: "Today, 10:00 AM",
  },
  {
    id: "2",
    name: "HIIT Cardio Blast",
    trainer: "Sarah Lee",
    duration: "30 min",
    exercises: 12,
    difficulty: "advanced",
    lastCompleted: "2 days ago",
    scheduled: "Tomorrow, 9:00 AM",
  },
  {
    id: "3",
    name: "Leg Day Power",
    trainer: "Mike Torres",
    duration: "50 min",
    exercises: 10,
    difficulty: "intermediate",
    lastCompleted: "5 days ago",
    scheduled: "Wed, 11:00 AM",
  },
  {
    id: "4",
    name: "Core & Flexibility",
    trainer: "Sarah Lee",
    duration: "35 min",
    exercises: 15,
    difficulty: "beginner",
    lastCompleted: "1 week ago",
    scheduled: null,
  },
]

const completedWorkouts = [
  {
    id: "c1",
    name: "Full Body Circuit",
    completedAt: "Yesterday",
    duration: "42 min",
    calories: 380,
  },
  {
    id: "c2",
    name: "Upper Body Strength",
    completedAt: "3 days ago",
    duration: "48 min",
    calories: 320,
  },
  {
    id: "c3",
    name: "HIIT Cardio Blast",
    completedAt: "5 days ago",
    duration: "28 min",
    calories: 450,
  },
]

const difficultyColors = {
  beginner: "success",
  intermediate: "warning",
  advanced: "error",
} as const

export default function ClientWorkoutsPage() {
  const [search, setSearch] = useState("")
  const [activeTab, setActiveTab] = useState("assigned")

  const filteredWorkouts = assignedWorkouts.filter(
    (w) =>
      w.name.toLowerCase().includes(search.toLowerCase()) ||
      w.trainer.toLowerCase().includes(search.toLowerCase())
  )

  return (
    <motion.div
      variants={container}
      initial="hidden"
      animate="show"
      className="space-y-6"
    >
      <PageIntro
        title="My Workouts"
        subtitle="View your assigned workouts and track your progress"
      />

      <motion.div variants={item}>
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="mb-4">
            <TabsTrigger value="assigned">Assigned</TabsTrigger>
            <TabsTrigger value="completed">Completed</TabsTrigger>
            <TabsTrigger value="stats">Stats</TabsTrigger>
          </TabsList>

          <TabsContent value="assigned" className="space-y-4">
            <SearchToolbar
              value={search}
              onChange={setSearch}
              placeholder="Search workouts..."
            />

            {filteredWorkouts.length === 0 ? (
              <EmptyState
                icon={Dumbbell}
                title="No workouts found"
                description="No workouts match your search criteria"
              />
            ) : (
              <div className="grid gap-4 md:grid-cols-2">
                {filteredWorkouts.map((workout) => (
                  <motion.div key={workout.id} variants={item}>
                    <SurfaceCard className="h-full hover:border-primary/50 transition-colors">
                      <div className="flex items-start justify-between mb-3">
                        <div>
                          <h3 className="font-semibold text-foreground">{workout.name}</h3>
                          <p className="text-sm text-muted-foreground">by {workout.trainer}</p>
                        </div>
                        <StatusPill status={difficultyColors[workout.difficulty as keyof typeof difficultyColors]}>
                          {workout.difficulty}
                        </StatusPill>
                      </div>

                      <div className="flex items-center gap-4 text-sm text-muted-foreground mb-4">
                        <div className="flex items-center gap-1">
                          <Clock className="h-4 w-4" />
                          {workout.duration}
                        </div>
                        <div className="flex items-center gap-1">
                          <Dumbbell className="h-4 w-4" />
                          {workout.exercises} exercises
                        </div>
                      </div>

                      {workout.scheduled && (
                        <div className="flex items-center gap-2 text-sm text-primary mb-4">
                          <Calendar className="h-4 w-4" />
                          {workout.scheduled}
                        </div>
                      )}

                      {workout.lastCompleted && (
                        <p className="text-xs text-muted-foreground mb-4">
                          Last completed: {workout.lastCompleted}
                        </p>
                      )}

                      <div className="flex items-center gap-2">
                        <Button className="flex-1" asChild>
                          <Link href={`/client/workouts/${workout.id}`}>
                            <Play className="mr-2 h-4 w-4" />
                            Start
                          </Link>
                        </Button>
                        <Button variant="outline" size="icon" asChild>
                          <Link href={`/client/workouts/${workout.id}/details`}>
                            <ChevronRight className="h-4 w-4" />
                          </Link>
                        </Button>
                      </div>
                    </SurfaceCard>
                  </motion.div>
                ))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="completed" className="space-y-4">
            {completedWorkouts.length === 0 ? (
              <EmptyState
                icon={CheckCircle2}
                title="No completed workouts"
                description="Complete your first workout to see it here"
              />
            ) : (
              <div className="space-y-3">
                {completedWorkouts.map((workout) => (
                  <motion.div key={workout.id} variants={item}>
                    <SurfaceCard className="flex items-center justify-between">
                      <div className="flex items-center gap-4">
                        <div className="p-2 rounded-lg bg-primary/10">
                          <CheckCircle2 className="h-5 w-5 text-primary" />
                        </div>
                        <div>
                          <h4 className="font-medium text-foreground">{workout.name}</h4>
                          <p className="text-sm text-muted-foreground">{workout.completedAt}</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="font-medium text-foreground">{workout.calories} cal</p>
                        <p className="text-sm text-muted-foreground">{workout.duration}</p>
                      </div>
                    </SurfaceCard>
                  </motion.div>
                ))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="stats" className="space-y-4">
            <div className="grid gap-4 md:grid-cols-3">
              <SurfaceCard>
                <div className="flex items-center gap-3 mb-2">
                  <BarChart3 className="h-5 w-5 text-primary" />
                  <span className="text-sm text-muted-foreground">This Week</span>
                </div>
                <p className="text-3xl font-bold text-foreground">4</p>
                <p className="text-sm text-muted-foreground">workouts completed</p>
              </SurfaceCard>

              <SurfaceCard>
                <div className="flex items-center gap-3 mb-2">
                  <Clock className="h-5 w-5 text-primary" />
                  <span className="text-sm text-muted-foreground">Total Time</span>
                </div>
                <p className="text-3xl font-bold text-foreground">3h 42m</p>
                <p className="text-sm text-muted-foreground">this week</p>
              </SurfaceCard>

              <SurfaceCard>
                <div className="flex items-center gap-3 mb-2">
                  <Dumbbell className="h-5 w-5 text-primary" />
                  <span className="text-sm text-muted-foreground">Calories</span>
                </div>
                <p className="text-3xl font-bold text-foreground">2,450</p>
                <p className="text-sm text-muted-foreground">burned this week</p>
              </SurfaceCard>
            </div>

            <SurfaceCard>
              <h3 className="font-semibold text-foreground mb-4">Weekly Goal Progress</h3>
              <div className="space-y-4">
                <div>
                  <div className="flex items-center justify-between text-sm mb-2">
                    <span className="text-muted-foreground">Workouts (4/5)</span>
                    <span className="text-foreground">80%</span>
                  </div>
                  <Progress value={80} className="h-2" />
                </div>
                <div>
                  <div className="flex items-center justify-between text-sm mb-2">
                    <span className="text-muted-foreground">Active Minutes (222/300)</span>
                    <span className="text-foreground">74%</span>
                  </div>
                  <Progress value={74} className="h-2" />
                </div>
                <div>
                  <div className="flex items-center justify-between text-sm mb-2">
                    <span className="text-muted-foreground">Calories (2,450/3,000)</span>
                    <span className="text-foreground">82%</span>
                  </div>
                  <Progress value={82} className="h-2" />
                </div>
              </div>
            </SurfaceCard>
          </TabsContent>
        </Tabs>
      </motion.div>
    </motion.div>
  )
}
