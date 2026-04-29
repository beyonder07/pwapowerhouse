"use client"

import { useEffect, useMemo, useState } from "react"
import {
  PageIntro,
  SurfaceCard,
  ConfirmDialog,
  EmptyState,
} from "@/components/powerhouse"
import { Button } from "@/components/ui/button"
import {
  Bell,
  Calendar,
  CheckCircle,
  Loader2,
  MapPin,
  User,
  XCircle,
} from "lucide-react"
import { toast } from "sonner"

type TabType = "membership" | "trainer"
type RequestAction = "approve" | "reject"

interface MembershipRequest {
  id: string
  name: string
  email: string
  phone: string
  branch: string
  status: string
  createdAt: string
}

interface TrainerApplication extends MembershipRequest {
  experience: string
  specialization: string
}

interface SelectedRequest {
  type: TabType
  id: string
  name: string
}

function initials(name: string) {
  return name
    .split(" ")
    .map((part) => part[0])
    .join("")
    .toUpperCase()
    .slice(0, 2)
}

function formatSubmittedAt(value: string) {
  return new Intl.DateTimeFormat("en-IN", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value))
}

export default function OwnerRequestsPage() {
  const [activeTab, setActiveTab] = useState<TabType>("membership")
  const [isLoading, setIsLoading] = useState(true)
  const [isUpdating, setIsUpdating] = useState(false)
  const [membershipRequests, setMembershipRequests] = useState<
    MembershipRequest[]
  >([])
  const [trainerApplications, setTrainerApplications] = useState<
    TrainerApplication[]
  >([])
  const [showConfirmDialog, setShowConfirmDialog] = useState(false)
  const [selectedRequest, setSelectedRequest] =
    useState<SelectedRequest | null>(null)
  const [confirmAction, setConfirmAction] = useState<RequestAction | null>(null)

  const counts = useMemo(
    () => ({
      membership: membershipRequests.length,
      trainer: trainerApplications.length,
    }),
    [membershipRequests.length, trainerApplications.length]
  )

  useEffect(() => {
    let mounted = true

    async function loadRequests() {
      try {
        const response = await fetch("/api/owner/requests", {
          credentials: "include",
          cache: "no-store",
        })
        const result = await response.json()

        if (!response.ok || !result.success) {
          throw new Error(result.error || "Unable to load requests")
        }

        if (mounted) {
          setMembershipRequests(result.data.membershipRequests)
          setTrainerApplications(result.data.trainerApplications)
        }
      } catch (error) {
        toast.error("Could not load requests", {
          description:
            error instanceof Error
              ? error.message
              : "Please refresh and try again.",
        })
      } finally {
        if (mounted) {
          setIsLoading(false)
        }
      }
    }

    loadRequests()

    return () => {
      mounted = false
    }
  }, [])

  const handleAction = (
    request: MembershipRequest | TrainerApplication,
    type: TabType,
    action: RequestAction
  ) => {
    setSelectedRequest({ type, id: request.id, name: request.name })
    setConfirmAction(action)
    setShowConfirmDialog(true)
  }

  const handleConfirm = async () => {
    if (!selectedRequest || !confirmAction) return

    setIsUpdating(true)

    try {
      const response = await fetch("/api/owner/requests", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          type: selectedRequest.type,
          id: selectedRequest.id,
          status: confirmAction === "approve" ? "approved" : "rejected",
        }),
      })
      const result = await response.json()

      if (!response.ok || !result.success) {
        throw new Error(result.error || "Unable to update request")
      }

      if (selectedRequest.type === "membership") {
        setMembershipRequests((requests) =>
          requests.filter((request) => request.id !== selectedRequest.id)
        )
      } else {
        setTrainerApplications((requests) =>
          requests.filter((request) => request.id !== selectedRequest.id)
        )
      }

      toast.success(
        confirmAction === "approve" ? "Request approved" : "Request rejected"
      )
      setShowConfirmDialog(false)
      setSelectedRequest(null)
      setConfirmAction(null)
    } catch (error) {
      toast.error("Could not update request", {
        description:
          error instanceof Error ? error.message : "Please try again.",
      })
    } finally {
      setIsUpdating(false)
    }
  }

  return (
    <div className="flex-1 overflow-y-auto">
      <div className="max-w-4xl">
        <PageIntro
          title="Requests"
          description="Review and manage membership and trainer requests"
        />

        <div className="flex gap-2 mb-6 border-b border-border overflow-x-auto">
          <button
            onClick={() => setActiveTab("membership")}
            className={`px-4 py-3 font-medium text-sm transition-colors border-b-2 whitespace-nowrap ${
              activeTab === "membership"
                ? "border-accent text-accent"
                : "border-transparent text-muted-foreground hover:text-foreground"
            }`}
          >
            <Bell className="w-4 h-4 inline mr-2" />
            Membership Requests ({counts.membership})
          </button>
          <button
            onClick={() => setActiveTab("trainer")}
            className={`px-4 py-3 font-medium text-sm transition-colors border-b-2 whitespace-nowrap ${
              activeTab === "trainer"
                ? "border-accent text-accent"
                : "border-transparent text-muted-foreground hover:text-foreground"
            }`}
          >
            <User className="w-4 h-4 inline mr-2" />
            Trainer Applications ({counts.trainer})
          </button>
        </div>

        {isLoading ? (
          <div className="flex min-h-60 items-center justify-center">
            <Loader2 className="h-6 w-6 animate-spin text-accent" />
          </div>
        ) : activeTab === "membership" ? (
          <div className="space-y-4">
            {membershipRequests.length > 0 ? (
              membershipRequests.map((request) => (
                <SurfaceCard key={request.id}>
                  <div className="flex items-start gap-4">
                    <div className="w-12 h-12 rounded-full bg-accent flex items-center justify-center text-background font-semibold flex-shrink-0">
                      {initials(request.name)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="font-semibold text-foreground mb-1">
                        {request.name}
                      </h3>
                      <div className="text-sm text-muted-foreground space-y-1 mb-3">
                        <p className="break-all">{request.email}</p>
                        <p>{request.phone}</p>
                        <div className="flex flex-wrap items-center gap-4 text-xs">
                          <span className="flex items-center gap-1">
                            <MapPin className="w-3 h-3" />
                            {request.branch}
                          </span>
                          <span className="flex items-center gap-1">
                            <Calendar className="w-3 h-3" />
                            {formatSubmittedAt(request.createdAt)}
                          </span>
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          className="bg-accent hover:bg-accent/90 text-background"
                          onClick={() =>
                            handleAction(request, "membership", "approve")
                          }
                        >
                          <CheckCircle className="w-4 h-4 mr-2" />
                          Approve
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          className="border-destructive text-destructive hover:bg-destructive/10"
                          onClick={() =>
                            handleAction(request, "membership", "reject")
                          }
                        >
                          <XCircle className="w-4 h-4 mr-2" />
                          Reject
                        </Button>
                      </div>
                    </div>
                  </div>
                </SurfaceCard>
              ))
            ) : (
              <EmptyState
                title="No Membership Requests"
                description="All membership requests have been reviewed"
                icon={Bell}
              />
            )}
          </div>
        ) : (
          <div className="space-y-4">
            {trainerApplications.length > 0 ? (
              trainerApplications.map((app) => (
                <SurfaceCard key={app.id}>
                  <div className="flex items-start gap-4">
                    <div className="w-12 h-12 rounded-full bg-accent flex items-center justify-center text-background font-semibold flex-shrink-0">
                      {initials(app.name)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="font-semibold text-foreground mb-1">
                        {app.name}
                      </h3>
                      <div className="text-sm text-muted-foreground space-y-1 mb-3">
                        <p className="break-all">{app.email}</p>
                        <p>{app.phone}</p>
                        <div className="flex flex-wrap items-center gap-4 text-xs">
                          <span className="flex items-center gap-1">
                            <MapPin className="w-3 h-3" />
                            {app.branch}
                          </span>
                          <span className="flex items-center gap-1">
                            <Calendar className="w-3 h-3" />
                            {formatSubmittedAt(app.createdAt)}
                          </span>
                        </div>
                      </div>
                      <div className="grid grid-cols-1 gap-3 mb-4 text-sm sm:grid-cols-2">
                        <div>
                          <p className="text-xs text-muted-foreground">
                            Experience
                          </p>
                          <p className="font-medium text-foreground">
                            {app.experience}
                          </p>
                        </div>
                        <div>
                          <p className="text-xs text-muted-foreground">
                            Specialization
                          </p>
                          <p className="font-medium text-accent">
                            {app.specialization}
                          </p>
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          className="bg-accent hover:bg-accent/90 text-background"
                          onClick={() =>
                            handleAction(app, "trainer", "approve")
                          }
                        >
                          <CheckCircle className="w-4 h-4 mr-2" />
                          Approve
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          className="border-destructive text-destructive hover:bg-destructive/10"
                          onClick={() => handleAction(app, "trainer", "reject")}
                        >
                          <XCircle className="w-4 h-4 mr-2" />
                          Reject
                        </Button>
                      </div>
                    </div>
                  </div>
                </SurfaceCard>
              ))
            ) : (
              <EmptyState
                title="No Trainer Applications"
                description="All trainer applications have been reviewed"
                icon={User}
              />
            )}
          </div>
        )}
      </div>

      <ConfirmDialog
        isOpen={showConfirmDialog}
        title={`${confirmAction === "approve" ? "Approve" : "Reject"} Request?`}
        description={`Are you sure you want to ${
          confirmAction === "approve" ? "approve" : "reject"
        } the request from ${selectedRequest?.name}?`}
        confirmText={confirmAction === "approve" ? "Approve" : "Reject"}
        isDestructive={confirmAction === "reject"}
        loading={isUpdating}
        onConfirm={handleConfirm}
        onCancel={() => {
          setShowConfirmDialog(false)
          setSelectedRequest(null)
          setConfirmAction(null)
        }}
      />
    </div>
  )
}
