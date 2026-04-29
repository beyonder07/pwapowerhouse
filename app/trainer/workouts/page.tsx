"use client"

import { useState } from "react"
import { motion } from "framer-motion"
import { PageIntro, SurfaceCard, SearchToolbar, StatusPill, EmptyState } from "@/components/powerhouse"
import { Button } from "@/components/ui/button"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
  Plus,
  Dumbbell,
  Clock,
  Users,
  Copy,
  Edit,
  Trash2,
  MoreVertical,
} from "lucide-react"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
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
const workouts = [
  {
    id: "1",
    name: "Upper Body Strength",
    description: "Complete upper body workout focusing on chest, back, and arms",
    duration: "45 min",
    exercises: 8,
    difficulty: "intermediate",
    category: "Strength",
    assignedTo: 5,
    createdAt: "Mar 15, 2026",
    isTemplate: false,
  },
  {
    id: "2",
    name: "HIIT Cardio Blast",
    description: "High-intensity interval training for maximum calorie burn",
    duration: "30 min",
    exercises: 12,
    difficulty: "advanced",
    category: "Cardio",
    assignedTo: 8,
    createdAt: "Mar 10, 2026",
    isTemplate: false,
  },
  {
    id: "3",
    name: "Leg Day Power",
    description: "Comprehensive leg workout targeting quads, hamstrings, and glutes",
    duration: "50 min",
    exercises: 10,
    difficulty: "intermediate",
    category: "Strength",
    assignedTo: 4,
    createdAt: "Mar 5, 2026",
    isTemplate: false,
  },
  {
    id: "4",
    name: "Core & Flexibility",
    description: "Focus on core strength and overall flexibility",
    duration: "35 min",
    exercises: 15,
    difficulty: "beginner",
    category: "Flexibility",
    assignedTo: 6,
    createdAt: "Feb 28, 2026",
    isTemplate: false,
  },
]

const templates = [
  {
    id: "t1",
    name: "Beginner Full Body",
    description: "Perfect for clients new to strength training",
    duration: "40 min",
    exercises: 8,
    difficulty: "beginner",
    category: "Strength",
    isTemplate: true,
  },
  {
    id: "t2",
    name: "Advanced HIIT",
    description: "Intense cardio for experienced clients",
    duration: "25 min",
    exercises: 10,
    difficulty: "advanced",
    category: "Cardio",
    isTemplate: true,
  },
  {
    id: "t3",
    name: "Recovery Day",
    description: "Light stretching and mobility work",
    duration: "30 min",
    exercises: 12,
    difficulty: "beginner",
    category: "Recovery",
    isTemplate: true,
  },
]

const difficultyColors = {
  beginner: "success",
  intermediate: "warning",
  advanced: "error",
} as const

