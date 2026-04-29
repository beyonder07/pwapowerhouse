"use client"

import { useState } from "react"
import { motion } from "framer-motion"
import { PageIntro, SurfaceCard, StatusPill } from "@/components/powerhouse"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
  Camera,
  Save,
  Star,
  Users,
  Calendar,
  Award,
  Plus,
  X,
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
  firstName: "Mike",
  lastName: "Torres",
  email: "mike@powerhouse.com",
  phone: "+1 (555) 987-6543",
  bio: "NASM certified personal trainer with 8+ years of experience specializing in strength training and bodybuilding. Passionate about helping clients achieve their fitness goals through personalized training programs.",
  specialties: ["Strength Training", "Bodybuilding", "Weight Loss", "Sports Performance"],
  certifications: ["NASM-CPT", "ACE Certified", "CrossFit Level 2", "First Aid/CPR"],
  avatar: null,
  hourlyRate: 120,
  branch: "Downtown Branch",
}

const stats = {
  totalClients: 45,
  activeClients: 24,
  totalSessions: 1250,
  rating: 4.9,
  reviewCount: 127,
  yearsExperience: 8,
}

const reviews = [
  {
    id: "1",
    client: "Alex Johnson",
    rating: 5,
    comment: "Mike is an incredible trainer! His knowledge and motivational style have helped me achieve results I never thought possible.",
    date: "Mar 20, 2026",
  },
  {
    id: "2",
    client: "Maria Garcia",
    rating: 5,
    comment: "Best trainer I've ever worked with. Very professional and always pushes me to do my best.",
    date: "Mar 15, 2026",
  },
  {
    id: "3",
    client: "James Wilson",
    rating: 4,
    comment: "Great workouts and very knowledgeable. Would definitely recommend!",
    date: "Mar 10, 2026",
  },
]

