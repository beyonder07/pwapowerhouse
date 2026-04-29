"use client"

import { useState } from "react"
import { motion } from "framer-motion"
import { PageIntro, SurfaceCard, StatusPill } from "@/components/powerhouse"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Progress } from "@/components/ui/progress"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
  Camera,
  Save,
  Trophy,
  Flame,
  Dumbbell,
  Calendar,
  TrendingUp,
  Target,
} from "lucide-react"

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
const profile = {
  firstName: "Alex",
  lastName: "Johnson",
  email: "alex@example.com",
  phone: "+1 (555) 123-4567",
  bio: "Fitness enthusiast focused on strength training and overall wellness.",
  goals: "Build muscle mass and improve overall fitness",
  avatar: null,
}

const stats = {
  totalWorkouts: 48,
  totalHours: 36,
  caloriesBurned: 14500,
  currentStreak: 12,
  longestStreak: 21,
  memberSince: "November 2025",
}

const achievements = [
  { id: 1, name: "First Workout", icon: "🏃", description: "Completed your first workout", earned: true, date: "Nov 15, 2025" },
  { id: 2, name: "Week Warrior", icon: "💪", description: "Worked out 5 days in a week", earned: true, date: "Nov 22, 2025" },
  { id: 3, name: "Early Bird", icon: "🌅", description: "10 workouts before 7 AM", earned: true, date: "Dec 10, 2025" },
  { id: 4, name: "Consistency King", icon: "👑", description: "30-day workout streak", earned: false, progress: 40 },
  { id: 5, name: "Century Club", icon: "💯", description: "100 total workouts", earned: false, progress: 48 },
  { id: 6, name: "Iron Will", icon: "🔥", description: "Burn 50,000 calories", earned: false, progress: 29 },
]

const goals = [
  { id: 1, name: "Weekly Workouts", current: 4, target: 5, unit: "workouts" },
  { id: 2, name: "Monthly Hours", current: 12, target: 20, unit: "hours" },
  { id: 3, name: "Weight Goal", current: 175, target: 170, unit: "lbs" },
]

