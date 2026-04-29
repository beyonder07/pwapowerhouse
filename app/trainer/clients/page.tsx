"use client"

import { useState } from "react"
import { motion } from "framer-motion"
import { PageIntro, SurfaceCard, SearchToolbar, StatusPill, MemberCard, EmptyState } from "@/components/powerhouse"
import { Button } from "@/components/ui/button"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
  Plus,
  Users,
  UserPlus,
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
const clients = [
  {
    id: "1",
    name: "Alex Johnson",
    email: "alex@example.com",
    avatar: null,
    status: "active" as const,
    memberSince: "Nov 2025",
    totalSessions: 24,
    lastSession: "Today",
    plan: "Premium",
    goals: "Build muscle, lose fat",
  },
  {
    id: "2",
    name: "Maria Garcia",
    email: "maria@example.com",
    avatar: null,
    status: "active" as const,
    memberSince: "Dec 2025",
    totalSessions: 18,
    lastSession: "Yesterday",
    plan: "Premium",
    goals: "Weight loss, toning",
  },
  {
    id: "3",
    name: "James Wilson",
    email: "james@example.com",
    avatar: null,
    status: "active" as const,
    memberSince: "Jan 2026",
    totalSessions: 12,
    lastSession: "2 days ago",
    plan: "Basic",
    goals: "General fitness",
  },
  {
    id: "4",
    name: "Sarah Chen",
    email: "sarah@example.com",
    avatar: null,
    status: "inactive" as const,
    memberSince: "Oct 2025",
    totalSessions: 8,
    lastSession: "2 weeks ago",
    plan: "Basic",
    goals: "Flexibility, cardio",
  },
  {
    id: "5",
    name: "David Kim",
    email: "david@example.com",
    avatar: null,
    status: "pending" as const,
    memberSince: "Mar 2026",
    totalSessions: 0,
    lastSession: null,
    plan: "Premium",
    goals: "Strength training",
  },
]

export default function TrainerClientsPage() {
  const [search, setSearch] = useState("")
  const [activeTab, setActiveTab] = useState("all")

  const filteredClients = clients
    .filter((client) => {
      if (activeTab === "active") return client.status === "active"
      if (activeTab === "inactive") return client.status === "inactive"
      if (activeTab === "pending") return client.status === "pending"
      return true
    })
    .filter(
      (client) =>
        client.name.toLowerCase().includes(search.toLowerCase()) ||
        client.email.toLowerCase().includes(search.toLowerCase())
    )

  const activeCount = clients.filter((c) => c.status === "active").length
  const inactiveCount = clients.filter((c) => c.status === "inactive").length
  const pendingCount = clients.filter((c) => c.status === "pending").length

  return (
    <motion.div
      variants={container}
      initial="hidden"
      animate="show"
      className="space-y-6"
    >
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <PageIntro
          title="My Clients"
          subtitle={`Managing ${clients.length} clients`}
        />
        <Button asChild>
          <Link href="/trainer/clients/add">
            <UserPlus className="mr-2 h-4 w-4" />
            Add Client
          </Link>
        </Button>
      </div>

      {/* Stats */}
      <motion.div variants={item} className="grid gap-4 sm:grid-cols-3">
        <SurfaceCard>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">Active</p>
              <p className="text-2xl font-bold text-foreground">{activeCount}</p>
            </div>
            <StatusPill status="success">Active</StatusPill>
          </div>
        </SurfaceCard>
        <SurfaceCard>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">Inactive</p>
              <p className="text-2xl font-bold text-foreground">{inactiveCount}</p>
            </div>
            <StatusPill status="neutral">Inactive</StatusPill>
          </div>
        </SurfaceCard>
        <SurfaceCard>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">Pending</p>
              <p className="text-2xl font-bold text-foreground">{pendingCount}</p>
            </div>
            <StatusPill status="warning">Pending</StatusPill>
          </div>
        </SurfaceCard>
      </motion.div>

      <motion.div variants={item}>
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-4">
            <TabsList>
              <TabsTrigger value="all">All ({clients.length})</TabsTrigger>
              <TabsTrigger value="active">Active ({activeCount})</TabsTrigger>
              <TabsTrigger value="inactive">Inactive ({inactiveCount})</TabsTrigger>
              <TabsTrigger value="pending">Pending ({pendingCount})</TabsTrigger>
            </TabsList>
          </div>

          <SearchToolbar
            value={search}
            onChange={setSearch}
            placeholder="Search clients..."
          />

          <TabsContent value={activeTab} className="mt-4">
            {filteredClients.length === 0 ? (
              <EmptyState
                icon={Users}
                title="No clients found"
                description={search ? "Try adjusting your search" : "Add your first client to get started"}
                action={
                  <Button asChild>
                    <Link href="/trainer/clients/add">
                      <Plus className="mr-2 h-4 w-4" />
                      Add Client
                    </Link>
                  </Button>
                }
              />
            ) : (
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {filteredClients.map((client) => (
                  <motion.div key={client.id} variants={item}>
                    <MemberCard
                      name={client.name}
                      email={client.email}
                      avatar={client.avatar}
                      status={client.status}
                      memberSince={client.memberSince}
                      plan={client.plan}
                      href={`/trainer/clients/${client.id}`}
                      stats={[
                        { label: "Sessions", value: client.totalSessions },
                        { label: "Last Active", value: client.lastSession || "Never" },
                      ]}
                    />
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
