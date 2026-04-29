"use client"

import { useEffect, useMemo, useState } from "react"
import {
  PageIntro,
  PaginationControls,
  SearchToolbar,
  StatusPill,
  SurfaceCard,
} from "@/components/powerhouse"
import { Button } from "@/components/ui/button"
import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts"
import { Calendar, Download, Loader2, TrendingUp, Users } from "lucide-react"
import { toast } from "sonner"

interface AttendancePoint {
  date: string
  checkIns: number
}

interface BranchAttendance {
  branchId: string
  branchName: string
  totalCheckIns: number
  activeMembers: number
  attendanceRate: number
}

interface RecentCheckIn {
  id: string
  memberName: string
  branchName: string
  attendanceDate: string
  checkedInAt: string
  distanceMeters: number
}

function formatChartDate(value: string) {
  return new Intl.DateTimeFormat("en-IN", {
    weekday: "short",
    day: "2-digit",
  }).format(new Date(value))
}

function formatTime(value: string) {
  return new Intl.DateTimeFormat("en-IN", {
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value))
}

export default function OwnerAttendancePage() {
  const [search, setSearch] = useState("")
  const [currentPage, setCurrentPage] = useState(1)
  const [isLoadingSummary, setIsLoadingSummary] = useState(true)
  const [isLoadingCheckIns, setIsLoadingCheckIns] = useState(true)
  const [attendanceTrend, setAttendanceTrend] = useState<AttendancePoint[]>([])
  const [branchAttendance, setBranchAttendance] = useState<BranchAttendance[]>([])
  const [recentCheckIns, setRecentCheckIns] = useState<RecentCheckIn[]>([])
  const [recentCount, setRecentCount] = useState(0)
  const itemsPerPage = 8

  useEffect(() => {
    let mounted = true

    async function loadSummary() {
      try {
        const [attendanceResponse, branchResponse] = await Promise.all([
          fetch("/api/analytics/attendance", {
            credentials: "include",
            cache: "no-store",
          }),
          fetch("/api/analytics/branch-attendance", {
            credentials: "include",
            cache: "no-store",
          }),
        ])

        const [attendanceResult, branchResult] = await Promise.all([
          attendanceResponse.json(),
          branchResponse.json(),
        ])

        if (!attendanceResponse.ok || !attendanceResult.success) {
          throw new Error(attendanceResult.error || "Unable to load attendance")
        }

        if (!branchResponse.ok || !branchResult.success) {
          throw new Error(branchResult.error || "Unable to load branches")
        }

        if (mounted) {
          setAttendanceTrend(attendanceResult.data.trend)
          setBranchAttendance(branchResult.data.branches)
        }
      } catch (error) {
        toast.error("Could not load attendance analytics", {
          description:
            error instanceof Error
              ? error.message
              : "Please refresh and try again.",
        })
      } finally {
        if (mounted) {
          setIsLoadingSummary(false)
        }
      }
    }

    loadSummary()

    return () => {
      mounted = false
    }
  }, [])

  useEffect(() => {
    let mounted = true
    const offset = (currentPage - 1) * itemsPerPage
    const params = new URLSearchParams({
      limit: String(itemsPerPage),
      offset: String(offset),
    })

    if (search.trim()) {
      params.set("search", search.trim())
    }

    async function loadCheckIns() {
      setIsLoadingCheckIns(true)

      try {
        const response = await fetch(`/api/attendance/recent?${params}`, {
          credentials: "include",
          cache: "no-store",
        })
        const result = await response.json()

        if (!response.ok || !result.success) {
          throw new Error(result.error || "Unable to load check-ins")
        }

        if (mounted) {
          setRecentCheckIns(result.data.checkIns)
          setRecentCount(result.data.count)
        }
      } catch (error) {
        toast.error("Could not load recent check-ins", {
          description:
            error instanceof Error
              ? error.message
              : "Please refresh and try again.",
        })
      } finally {
        if (mounted) {
          setIsLoadingCheckIns(false)
        }
      }
    }

    loadCheckIns()

    return () => {
      mounted = false
    }
  }, [currentPage, search])

  const chartData = useMemo(
    () =>
      attendanceTrend.map((point) => ({
        date: formatChartDate(point.date),
        checkIns: point.checkIns,
      })),
    [attendanceTrend]
  )

  const totalCheckIns = attendanceTrend.reduce(
    (sum, point) => sum + point.checkIns,
    0
  )
  const averageDaily =
    attendanceTrend.length > 0
      ? Number((totalCheckIns / attendanceTrend.length).toFixed(1))
      : 0
  const todayCheckIns = attendanceTrend.at(-1)?.checkIns ?? 0
  const totalPages = Math.ceil(recentCount / itemsPerPage)

  return (
    <div className="flex-1 overflow-y-auto">
      <div className="max-w-6xl">
        <PageIntro
          title="Attendance"
          description="Monitor member attendance across all branches"
        />

        <div className="mb-6 grid grid-cols-1 gap-4 md:grid-cols-3">
          <SurfaceCard>
            <div className="flex items-center justify-between">
              <div>
                <p className="mb-2 text-sm text-muted-foreground">
                  Check-ins Today
                </p>
                <p className="text-3xl font-bold text-accent">
                  {isLoadingSummary ? "-" : todayCheckIns}
                </p>
              </div>
              <TrendingUp className="h-8 w-8 text-accent opacity-50" />
            </div>
          </SurfaceCard>
          <SurfaceCard>
            <div className="flex items-center justify-between">
              <div>
                <p className="mb-2 text-sm text-muted-foreground">
                  Weekly Check-ins
                </p>
                <p className="text-3xl font-bold text-orange-400">
                  {isLoadingSummary ? "-" : totalCheckIns}
                </p>
              </div>
              <Calendar className="h-8 w-8 text-orange-400 opacity-50" />
            </div>
          </SurfaceCard>
          <SurfaceCard>
            <div className="flex items-center justify-between">
              <div>
                <p className="mb-2 text-sm text-muted-foreground">
                  Daily Average
                </p>
                <p className="text-3xl font-bold text-foreground">
                  {isLoadingSummary ? "-" : averageDaily}
                </p>
              </div>
              <Users className="h-8 w-8 text-foreground opacity-50" />
            </div>
          </SurfaceCard>
        </div>

        <div className="mb-6 grid grid-cols-1 gap-6 lg:grid-cols-2">
          <SurfaceCard>
            <h3 className="mb-4 text-lg font-semibold text-foreground">
              Weekly Attendance Trend
            </h3>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#333" />
                <XAxis dataKey="date" stroke="#666" />
                <YAxis stroke="#666" allowDecimals={false} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: "#1a1a1a",
                    border: "1px solid #333",
                  }}
                />
                <Bar dataKey="checkIns" fill="#10b981" name="Check-ins" />
              </BarChart>
            </ResponsiveContainer>
          </SurfaceCard>

          <SurfaceCard>
            <h3 className="mb-4 text-lg font-semibold text-foreground">
              Branch Attendance
            </h3>
            <div className="space-y-4">
              {branchAttendance.map((branch) => (
                <div key={branch.branchId}>
                  <div className="mb-2 flex items-center justify-between">
                    <p className="text-sm font-medium text-foreground">
                      {branch.branchName}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {branch.totalCheckIns} check-ins
                    </p>
                  </div>
                  <div className="h-2 w-full rounded-full bg-muted">
                    <div
                      className="h-2 rounded-full bg-accent"
                      style={{
                        width: `${Math.min(branch.attendanceRate, 100)}%`,
                      }}
                    />
                  </div>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {branch.attendanceRate}% utilization across{" "}
                    {branch.activeMembers} active members
                  </p>
                </div>
              ))}
              {!isLoadingSummary && branchAttendance.length === 0 && (
                <p className="text-sm text-muted-foreground">
                  No branch attendance found.
                </p>
              )}
            </div>
          </SurfaceCard>
        </div>

        <SurfaceCard>
          <div className="mb-6 flex flex-col items-center gap-4 md:flex-row">
            <SearchToolbar
              value={search}
              onChange={(value) => {
                setSearch(value)
                setCurrentPage(1)
              }}
              placeholder="Search by member or branch..."
            />
            <Button
              variant="outline"
              className="w-full border-border md:w-auto"
              disabled
            >
              <Download className="mr-2 h-4 w-4" />
              Export
            </Button>
          </div>

          <div className="space-y-2">
            {isLoadingCheckIns ? (
              <div className="flex min-h-40 items-center justify-center">
                <Loader2 className="h-6 w-6 animate-spin text-accent" />
              </div>
            ) : recentCheckIns.length > 0 ? (
              recentCheckIns.map((checkIn) => (
                <div
                  key={checkIn.id}
                  className="grid grid-cols-2 items-center gap-4 rounded-lg border border-border bg-background p-4 text-sm md:grid-cols-5"
                >
                  <div className="col-span-2 md:col-span-1">
                    <p className="text-xs font-medium text-foreground md:text-sm">
                      {checkIn.memberName}
                    </p>
                  </div>
                  <div className="hidden md:block">
                    <p className="text-xs text-muted-foreground">
                      {checkIn.branchName}
                    </p>
                  </div>
                  <div className="hidden md:block">
                    <p className="text-xs text-muted-foreground">
                      {formatTime(checkIn.checkedInAt)}
                    </p>
                  </div>
                  <div className="hidden md:block">
                    <p className="text-xs text-muted-foreground">
                      {checkIn.distanceMeters}m
                    </p>
                  </div>
                  <div className="flex items-center justify-between md:justify-end">
                    <p className="text-xs text-muted-foreground md:hidden">
                      {formatTime(checkIn.checkedInAt)}
                    </p>
                    <StatusPill status="completed" size="sm">
                      Check-in
                    </StatusPill>
                  </div>
                </div>
              ))
            ) : (
              <p className="py-8 text-center text-sm text-muted-foreground">
                No check-ins found.
              </p>
            )}
          </div>

          {totalPages > 1 && (
            <div className="mt-6">
              <PaginationControls
                currentPage={currentPage}
                totalPages={totalPages}
                onPageChange={setCurrentPage}
              />
            </div>
          )}
        </SurfaceCard>
      </div>
    </div>
  )
}
