"use client"

import { useState } from "react"
import { motion } from "framer-motion"
import { PageIntro, SurfaceCard, StatusPill } from "@/components/powerhouse"
import { Button } from "@/components/ui/button"
import { Calendar } from "@/components/ui/calendar"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
  Clock,
  MapPin,
  Video,
  Plus,
  Settings,
  ChevronLeft,
  ChevronRight,
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
const sessions = [
  {
    id: "1",
    date: new Date(),
    time: "10:00 AM",
    duration: "45 min",
    client: "Alex Johnson",
    avatar: null,
    type: "Strength Training",
    isVirtual: false,
    location: "Floor 2, Station 5",
    status: "confirmed",
  },
  {
    id: "2",
    date: new Date(),
    time: "11:30 AM",
    duration: "30 min",
    client: "Maria Garcia",
    avatar: null,
    type: "HIIT Session",
    isVirtual: true,
    location: null,
    status: "confirmed",
  },
  {
    id: "3",
    date: new Date(),
    time: "2:00 PM",
    duration: "60 min",
    client: "James Wilson",
    avatar: null,
    type: "Personal Training",
    isVirtual: false,
    location: "Floor 1, Free Weights",
    status: "pending",
  },
  {
    id: "4",
    date: new Date(Date.now() + 86400000),
    time: "9:00 AM",
    duration: "45 min",
    client: "Sarah Chen",
    avatar: null,
    type: "Flexibility & Mobility",
    isVirtual: false,
    location: "Yoga Studio",
    status: "confirmed",
  },
  {
    id: "5",
    date: new Date(Date.now() + 86400000),
    time: "11:00 AM",
    duration: "45 min",
    client: "David Kim",
    avatar: null,
    type: "Strength Training",
    isVirtual: false,
    location: "Floor 2, Station 3",
    status: "confirmed",
  },
]

const availabilitySlots = [
  { day: "Monday", slots: ["9:00 AM - 12:00 PM", "2:00 PM - 6:00 PM"] },
  { day: "Tuesday", slots: ["9:00 AM - 12:00 PM", "2:00 PM - 6:00 PM"] },
  { day: "Wednesday", slots: ["9:00 AM - 12:00 PM"] },
  { day: "Thursday", slots: ["9:00 AM - 12:00 PM", "2:00 PM - 6:00 PM"] },
  { day: "Friday", slots: ["9:00 AM - 12:00 PM", "2:00 PM - 5:00 PM"] },
  { day: "Saturday", slots: ["10:00 AM - 2:00 PM"] },
  { day: "Sunday", slots: [] },
]

const formatDate = (date: Date) => {
  const today = new Date()
  const tomorrow = new Date(today)
  tomorrow.setDate(tomorrow.getDate() + 1)

  if (date.toDateString() === today.toDateString()) return "Today"
  if (date.toDateString() === tomorrow.toDateString()) return "Tomorrow"

  return date.toLocaleDateString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
  })
}

