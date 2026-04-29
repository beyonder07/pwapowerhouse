"use client"

import { useState } from "react"
import { motion } from "framer-motion"
import { PageIntro, SurfaceCard, StatusPill } from "@/components/powerhouse"
import { Button } from "@/components/ui/button"
import { Calendar } from "@/components/ui/calendar"
import {
  ChevronLeft,
  ChevronRight,
  Clock,
  User,
  MapPin,
  Video,
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
const scheduledSessions = [
  {
    id: "1",
    date: new Date(),
    time: "10:00 AM",
    duration: "45 min",
    type: "Personal Training",
    trainer: "Mike Torres",
    location: "Downtown Branch",
    isVirtual: false,
    status: "confirmed",
  },
  {
    id: "2",
    date: new Date(Date.now() + 86400000),
    time: "9:00 AM",
    duration: "30 min",
    type: "HIIT Class",
    trainer: "Sarah Lee",
    location: null,
    isVirtual: true,
    status: "confirmed",
  },
  {
    id: "3",
    date: new Date(Date.now() + 86400000 * 2),
    time: "11:00 AM",
    duration: "50 min",
    type: "Personal Training",
    trainer: "Mike Torres",
    location: "Downtown Branch",
    isVirtual: false,
    status: "pending",
  },
  {
    id: "4",
    date: new Date(Date.now() + 86400000 * 4),
    time: "10:00 AM",
    duration: "35 min",
    type: "Yoga Session",
    trainer: "Sarah Lee",
    location: "Westside Branch",
    isVirtual: false,
    status: "confirmed",
  },
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

export default function ClientSchedulePage() {
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(new Date())

  const filteredSessions = selectedDate
    ? scheduledSessions.filter(
        (s) => s.date.toDateString() === selectedDate.toDateString()
      )
    : scheduledSessions

  const sessionDates = scheduledSessions.map((s) => s.date.toDateString())

  return (
    <motion.div
      variants={container}
      initial="hidden"
      animate="show"
      className="space-y-6"
    >
      <PageIntro
        title="My Schedule"
        subtitle="View and manage your upcoming training sessions"
      />

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Calendar */}
        <motion.div variants={item} className="lg:col-span-1">
          <SurfaceCard>
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
        </motion.div>

        {/* Sessions List */}
        <motion.div variants={item} className="lg:col-span-2 space-y-4">
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
              <Button variant="link" className="mt-2">
                Request a Session
              </Button>
            </SurfaceCard>
          ) : (
            <div className="space-y-4">
              {filteredSessions.map((session) => (
                <motion.div key={session.id} variants={item}>
                  <SurfaceCard className="hover:border-primary/50 transition-colors">
                    <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
                      <div className="space-y-3">
                        <div className="flex items-center gap-3">
                          <h4 className="font-semibold text-foreground">
                            {session.type}
                          </h4>
                          <StatusPill
                            status={
                              session.status === "confirmed" ? "success" : "warning"
                            }
                          >
                            {session.status}
                          </StatusPill>
                          {session.isVirtual && (
                            <StatusPill status="info">
                              <Video className="h-3 w-3 mr-1" />
                              Virtual
                            </StatusPill>
                          )}
                        </div>

                        <div className="flex flex-wrap items-center gap-4 text-sm text-muted-foreground">
                          <div className="flex items-center gap-1">
                            <Clock className="h-4 w-4" />
                            {session.time} ({session.duration})
                          </div>
                          <div className="flex items-center gap-1">
                            <User className="h-4 w-4" />
                            {session.trainer}
                          </div>
                          {session.location && (
                            <div className="flex items-center gap-1">
                              <MapPin className="h-4 w-4" />
                              {session.location}
                            </div>
                          )}
                        </div>

                        <p className="text-sm text-muted-foreground">
                          {formatDate(session.date)}
                        </p>
                      </div>

                      <div className="flex items-center gap-2 sm:flex-col">
                        {session.isVirtual && (
                          <Button size="sm">
                            <Video className="mr-2 h-4 w-4" />
                            Join
                          </Button>
                        )}
                        <Button variant="outline" size="sm">
                          Reschedule
                        </Button>
                      </div>
                    </div>
                  </SurfaceCard>
                </motion.div>
              ))}
            </div>
          )}
        </motion.div>
      </div>
    </motion.div>
  )
}