export default function ClientProfilePage() {
  const [isEditing, setIsEditing] = useState(false)
  const [formData, setFormData] = useState(profile)

  const handleSave = () => {
    // Save profile logic here
    setIsEditing(false)
  }

  return (
    <motion.div
      variants={container}
      initial="hidden"
      animate="show"
      className="space-y-6"
    >
      <PageIntro
        title="My Profile"
        subtitle="View your stats, achievements, and manage your profile"
      />

      <motion.div variants={item}>
        <Tabs defaultValue="overview">
          <TabsList className="mb-4">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="achievements">Achievements</TabsTrigger>
            <TabsTrigger value="goals">Goals</TabsTrigger>
            <TabsTrigger value="settings">Edit Profile</TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-6">
            {/* Profile Card */}
            <SurfaceCard>
              <div className="flex flex-col md:flex-row items-start gap-6">
                <Avatar className="h-24 w-24">
                  <AvatarImage src={profile.avatar || undefined} />
                  <AvatarFallback className="bg-primary/10 text-primary text-2xl">
                    {profile.firstName[0]}{profile.lastName[0]}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1">
                  <h2 className="text-2xl font-bold text-foreground">
                    {profile.firstName} {profile.lastName}
                  </h2>
                  <p className="text-muted-foreground mt-1">{profile.bio}</p>
                  <div className="flex items-center gap-4 mt-4">
                    <StatusPill status="success">Premium Member</StatusPill>
                    <span className="text-sm text-muted-foreground">
                      Member since {stats.memberSince}
                    </span>
                  </div>
                </div>
              </div>
            </SurfaceCard>

            {/* Stats Grid */}
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <SurfaceCard>
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-primary/10">
                    <Dumbbell className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold text-foreground">{stats.totalWorkouts}</p>
                    <p className="text-sm text-muted-foreground">Total Workouts</p>
                  </div>
                </div>
              </SurfaceCard>

              <SurfaceCard>
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-primary/10">
                    <Calendar className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold text-foreground">{stats.totalHours}h</p>
                    <p className="text-sm text-muted-foreground">Hours Trained</p>
                  </div>
                </div>
              </SurfaceCard>

              <SurfaceCard>
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-primary/10">
                    <Flame className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold text-foreground">{(stats.caloriesBurned / 1000).toFixed(1)}k</p>
                    <p className="text-sm text-muted-foreground">Calories Burned</p>
                  </div>
                </div>
              </SurfaceCard>

              <SurfaceCard>
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-primary/10">
                    <Trophy className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold text-foreground">{stats.currentStreak}</p>
                    <p className="text-sm text-muted-foreground">Day Streak</p>
                  </div>
                </div>
              </SurfaceCard>
            </div>

            {/* Recent Achievements */}
            <SurfaceCard>
              <h3 className="font-semibold text-foreground mb-4">Recent Achievements</h3>
              <div className="grid sm:grid-cols-3 gap-4">
                {achievements.filter(a => a.earned).slice(0, 3).map((achievement) => (
                  <div
                    key={achievement.id}
                    className="flex items-center gap-3 p-3 rounded-lg bg-primary/5 border border-primary/20"
                  >
                    <span className="text-3xl">{achievement.icon}</span>
                    <div>
                      <p className="font-medium text-foreground">{achievement.name}</p>
                      <p className="text-xs text-muted-foreground">{achievement.date}</p>
                    </div>
                  </div>
                ))}
              </div>
            </SurfaceCard>
          </TabsContent>

          <TabsContent value="achievements" className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {achievements.map((achievement) => (
                <motion.div key={achievement.id} variants={item}>
                  <SurfaceCard
                    className={`h-full ${
                      achievement.earned ? "border-primary/50" : "opacity-75"
                    }`}
                  >
                    <div className="flex items-start gap-4">
                      <span className={`text-4xl ${!achievement.earned && "grayscale"}`}>
                        {achievement.icon}
                      </span>
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <h4 className="font-semibold text-foreground">{achievement.name}</h4>
                          {achievement.earned && (
                            <StatusPill status="success">Earned</StatusPill>
                          )}
                        </div>
                        <p className="text-sm text-muted-foreground mt-1">
                          {achievement.description}
                        </p>
                        {achievement.earned ? (
                          <p className="text-xs text-primary mt-2">{achievement.date}</p>
                        ) : (
                          <div className="mt-3">
                            <div className="flex items-center justify-between text-xs mb-1">
                              <span className="text-muted-foreground">Progress</span>
                              <span className="text-foreground">{achievement.progress}%</span>
                            </div>
                            <Progress value={achievement.progress} className="h-1.5" />
                          </div>
                        )}
                      </div>
                    </div>
                  </SurfaceCard>
                </motion.div>
              ))}
            </div>
          </TabsContent>

          <TabsContent value="goals" className="space-y-6">
            <div className="flex items-center justify-between">
              <h3 className="font-semibold text-foreground">My Goals</h3>
              <Button variant="outline">
                <Target className="mr-2 h-4 w-4" />
                Set New Goal
              </Button>
            </div>

            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {goals.map((goal) => {
                const progress = (goal.current / goal.target) * 100
                return (
                  <motion.div key={goal.id} variants={item}>
                    <SurfaceCard>
                      <div className="flex items-center justify-between mb-4">
                        <h4 className="font-medium text-foreground">{goal.name}</h4>
                        <TrendingUp className="h-4 w-4 text-primary" />
                      </div>
                      <div className="flex items-baseline gap-2 mb-3">
                        <span className="text-3xl font-bold text-foreground">
                          {goal.current}
                        </span>
                        <span className="text-muted-foreground">
                          / {goal.target} {goal.unit}
                        </span>
                      </div>
                      <Progress value={Math.min(progress, 100)} className="h-2" />
                      <p className="text-xs text-muted-foreground mt-2">
                        {progress >= 100 ? "Goal achieved!" : `${(100 - progress).toFixed(0)}% remaining`}
                      </p>
                    </SurfaceCard>
                  </motion.div>
                )
              })}
            </div>
          </TabsContent>

          <TabsContent value="settings" className="space-y-6">
            <SurfaceCard>
              <div className="flex items-center gap-6 mb-6">
                <div className="relative">
                  <Avatar className="h-24 w-24">
                    <AvatarImage src={profile.avatar || undefined} />
                    <AvatarFallback className="bg-primary/10 text-primary text-2xl">
                      {formData.firstName[0]}{formData.lastName[0]}
                    </AvatarFallback>
                  </Avatar>
                  <Button
                    size="icon"
                    variant="secondary"
                    className="absolute bottom-0 right-0 h-8 w-8 rounded-full"
                  >
                    <Camera className="h-4 w-4" />
                  </Button>
                </div>
                <div>
                  <h3 className="font-semibold text-foreground">Profile Photo</h3>
                  <p className="text-sm text-muted-foreground">
                    Upload a photo to personalize your profile
                  </p>
                </div>
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="firstName">First Name</Label>
                  <Input
                    id="firstName"
                    value={formData.firstName}
                    onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="lastName">Last Name</Label>
                  <Input
                    id="lastName"
                    value={formData.lastName}
                    onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="phone">Phone</Label>
                  <Input
                    id="phone"
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  />
                </div>
                <div className="space-y-2 md:col-span-2">
                  <Label htmlFor="bio">Bio</Label>
                  <Textarea
                    id="bio"
                    value={formData.bio}
                    onChange={(e) => setFormData({ ...formData, bio: e.target.value })}
                    rows={3}
                  />
                </div>
                <div className="space-y-2 md:col-span-2">
                  <Label htmlFor="goals">Fitness Goals</Label>
                  <Textarea
                    id="goals"
                    value={formData.goals}
                    onChange={(e) => setFormData({ ...formData, goals: e.target.value })}
                    rows={2}
                  />
                </div>
              </div>

              <div className="flex justify-end mt-6 pt-6 border-t border-border">
                <Button onClick={handleSave}>
                  <Save className="mr-2 h-4 w-4" />
                  Save Changes
                </Button>
              </div>
            </SurfaceCard>
          </TabsContent>
        </Tabs>
      </motion.div>
    </motion.div>
  )
}
