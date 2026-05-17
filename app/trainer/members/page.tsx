"use client"

import { useEffect, useMemo, useState } from "react"
import { CalendarDays, Dumbbell, Loader2, SearchX, Target, Users } from "lucide-react"
import { toast } from "sonner"
import {
  EmptyState,
  PageIntro,
  SearchToolbar,
  StatusPill,
  SurfaceCard,
} from "@/components/powerhouse"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"

interface TrainerMember {
  id: string
  name: string
  avatarUrl: string | null
  membershipPlan: string
  membershipStatus: "active" | "expiring" | "expired"
  membershipStatusLabel: string
  expiryDate: string | null
  lastAttendance: string
  activity: "present_today" | "recent" | "inactive" | "no_attendance"
  currentWorkoutPlan: string
  workoutPlanStatus: "active" | "pending"
  workoutProgress: string
  fitnessGoal: string | null
}

interface MembersResponse {
  members: TrainerMember[]
  count: number
}

function initials(name: string) {
  return name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("")
}

function membershipTone(status: TrainerMember["membershipStatus"]) {
  if (status === "active") return "active"
  if (status === "expiring") return "warning"
  return "expired"
}

function activityTone(activity: TrainerMember["activity"]) {
  if (activity === "present_today") return "success"
  if (activity === "recent") return "info"
  if (activity === "inactive") return "error"
  return "neutral"
}

export default function TrainerMembersPage() {
  const [members, setMembers] = useState<TrainerMember[]>([])
  const [search, setSearch] = useState("")
  const [status, setStatus] = useState("all")
  const [activity, setActivity] = useState("all")
  const [isLoading, setIsLoading] = useState(true)

  const queryString = useMemo(() => {
    const params = new URLSearchParams()
    if (search.trim()) params.set("search", search.trim())
    params.set("status", status)
    params.set("activity", activity)
    return params.toString()
  }, [activity, search, status])

  useEffect(() => {
    let mounted = true

    async function loadMembers() {
      setIsLoading(true)

      try {
        const response = await fetch(`/api/trainer/members?${queryString}`, {
          credentials: "include",
          cache: "no-store",
        })
        const result = await response.json()

        if (!response.ok || !result.success) {
          throw new Error(result.error || "Unable to load members")
        }

        if (mounted) {
          setMembers((result.data as MembersResponse).members)
        }
      } catch (error) {
        toast.error("Members unavailable", {
          description:
            error instanceof Error
              ? error.message
              : "Please refresh and try again.",
        })
      } finally {
        if (mounted) setIsLoading(false)
      }
    }

    loadMembers()

    return () => {
      mounted = false
    }
  }, [queryString])

  return (
    <div className="space-y-5">
      <PageIntro
        title="Members"
        description="Operational coaching view for all gym members"
      />

      <SearchToolbar
        value={search}
        onChange={setSearch}
        placeholder="Search member name..."
        filters={[
          {
            value: status,
            onChange: setStatus,
            placeholder: "Status",
            options: [
              { value: "all", label: "All Status" },
              { value: "active", label: "Active" },
              { value: "expiring", label: "Expiring Soon" },
              { value: "expired", label: "Expired" },
            ],
          },
          {
            value: activity,
            onChange: setActivity,
            placeholder: "Activity",
            options: [
              { value: "all", label: "All Activity" },
              { value: "present_today", label: "Present Today" },
              { value: "recent", label: "Recently Seen" },
              { value: "inactive", label: "Inactive" },
              { value: "no_attendance", label: "No Attendance" },
            ],
          },
        ]}
      />

      {isLoading ? (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {Array.from({ length: 6 }).map((_, index) => (
            <div
              key={index}
              className="h-48 animate-pulse rounded-xl border border-border bg-card"
            />
          ))}
        </div>
      ) : members.length === 0 ? (
        <EmptyState
          icon={search || status !== "all" || activity !== "all" ? SearchX : Users}
          title={
            activity === "inactive"
              ? "No inactive members"
              : "No members found"
          }
          description={
            search || status !== "all" || activity !== "all"
              ? "Try changing the search or filters."
              : "Members will appear here once they are added to the gym."
          }
        />
      ) : (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {members.map((member) => (
            <SurfaceCard key={member.id} className="space-y-4">
              <div className="flex items-start gap-3">
                <Avatar className="h-12 w-12">
                  <AvatarImage src={member.avatarUrl ?? undefined} alt={member.name} />
                  <AvatarFallback className="bg-primary/10 text-sm font-semibold text-primary">
                    {initials(member.name)}
                  </AvatarFallback>
                </Avatar>
                <div className="min-w-0 flex-1">
                  <h2 className="truncate text-base font-semibold text-foreground">
                    {member.name}
                  </h2>
                  <p className="truncate text-sm text-muted-foreground">
                    {member.membershipPlan}
                  </p>
                </div>
                <StatusPill
                  status={membershipTone(member.membershipStatus)}
                  label={member.membershipStatusLabel}
                  size="sm"
                />
              </div>

              <div className="grid gap-3">
                <div className="flex items-start gap-2 rounded-lg bg-background p-3">
                  <CalendarDays className="mt-0.5 h-4 w-4 text-primary" />
                  <div className="min-w-0">
                    <p className="text-xs text-muted-foreground">Last attendance</p>
                    <div className="mt-1">
                      <StatusPill
                        status={activityTone(member.activity)}
                        label={member.lastAttendance}
                        size="sm"
                      />
                    </div>
                  </div>
                </div>

                <div className="flex items-start gap-2 rounded-lg bg-background p-3">
                  <Dumbbell className="mt-0.5 h-4 w-4 text-primary" />
                  <div className="min-w-0">
                    <p className="text-xs text-muted-foreground">Workout plan</p>
                    <p className="truncate text-sm font-medium text-foreground">
                      {member.currentWorkoutPlan}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {member.workoutProgress}
                    </p>
                  </div>
                </div>

                {member.fitnessGoal && (
                  <div className="flex items-start gap-2 rounded-lg bg-background p-3">
                    <Target className="mt-0.5 h-4 w-4 text-primary" />
                    <div className="min-w-0">
                      <p className="text-xs text-muted-foreground">Fitness goal</p>
                      <p className="truncate text-sm font-medium text-foreground">
                        {member.fitnessGoal}
                      </p>
                    </div>
                  </div>
                )}
              </div>
            </SurfaceCard>
          ))}
        </div>
      )}
    </div>
  )
}
