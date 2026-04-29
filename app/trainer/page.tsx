"use client"

import { motion } from "framer-motion"
import { MetricCard, SurfaceCard, StatusPill, PageIntro } from "@/components/powerhouse"
import { Button } from "@/components/ui/button"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import {
  Users,
  Calendar,
  DollarSign,
  Star,
  Clock,
  ChevronRight,
  Video,
  MapPin,
} from "lucide-react"
import Link from "next/link"

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
const todaySessions = [
  {
    id: "1",
    client: "Alex Johnson",
    avatar: null,
    time: "10:00 AM",
    duration: "45 min",
    type: "Strength Training",
    isVirtual: false,
    location: "Floor 2, Station 5",
  },
  {
    id: "2",
    client: "Maria Garcia",
    avatar: null,
    time: "11:30 AM",
    duration: "30 min",
    type: "HIIT Session",
    isVirtual: true,
    location: null,
  },
  {
    id: "3",
    client: "James Wilson",
    avatar: null,
    time: "2:00 PM",
    duration: "60 min",
    type: "Personal Training",
    isVirtual: false,
    location: "Floor 1, Free Weights",
  },
]

const recentClients = [
  { id: "1", name: "Alex Johnson", sessions: 24, lastSession: "Today" },
  { id: "2", name: "Maria Garcia", sessions: 18, lastSession: "Yesterday" },
  { id: "3", name: "James Wilson", sessions: 12, lastSession: "2 days ago" },
  { id: "4", name: "Sarah Chen", sessions: 8, lastSession: "3 days ago" },
]

const stats = {
  activeClients: 24,
  sessionsThisWeek: 18,
  monthlyEarnings: 4850,
  averageRating: 4.9,
}

export default function TrainerDashboard() {
  return (
    <motion.div
      variants={container}
      initial="hidden"
      animate="show"
      className="space-y-6"
    >
      <PageIntro
        title="Good morning, Mike"
        subtitle="You have 3 sessions scheduled today"
      />

      {/* Stats Overview */}
      <motion.div variants={item} className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <MetricCard
          label="Active Clients"
          value={stats.activeClients}
          icon={Users}
          trend={{ value: 12, isPositive: true }}
          accentColor="red"
        />
        <MetricCard
          label="Sessions This Week"
          value={stats.sessionsThisWeek}
          icon={Calendar}
          trend={{ value: 8, isPositive: true }}
          accentColor="red"
        />
        <MetricCard
          label="Monthly Earnings"
          value={`₹${stats.monthlyEarnings.toLocaleString()}`}
          icon={DollarSign}
          trend={{ value: 15, isPositive: true }}
          accentColor="red"
        />
        <MetricCard
          label="Average Rating"
          value={stats.averageRating}
          icon={Star}
          subValue="127 reviews"
          accentColor="red"
        />
      </motion.div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Today's Schedule */}
        <motion.div variants={item} className="lg:col-span-2">
          <SurfaceCard>
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold text-foreground">{"Today's Schedule"}</h3>
              <Button variant="ghost" size="sm" asChild>
                <Link href="/trainer/schedule">
                  View Full Schedule
                  <ChevronRight className="ml-1 h-4 w-4" />
                </Link>
              </Button>
            </div>

            <div className="space-y-4">
              {todaySessions.map((session, index) => (
                <div
                  key={session.id}
                  className="flex items-center gap-4 p-4 rounded-lg bg-muted/50 hover:bg-muted transition-colors"
                >
                  <div className="flex-shrink-0 w-20 text-center">
                    <p className="font-semibold text-foreground">{session.time}</p>
                    <p className="text-xs text-muted-foreground">{session.duration}</p>
                  </div>

                  <div className="flex-1 flex items-center gap-3">
                    <Avatar className="h-10 w-10">
                      <AvatarImage src={session.avatar || undefined} />
                      <AvatarFallback className="bg-primary/10 text-primary">
                        {session.client.split(" ").map((n) => n[0]).join("")}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <p className="font-medium text-foreground">{session.client}</p>
                      <p className="text-sm text-muted-foreground">{session.type}</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    {session.isVirtual ? (
                      <StatusPill status="info">
                        <Video className="h-3 w-3 mr-1" />
                        Virtual
                      </StatusPill>
                    ) : (
                      <div className="flex items-center gap-1 text-sm text-muted-foreground">
                        <MapPin className="h-4 w-4" />
                        {session.location}
                      </div>
                    )}
                    {session.isVirtual ? (
                      <Button size="sm">Join</Button>
                    ) : (
                      <Button size="sm" variant="outline">Details</Button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </SurfaceCard>
        </motion.div>

        {/* Recent Clients */}
        <motion.div variants={item}>
          <SurfaceCard className="h-full">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold text-foreground">Recent Clients</h3>
              <Button variant="ghost" size="sm" asChild>
                <Link href="/trainer/clients">
                  View All
                  <ChevronRight className="ml-1 h-4 w-4" />
                </Link>
              </Button>
            </div>

            <div className="space-y-3">
              {recentClients.map((client) => (
                <Link
                  key={client.id}
                  href={`/trainer/clients/${client.id}`}
                  className="flex items-center justify-between p-3 rounded-lg hover:bg-muted/50 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <Avatar className="h-9 w-9">
                      <AvatarFallback className="bg-primary/10 text-primary text-sm">
                        {client.name.split(" ").map((n) => n[0]).join("")}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <p className="font-medium text-foreground text-sm">{client.name}</p>
                      <p className="text-xs text-muted-foreground">{client.sessions} sessions</p>
                    </div>
                  </div>
                  <span className="text-xs text-muted-foreground">{client.lastSession}</span>
                </Link>
              ))}
            </div>
          </SurfaceCard>
        </motion.div>
      </div>

      {/* Quick Actions */}
      <motion.div variants={item}>
        <SurfaceCard>
          <h3 className="font-semibold text-foreground mb-4">Quick Actions</h3>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <Button variant="outline" className="h-auto py-4 flex-col gap-2" asChild>
              <Link href="/trainer/workouts/create">
                <Calendar className="h-5 w-5" />
                <span>Create Workout</span>
              </Link>
            </Button>
            <Button variant="outline" className="h-auto py-4 flex-col gap-2" asChild>
              <Link href="/trainer/schedule/manage">
                <Clock className="h-5 w-5" />
                <span>Manage Availability</span>
              </Link>
            </Button>
            <Button variant="outline" className="h-auto py-4 flex-col gap-2" asChild>
              <Link href="/trainer/clients/add">
                <Users className="h-5 w-5" />
                <span>Add Client</span>
              </Link>
            </Button>
            <Button variant="outline" className="h-auto py-4 flex-col gap-2" asChild>
              <Link href="/trainer/messages">
                <Star className="h-5 w-5" />
                <span>View Messages</span>
              </Link>
            </Button>
          </div>
        </SurfaceCard>
      </motion.div>
    </motion.div>
  )
}