export default function TrainerProfilePage() {
  const [formData, setFormData] = useState(profile)
  const [newSpecialty, setNewSpecialty] = useState("")

  const handleAddSpecialty = () => {
    if (newSpecialty.trim() && !formData.specialties.includes(newSpecialty.trim())) {
      setFormData({
        ...formData,
        specialties: [...formData.specialties, newSpecialty.trim()],
      })
      setNewSpecialty("")
    }
  }

  const handleRemoveSpecialty = (specialty: string) => {
    setFormData({
      ...formData,
      specialties: formData.specialties.filter((s) => s !== specialty),
    })
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
        subtitle="Manage your trainer profile and view your stats"
      />

      <motion.div variants={item}>
        <Tabs defaultValue="overview">
          <TabsList className="mb-4">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="reviews">Reviews</TabsTrigger>
            <TabsTrigger value="edit">Edit Profile</TabsTrigger>
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
                  <div className="flex items-center gap-3 mb-2">
                    <h2 className="text-2xl font-bold text-foreground">
                      {profile.firstName} {profile.lastName}
                    </h2>
                    <StatusPill status="success">Verified Trainer</StatusPill>
                  </div>
                  <p className="text-muted-foreground mb-4">{profile.bio}</p>
                  <div className="flex flex-wrap gap-2">
                    {profile.specialties.map((specialty) => (
                      <Badge key={specialty} variant="secondary">
                        {specialty}
                      </Badge>
                    ))}
                  </div>
                </div>
                <div className="text-center">
                  <div className="flex items-center gap-1 text-yellow-500 mb-1">
                    <Star className="h-5 w-5 fill-current" />
                    <span className="text-xl font-bold">{stats.rating}</span>
                  </div>
                  <p className="text-sm text-muted-foreground">{stats.reviewCount} reviews</p>
                </div>
              </div>
            </SurfaceCard>

            {/* Stats Grid */}
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <SurfaceCard>
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-primary/10">
                    <Users className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold text-foreground">{stats.activeClients}</p>
                    <p className="text-sm text-muted-foreground">Active Clients</p>
                  </div>
                </div>
              </SurfaceCard>

              <SurfaceCard>
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-primary/10">
                    <Calendar className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold text-foreground">{stats.totalSessions.toLocaleString()}</p>
                    <p className="text-sm text-muted-foreground">Total Sessions</p>
                  </div>
                </div>
              </SurfaceCard>

              <SurfaceCard>
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-primary/10">
                    <Award className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold text-foreground">{stats.yearsExperience}+</p>
                    <p className="text-sm text-muted-foreground">Years Experience</p>
                  </div>
                </div>
              </SurfaceCard>

              <SurfaceCard>
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-primary/10">
                    <Star className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold text-foreground">{stats.rating}</p>
                    <p className="text-sm text-muted-foreground">Average Rating</p>
                  </div>
                </div>
              </SurfaceCard>
            </div>

            {/* Certifications */}
            <SurfaceCard>
              <h3 className="font-semibold text-foreground mb-4">Certifications</h3>
              <div className="flex flex-wrap gap-3">
                {profile.certifications.map((cert) => (
                  <div
                    key={cert}
                    className="flex items-center gap-2 px-3 py-2 rounded-lg bg-primary/10 border border-primary/20"
                  >
                    <Award className="h-4 w-4 text-primary" />
                    <span className="text-sm font-medium text-foreground">{cert}</span>
                  </div>
                ))}
              </div>
            </SurfaceCard>
          </TabsContent>

          <TabsContent value="reviews" className="space-y-4">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-1 text-yellow-500">
                  <Star className="h-6 w-6 fill-current" />
                  <span className="text-2xl font-bold">{stats.rating}</span>
                </div>
                <span className="text-muted-foreground">
                  Based on {stats.reviewCount} reviews
                </span>
              </div>
            </div>

            {reviews.map((review) => (
              <motion.div key={review.id} variants={item}>
                <SurfaceCard>
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center gap-3">
                      <Avatar className="h-10 w-10">
                        <AvatarFallback className="bg-primary/10 text-primary">
                          {review.client.split(" ").map((n) => n[0]).join("")}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <p className="font-medium text-foreground">{review.client}</p>
                        <p className="text-xs text-muted-foreground">{review.date}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-1 text-yellow-500">
                      {Array.from({ length: 5 }).map((_, i) => (
                        <Star
                          key={i}
                          className={`h-4 w-4 ${
                            i < review.rating ? "fill-current" : "fill-none"
                          }`}
                        />
                      ))}
                    </div>
                  </div>
                  <p className="text-muted-foreground">{review.comment}</p>
                </SurfaceCard>
              </motion.div>
            ))}
          </TabsContent>

          <TabsContent value="edit" className="space-y-6">
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
                    Upload a professional photo for your profile
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
                <div className="space-y-2">
                  <Label htmlFor="hourlyRate">Hourly Rate ($)</Label>
                  <Input
                    id="hourlyRate"
                    type="number"
                    value={formData.hourlyRate}
                    onChange={(e) => setFormData({ ...formData, hourlyRate: parseInt(e.target.value) })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="branch">Branch</Label>
                  <Input
                    id="branch"
                    value={formData.branch}
                    onChange={(e) => setFormData({ ...formData, branch: e.target.value })}
                    disabled
                  />
                </div>
                <div className="space-y-2 md:col-span-2">
                  <Label htmlFor="bio">Bio</Label>
                  <Textarea
                    id="bio"
                    value={formData.bio}
                    onChange={(e) => setFormData({ ...formData, bio: e.target.value })}
                    rows={4}
                  />
                </div>
              </div>
            </SurfaceCard>

            {/* Specialties */}
            <SurfaceCard>
              <h3 className="font-semibold text-foreground mb-4">Specialties</h3>
              <div className="flex flex-wrap gap-2 mb-4">
                {formData.specialties.map((specialty) => (
                  <Badge key={specialty} variant="secondary" className="gap-1">
                    {specialty}
                    <button
                      onClick={() => handleRemoveSpecialty(specialty)}
                      className="ml-1 hover:text-destructive"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </Badge>
                ))}
              </div>
              <div className="flex gap-2">
                <Input
                  value={newSpecialty}
                  onChange={(e) => setNewSpecialty(e.target.value)}
                  placeholder="Add a specialty..."
                  onKeyPress={(e) => e.key === "Enter" && handleAddSpecialty()}
                />
                <Button variant="outline" onClick={handleAddSpecialty}>
                  <Plus className="h-4 w-4" />
                </Button>
              </div>
            </SurfaceCard>

            <div className="flex justify-end">
              <Button>
                <Save className="mr-2 h-4 w-4" />
                Save Changes
              </Button>
            </div>
          </TabsContent>
        </Tabs>
      </motion.div>
    </motion.div>
  )
}