export default function TrainerWorkoutsPage() {
  const [search, setSearch] = useState("")
  const [activeTab, setActiveTab] = useState("workouts")

  const filteredWorkouts = workouts.filter(
    (w) =>
      w.name.toLowerCase().includes(search.toLowerCase()) ||
      w.category.toLowerCase().includes(search.toLowerCase())
  )

  const filteredTemplates = templates.filter(
    (t) =>
      t.name.toLowerCase().includes(search.toLowerCase()) ||
      t.category.toLowerCase().includes(search.toLowerCase())
  )

  return (
    <motion.div
      variants={container}
      initial="hidden"
      animate="show"
      className="space-y-6"
    >
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <PageIntro
          title="Workouts"
          subtitle="Create and manage workout plans for your clients"
        />
        <Button asChild>
          <Link href="/trainer/workouts/create">
            <Plus className="mr-2 h-4 w-4" />
            Create Workout
          </Link>
        </Button>
      </div>

      <motion.div variants={item}>
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="mb-4">
            <TabsTrigger value="workouts">My Workouts ({workouts.length})</TabsTrigger>
            <TabsTrigger value="templates">Templates ({templates.length})</TabsTrigger>
          </TabsList>

          <SearchToolbar
            value={search}
            onChange={setSearch}
            placeholder="Search workouts..."
          />

          <TabsContent value="workouts" className="mt-4">
            {filteredWorkouts.length === 0 ? (
              <EmptyState
                icon={Dumbbell}
                title="No workouts found"
                description={search ? "Try adjusting your search" : "Create your first workout plan"}
                action={
                  <Button asChild>
                    <Link href="/trainer/workouts/create">
                      <Plus className="mr-2 h-4 w-4" />
                      Create Workout
                    </Link>
                  </Button>
                }
              />
            ) : (
              <div className="grid gap-4 md:grid-cols-2">
                {filteredWorkouts.map((workout) => (
                  <motion.div key={workout.id} variants={item}>
                    <SurfaceCard className="h-full hover:border-primary/50 transition-colors">
                      <div className="flex items-start justify-between mb-3">
                        <div>
                          <h3 className="font-semibold text-foreground">{workout.name}</h3>
                          <p className="text-sm text-muted-foreground mt-1">{workout.description}</p>
                        </div>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-8 w-8">
                              <MoreVertical className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem>
                              <Edit className="mr-2 h-4 w-4" />
                              Edit
                            </DropdownMenuItem>
                            <DropdownMenuItem>
                              <Copy className="mr-2 h-4 w-4" />
                              Duplicate
                            </DropdownMenuItem>
                            <DropdownMenuItem>
                              <Users className="mr-2 h-4 w-4" />
                              Assign to Client
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem className="text-destructive">
                              <Trash2 className="mr-2 h-4 w-4" />
                              Delete
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>

                      <div className="flex flex-wrap gap-2 mb-4">
                        <StatusPill status={difficultyColors[workout.difficulty as keyof typeof difficultyColors]}>
                          {workout.difficulty}
                        </StatusPill>
                        <StatusPill status="neutral">{workout.category}</StatusPill>
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
                        <div className="flex items-center gap-1">
                          <Users className="h-4 w-4" />
                          {workout.assignedTo} clients
                        </div>
                      </div>

                      <div className="flex items-center justify-between pt-4 border-t border-border">
                        <span className="text-xs text-muted-foreground">
                          Created {workout.createdAt}
                        </span>
                        <Button variant="outline" size="sm" asChild>
                          <Link href={`/trainer/workouts/${workout.id}`}>
                            View Details
                          </Link>
                        </Button>
                      </div>
                    </SurfaceCard>
                  </motion.div>
                ))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="templates" className="mt-4">
            {filteredTemplates.length === 0 ? (
              <EmptyState
                icon={Dumbbell}
                title="No templates found"
                description="Try adjusting your search"
              />
            ) : (
              <div className="grid gap-4 md:grid-cols-3">
                {filteredTemplates.map((template) => (
                  <motion.div key={template.id} variants={item}>
                    <SurfaceCard className="h-full hover:border-primary/50 transition-colors">
                      <div className="mb-3">
                        <h3 className="font-semibold text-foreground">{template.name}</h3>
                        <p className="text-sm text-muted-foreground mt-1">{template.description}</p>
                      </div>

                      <div className="flex flex-wrap gap-2 mb-4">
                        <StatusPill status={difficultyColors[template.difficulty as keyof typeof difficultyColors]}>
                          {template.difficulty}
                        </StatusPill>
                        <StatusPill status="neutral">{template.category}</StatusPill>
                      </div>

                      <div className="flex items-center gap-4 text-sm text-muted-foreground mb-4">
                        <div className="flex items-center gap-1">
                          <Clock className="h-4 w-4" />
                          {template.duration}
                        </div>
                        <div className="flex items-center gap-1">
                          <Dumbbell className="h-4 w-4" />
                          {template.exercises} exercises
                        </div>
                      </div>

                      <Button className="w-full" variant="outline">
                        <Copy className="mr-2 h-4 w-4" />
                        Use Template
                      </Button>
                    </SurfaceCard>
                  </motion.div>
                ))}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </motion.div>
    </motion.div>
  )
}
