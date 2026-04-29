"use client"

import { useState } from "react"
import { motion } from "framer-motion"
import { PageIntro, SurfaceCard, SearchToolbar, StatusPill } from "@/components/powerhouse"
import { Button } from "@/components/ui/button"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
  Star,
  MessageSquare,
  Calendar,
  Award,
  Clock,
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
const myTrainers = [
  {
    id: "1",
    name: "Mike Torres",
    avatar: null,
    specialties: ["Strength Training", "Bodybuilding"],
    rating: 4.9,
    reviewCount: 127,
    sessionsCompleted: 24,
    nextSession: "Today, 10:00 AM",
    branch: "Downtown Branch",
    bio: "NASM certified trainer with 8+ years of experience in strength and conditioning.",
  },
  {
    id: "2",
    name: "Sarah Lee",
    avatar: null,
    specialties: ["HIIT", "Yoga", "Flexibility"],
    rating: 4.8,
    reviewCount: 98,
    sessionsCompleted: 12,
    nextSession: "Tomorrow, 9:00 AM",
    branch: "Westside Branch",
    bio: "Certified yoga instructor and HIIT specialist focused on functional fitness.",
  },
]

const availableTrainers = [
  {
    id: "3",
    name: "Carlos Rodriguez",
    avatar: null,
    specialties: ["CrossFit", "Olympic Lifting"],
    rating: 4.7,
    reviewCount: 85,
    branch: "Downtown Branch",
    availability: "Mon, Wed, Fri",
  },
  {
    id: "4",
    name: "Emma Wilson",
    avatar: null,
    specialties: ["Pilates", "Rehabilitation"],
    rating: 4.9,
    reviewCount: 156,
    branch: "Eastside Branch",
    availability: "Tue, Thu, Sat",
  },
  {
    id: "5",
    name: "David Kim",
    avatar: null,
    specialties: ["Boxing", "Cardio Kickboxing"],
    rating: 4.6,
    reviewCount: 72,
    branch: "Downtown Branch",
    availability: "Daily",
  },
]

export default function ClientTrainersPage() {
  const [search, setSearch] = useState("")
  const [activeTab, setActiveTab] = useState("my-trainers")

  const filteredMyTrainers = myTrainers.filter(
    (t) =>
      t.name.toLowerCase().includes(search.toLowerCase()) ||
      t.specialties.some((s) => s.toLowerCase().includes(search.toLowerCase()))
  )

  const filteredAvailableTrainers = availableTrainers.filter(
    (t) =>
      t.name.toLowerCase().includes(search.toLowerCase()) ||
      t.specialties.some((s) => s.toLowerCase().includes(search.toLowerCase()))
  )

  return (
    <motion.div
      variants={container}
      initial="hidden"
      animate="show"
      className="space-y-6"
    >
      <PageIntro
        title="My Trainers"
        subtitle="Connect with your trainers and explore new ones"
      />

      <motion.div variants={item}>
        <SearchToolbar
          value={search}
          onChange={setSearch}
          placeholder="Search trainers or specialties..."
        />
      </motion.div>

      <motion.div variants={item}>
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="mb-4">
            <TabsTrigger value="my-trainers">My Trainers</TabsTrigger>
            <TabsTrigger value="explore">Explore</TabsTrigger>
          </TabsList>

          <TabsContent value="my-trainers" className="space-y-4">
            {filteredMyTrainers.map((trainer) => (
              <motion.div key={trainer.id} variants={item}>
                <SurfaceCard className="hover:border-primary/50 transition-colors">
                  <div className="flex flex-col md:flex-row gap-6">
                    <div className="flex items-start gap-4">
                      <Avatar className="h-16 w-16">
                        <AvatarImage src={trainer.avatar || undefined} />
                        <AvatarFallback className="bg-primary/10 text-primary text-lg">
                          {trainer.name.split(" ").map((n) => n[0]).join("")}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1">
                        <h3 className="font-semibold text-foreground text-lg">
                          {trainer.name}
                        </h3>
                        <div className="flex items-center gap-2 mt-1">
                          <div className="flex items-center gap-1 text-yellow-500">
                            <Star className="h-4 w-4 fill-current" />
                            <span className="text-sm font-medium">{trainer.rating}</span>
                          </div>
                          <span className="text-sm text-muted-foreground">
                            ({trainer.reviewCount} reviews)
                          </span>
                        </div>
                        <div className="flex flex-wrap gap-2 mt-2">
                          {trainer.specialties.map((specialty) => (
                            <StatusPill key={specialty} status="neutral">
                              {specialty}
                            </StatusPill>
                          ))}
                        </div>
                      </div>
                    </div>

                    <div className="flex-1 space-y-2 text-sm">
                      <p className="text-muted-foreground">{trainer.bio}</p>
                      <div className="flex items-center gap-4 pt-2">
                        <div className="flex items-center gap-1 text-muted-foreground">
                          <Award className="h-4 w-4" />
                          {trainer.sessionsCompleted} sessions
                        </div>
                        <div className="flex items-center gap-1 text-muted-foreground">
                          <MapPin className="h-4 w-4" />
                          {trainer.branch}
                        </div>
                      </div>
                      {trainer.nextSession && (
                        <div className="flex items-center gap-1 text-primary">
                          <Clock className="h-4 w-4" />
                          Next: {trainer.nextSession}
                        </div>
                      )}
                    </div>

                    <div className="flex flex-row md:flex-col gap-2">
                      <Button asChild>
                        <Link href={`/client/trainers/${trainer.id}/book`}>
                          <Calendar className="mr-2 h-4 w-4" />
                          Book
                        </Link>
                      </Button>
                      <Button variant="outline">
                        <MessageSquare className="mr-2 h-4 w-4" />
                        Message
                      </Button>
                    </div>
                  </div>
                </SurfaceCard>
              </motion.div>
            ))}
          </TabsContent>

          <TabsContent value="explore" className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {filteredAvailableTrainers.map((trainer) => (
                <motion.div key={trainer.id} variants={item}>
                  <SurfaceCard className="h-full hover:border-primary/50 transition-colors">
                    <div className="flex items-center gap-4 mb-4">
                      <Avatar className="h-12 w-12">
                        <AvatarImage src={trainer.avatar || undefined} />
                        <AvatarFallback className="bg-primary/10 text-primary">
                          {trainer.name.split(" ").map((n) => n[0]).join("")}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <h3 className="font-semibold text-foreground">{trainer.name}</h3>
                        <div className="flex items-center gap-1 text-yellow-500">
                          <Star className="h-3 w-3 fill-current" />
                          <span className="text-xs font-medium">{trainer.rating}</span>
                          <span className="text-xs text-muted-foreground">
                            ({trainer.reviewCount})
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="flex flex-wrap gap-1 mb-3">
                      {trainer.specialties.map((specialty) => (
                        <StatusPill key={specialty} status="neutral">
                          {specialty}
                        </StatusPill>
                      ))}
                    </div>

                    <div className="space-y-2 text-sm text-muted-foreground mb-4">
                      <div className="flex items-center gap-1">
                        <MapPin className="h-4 w-4" />
                        {trainer.branch}
                      </div>
                      <div className="flex items-center gap-1">
                        <Clock className="h-4 w-4" />
                        Available: {trainer.availability}
                      </div>
                    </div>

                    <Button className="w-full" variant="outline">
                      View Profile
                    </Button>
                  </SurfaceCard>
                </motion.div>
              ))}
            </div>
          </TabsContent>
        </Tabs>
      </motion.div>
    </motion.div>
  )
}