export default function TrainerSchedulePage() {
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(new Date())
  const [activeTab, setActiveTab] = useState("sessions")

  const filteredSessions = selectedDate
    ? sessions.filter(
        (s) => s.date.toDateString() === selectedDate.toDateString()
      )
    : sessions

  const sessionDates = sessions.map((s) => s.date.toDateString())

  return (
    <motion.div
      variants={container}
      initial="hidden"
      animate="show"
      className="space-y-6"
    >
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <PageIntro
          title="Schedule"
          subtitle="Manage your sessions and availability"
        />
        <div className="flex gap-2">
          <Button variant="outline" asChild>
            <Link href="/trainer/schedule/manage">
              <Settings className="mr-2 h-4 w-4" />
              Availability
            </Link>
          </Button>
          <Button asChild>
            <Link href="/trainer/schedule/create">
              <Plus className="mr-2 h-4 w-4" />
              Add Session
            </Link>
          </Button>
        </div>
      </div>

      <motion.div variants={item}>
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="mb-4">
            <TabsTrigger value="sessions">Sessions</TabsTrigger>
            <TabsTrigger value="availability">Availability</TabsTrigger>
          </TabsList>

          <TabsContent value="sessions">
            <div className="grid gap-6 lg:grid-cols-3">
              {/* Calendar */}
              <SurfaceCard className="lg:col-span-1">
                <Calendar
                  mode="single"
                  selected={selectedDate}
                  onSelect={setSelectedDate}
                  className="w-full"
                  modifiers={{
                    hasSession: (date) => sessionDates.includes(date.toDateString()),
                  }}
                  modifiersStyles={{
                    hasSession: {
                      fontWeight: "bold",
                      textDecoration: "underline",
                      textDecorationColor: "hsl(var(--primary))",
                    },
                  }}
                />
                <div className="mt-4 pt-4 border-t border-border">
                  <Button
                    variant="outline"
                    className="w-full"
                    onClick={() => setSelectedDate(undefined)}
                  >
                    Show All Sessions
                  </Button>
                </div>
              </SurfaceCard>

              {/* Sessions List */}
              <div className="lg:col-span-2 space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="font-semibold text-foreground">
                    {selectedDate ? formatDate(selectedDate) : "All Upcoming Sessions"}
                  </h3>
                  <span className="text-sm text-muted-foreground">
                    {filteredSessions.length} session{filteredSessions.length !== 1 ? "s" : ""}
                  </span>
                </div>

                {filteredSessions.length === 0 ? (
                  <SurfaceCard className="text-center py-12">
                    <p className="text-muted-foreground">No sessions scheduled for this day</p>
                    <Button variant="link" className="mt-2" asChild>
                      <Link href="/trainer/schedule/create">Schedule a Session</Link>
                    </Button>
                  </SurfaceCard>
                ) : (
                  <div className="space-y-3">
                    {filteredSessions.map((session) => (
                      <motion.div key={session.id} variants={item}>
                        <SurfaceCard className="hover:border-primary/50 transition-colors">
                          <div className="flex flex-col sm:flex-row sm:items-center gap-4">
                            <div className="flex items-center gap-4 flex-1">
                              <div className="text-center min-w-[70px]">
                                <p className="font-semibold text-foreground">{session.time}</p>
                                <p className="text-xs text-muted-foreground">{session.duration}</p>
                              </div>

                              <div className="flex items-center gap-3 flex-1">
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
                            </div>

                            <div className="flex items-center gap-3 sm:justify-end">
                              <div className="flex items-center gap-2">
                                {session.isVirtual ? (
                                  <StatusPill status="info">
                                    <Video className="h-3 w-3 mr-1" />
                                    Virtual
                                  </StatusPill>
                                ) : (
                                  <div className="flex items-center gap-1 text-sm text-muted-foreground">
                                    <MapPin className="h-4 w-4" />
                                    <span className="hidden sm:inline">{session.location}</span>
                                  </div>
                                )}
                                <StatusPill
                                  status={session.status === "confirmed" ? "success" : "warning"}
                                >
                                  {session.status}
                                </StatusPill>
                              </div>
                              {session.isVirtual ? (
                                <Button size="sm">Join</Button>
                              ) : (
                                <Button size="sm" variant="outline">View</Button>
                              )}
                            </div>
                          </div>
                        </SurfaceCard>
                      </motion.div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </TabsContent>

          <TabsContent value="availability">
            <SurfaceCard>
              <div className="flex items-center justify-between mb-6">
                <h3 className="font-semibold text-foreground">Weekly Availability</h3>
                <Button variant="outline" size="sm" asChild>
                  <Link href="/trainer/schedule/manage">
                    <Settings className="mr-2 h-4 w-4" />
                    Edit
                  </Link>
                </Button>
              </div>

              <div className="space-y-4">
                {availabilitySlots.map((day) => (
                  <div
                    key={day.day}
                    className="flex items-start gap-4 p-3 rounded-lg bg-muted/30"
                  >
                    <div className="w-24 font-medium text-foreground">{day.day}</div>
                    <div className="flex-1">
                      {day.slots.length === 0 ? (
                        <span className="text-muted-foreground text-sm">Not available</span>
                      ) : (
                        <div className="flex flex-wrap gap-2">
                          {day.slots.map((slot, index) => (
                            <StatusPill key={index} status="success">
                              <Clock className="h-3 w-3 mr-1" />
                              {slot}
                            </StatusPill>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </SurfaceCard>
          </TabsContent>
        </Tabs>
      </motion.div>
    </motion.div>
  )
}
