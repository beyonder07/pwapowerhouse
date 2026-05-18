import type { AuthContext } from "@/src/middleware/auth.middleware"
import { requireRole } from "@/src/middleware/role.middleware"
import { calculateDistance } from "@/src/services/geo.service"
import { createSupabaseServiceRoleClient } from "@/src/services/supabase.service"
import {
  BadRequestError,
  ConflictError,
  ForbiddenError,
} from "@/src/utils/errors"
import {
  deriveCheckoutStatus,
  formatWorkDuration,
  isCheckInLate,
  normalizeStoredDay,
  operatingWindowsForDisplay,
  resolveCheckInWindow,
  type DailyAttendanceStatus,
  formatFloorTimeLabel,
  type StoredDailyAttendance,
  type TrainerFloorTiming,
} from "./daily-attendance"
import { TrainerAttendanceCheckInSchema } from "./trainer.schema"
import type {
  TrainerAttendanceCheckInInput,
  TrainerMemberQuery,
  WorkoutPlanUpsertInput,
} from "./trainer.schema"

const DAY_MS = 24 * 60 * 60 * 1000
const MAX_GYM_RADIUS_METERS = 150
const MAX_TIMESTAMP_SKEW_MS = 2 * 60 * 1000
const TRAINER_DATA_BUCKET = "trainer-data"
const WORKOUT_PLANS_PATH = "workout-plans/plans.json"
const TRAINER_ATTENDANCE_PATH_PREFIX = "trainer-attendance"

type MembershipBadge = "active" | "expiring" | "expired"
type AttendanceActivity =
  | "present_today"
  | "recent"
  | "inactive"
  | "no_attendance"
type SalaryStatus = "paid" | "processing" | "pending"
type DailyAttendanceAction = "check_in" | "check_out"

interface LiveUserRow {
  id: string
  name: string | null
  email: string | null
  role: string
  gym_id: string | null
}

interface UserDetailsRow {
  user_id: string
  profile_pic_url?: string | null
  profile_photo_url?: string | null
}

interface MembershipRow {
  id: string | number
  user_id: string
  gym_id: string | null
  start_date: string
  end_date: string
  status: string
}

interface AttendanceRow {
  id?: string | number
  user_id?: string | null
  member_id?: string | number | null
  date: string
  status?: string | null
  check_in_time?: string | null
  check_out_time?: string | null
  distance_meters?: number | string | null
}


interface GymRow {
  id: string
  name: string
  latitude: number
  longitude: number
  radius?: number | null
  radius_meters?: number | null
}

interface LegacyMemberRow {
  id: number
  user_id: string
  status: string
  profile_photo_url: string | null
  membership_plan: string | null
  expiry_date: string | null
  workout_plan: unknown
  created_at: string
  users?: unknown
}

interface StoredWorkoutPlan {
  id: string
  memberId: string
  trainerId: string | null
  title: string
  notes: string
  status: "active" | "pending" | "archived"
  split: WorkoutPlanUpsertInput["split"]
  progressNote?: string | null
  createdAt: string
  updatedAt: string
}

interface SalaryRow {
  id: string
  month_start: string
  base_salary: number | string
  bonus: number | string
  status: SalaryStatus
  paid_at: string | null
}

function pad(value: number) {
  return String(value).padStart(2, "0")
}

function toDateKey(date: Date) {
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`
}

function zonedParts(date = new Date(), timeZone = "Asia/Kolkata") {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).formatToParts(date)
  const values = Object.fromEntries(parts.map((part) => [part.type, part.value]))

  return {
    dateKey: `${values.year}-${values.month}-${values.day}`,
    minutes: Number(values.hour) * 60 + Number(values.minute),
  }
}

function parseDateKey(value: string) {
  const [year, month, day] = value.split("-").map(Number)
  return new Date(year, (month ?? 1) - 1, day ?? 1)
}

function todayKey() {
  return zonedParts().dateKey
}

function currentMonthStartKey() {
  const now = new Date()
  return toDateKey(new Date(now.getFullYear(), now.getMonth(), 1))
}

function currentMonthEndKey() {
  const now = new Date()
  return toDateKey(new Date(now.getFullYear(), now.getMonth() + 1, 0))
}

function daysBetween(fromDateKey: string, toDateKeyValue = todayKey()) {
  const from = parseDateKey(fromDateKey)
  const to = parseDateKey(toDateKeyValue)
  return Math.max(0, Math.floor((to.getTime() - from.getTime()) / DAY_MS))
}

function toNumber(value: number | string | null | undefined) {
  if (value === null || value === undefined) return 0
  return Number(value)
}

function asRecord(value: unknown) {
  return value !== null && typeof value === "object"
    ? (value as Record<string, unknown>)
    : null
}

function firstRecord(value: unknown) {
  if (Array.isArray(value)) return asRecord(value[0])
  return asRecord(value)
}

function stringField(record: Record<string, unknown> | null, key: string) {
  const value = record?.[key]
  return typeof value === "string" && value.trim() ? value.trim() : null
}

function isMissingDbObjectError(error: unknown) {
  const dbError = error as
    | { code?: string; message?: string; details?: string }
    | null
    | undefined

  return (
    dbError?.code === "42P01" ||
    dbError?.code === "42703" ||
    dbError?.code === "PGRST202" ||
    dbError?.code === "PGRST205" ||
    dbError?.message?.includes("Could not find") === true ||
    dbError?.message?.includes("schema cache") === true ||
    dbError?.details?.includes("Could not find") === true
  )
}

function isDuplicateError(error: unknown) {
  const dbError = error as { code?: string; message?: string } | null | undefined
  return (
    dbError?.code === "23505" ||
    dbError?.message?.includes("already marked") === true ||
    dbError?.message?.includes("duplicate key") === true
  )
}

function membershipBadge(status: string | null, endDate: string | null): {
  status: MembershipBadge
  label: string
} {
  if (status === "expired") return { status: "expired", label: "Expired" }

  if (endDate) {
    const daysLeft = Math.ceil(
      (parseDateKey(endDate).getTime() - parseDateKey(todayKey()).getTime()) /
        DAY_MS
    )

    if (daysLeft < 0) return { status: "expired", label: "Expired" }
    if (daysLeft <= 14) return { status: "expiring", label: "Expiring Soon" }
  }

  return { status: "active", label: "Active" }
}

function planExerciseCount(split: WorkoutPlanUpsertInput["split"] | unknown) {
  if (!Array.isArray(split)) return 0

  return split.reduce((sum, day) => {
    const record = asRecord(day)
    const exercises = record?.exercises
    return sum + (Array.isArray(exercises) ? exercises.length : 0)
  }, 0)
}

function legacyWorkoutTitle(plan: unknown) {
  const record = asRecord(plan)
  return (
    stringField(record, "title") ??
    stringField(record, "name") ??
    stringField(record, "planName")
  )
}

function lastAttendanceLabel(lastAttendanceDate: string | null) {
  if (!lastAttendanceDate) return "No attendance yet"

  const inactiveDays = daysBetween(lastAttendanceDate)
  if (inactiveDays === 0) return "Present Today"
  if (inactiveDays >= 4) return `Inactive for ${inactiveDays} days`
  if (inactiveDays === 1) return "Last seen yesterday"
  return `Last seen ${inactiveDays} days ago`
}

function activityFor(lastAttendanceDate: string | null): AttendanceActivity {
  if (!lastAttendanceDate) return "no_attendance"

  const inactiveDays = daysBetween(lastAttendanceDate)
  if (inactiveDays === 0) return "present_today"
  if (inactiveDays >= 7) return "inactive"
  return "recent"
}

function statusPillForSalary(status: string): SalaryStatus {
  if (status === "paid" || status === "processing" || status === "pending") {
    return status
  }

  return "pending"
}

function monthLabel(value: string) {
  return value.slice(0, 7)
}

function timeLabelFromMinutes(totalMinutes: number) {
  const hour24 = Math.floor(totalMinutes / 60)
  const minute = totalMinutes % 60
  const hour12 = hour24 % 12 || 12
  const period = hour24 >= 12 ? "PM" : "AM"
  return `${hour12}:${pad(minute)} ${period}`
}

export class TrainerPanelService {
  private readonly admin = createSupabaseServiceRoleClient()

  constructor(private readonly ctx: AuthContext) {}

  async getDashboard() {
    requireRole(this.ctx, ["trainer"])

    const [members, attendance, salary] = await Promise.all([
      this.getMembers({ status: "all", activity: "all" }),
      this.getAttendance(),
      this.getSalary(),
    ])

    const totalMembers = members.members.length
    const presentToday = members.members.filter(
      (member) => member.activity === "present_today"
    ).length
    const inactiveMembers = members.members.filter(
      (member) =>
        member.activity === "inactive" || member.activity === "no_attendance"
    ).length
    const workoutPlansPending = members.members.filter(
      (member) => member.workoutPlanStatus === "pending"
    ).length
    const absentToday = Math.max(totalMembers - presentToday, 0)

    return {
      summary: {
        totalMembers,
        presentToday,
        inactiveMembers,
        workoutPlansPending,
        salaryStatus: salary.current.status,
      },
      attendance: {
        checkedInToday: attendance.today.checkedIn,
        todayStatus: attendance.today.status,
      },
      activity: [
        {
          label: `${absentToday} members absent today`,
          tone: absentToday > 0 ? "warning" : "success",
        },
        {
          label: `${inactiveMembers} inactive for 7+ days`,
          tone: inactiveMembers > 0 ? "error" : "success",
        },
        {
          label: `${workoutPlansPending} plans need updates`,
          tone: workoutPlansPending > 0 ? "warning" : "success",
        },
      ],
    }
  }

  async getMembers(query: TrainerMemberQuery) {
    requireRole(this.ctx, ["trainer"])

    const liveMembers = await this.getLiveMembers(query)
    if (liveMembers) return liveMembers

    return this.getLegacyMembers(query)
  }

  async getAttendance() {
    requireRole(this.ctx, ["trainer"])

    const [storedDays, liveRows, legacyRows] = await Promise.all([
      this.readStoredTrainerAttendanceDays(),
      this.readLiveTrainerAttendanceRows(),
      this.readLegacyTrainerAttendanceRows(),
    ])

    const floor = await this.getTrainerFloorTiming()
    return this.formatDailyAttendanceDays(
      storedDays,
      liveRows.length > 0 ? liveRows : legacyRows,
      floor
    )
  }

  async markAttendance(rawInput: unknown, requestId: string) {
    requireRole(this.ctx, ["trainer"])

    const input = TrainerAttendanceCheckInSchema.parse(rawInput)
    if (input.clientTimestamp) {
      const skew = Math.abs(Date.now() - new Date(input.clientTimestamp).getTime())
      if (skew > MAX_TIMESTAMP_SKEW_MS) {
        throw new BadRequestError("Stale attendance request")
      }
    }

    const live = await this.markLiveDailyTrainerAttendance(input, requestId)
    if (live) return live

    return this.markStoredDailyTrainerAttendance(input.action, input, requestId)
  }

  async getWorkouts() {
    requireRole(this.ctx, ["trainer"])

    const membersResult = await this.getMembers({ status: "all", activity: "all" })
    const members = membersResult.members.map((member) => ({
      id: member.id,
      name: member.name,
      avatarUrl: member.avatarUrl,
      status: member.membershipStatus,
    }))
    const plans = await this.readStoredWorkoutPlans()
    const visibleMemberIds = new Set(members.map((member) => member.id))
    const memberById = new Map(members.map((member) => [member.id, member]))

    const planRows = plans
      .filter((plan) => visibleMemberIds.has(plan.memberId))
      .map((plan) => ({
        id: plan.id,
        memberId: plan.memberId,
        memberName: memberById.get(plan.memberId)?.name ?? "Member",
        title: plan.title,
        notes: plan.notes,
        status: plan.status,
        split: plan.split,
        dayCount: Array.isArray(plan.split) ? plan.split.length : 0,
        exerciseCount: planExerciseCount(plan.split),
        updatedAt: plan.updatedAt,
        needsUpdate:
          plan.status === "pending" || daysBetween(plan.updatedAt.slice(0, 10)) >= 14,
      }))

    return {
      plans: planRows,
      members,
      pendingCount: planRows.filter((plan) => plan.needsUpdate).length,
    }
  }

  async saveWorkoutPlan(input: WorkoutPlanUpsertInput) {
    requireRole(this.ctx, ["trainer"])

    const members = await this.getMembers({ status: "all", activity: "all" })
    if (!members.members.some((member) => member.id === input.memberId)) {
      throw new ForbiddenError("Selected member is not visible to trainers")
    }

    const now = new Date().toISOString()
    const plans = await this.readStoredWorkoutPlans()
    const existingIndex = input.id
      ? plans.findIndex((plan) => plan.id === input.id)
      : -1
    const nextPlan: StoredWorkoutPlan = {
      id: input.id ?? crypto.randomUUID(),
      memberId: input.memberId,
      trainerId: this.ctx.authUserId,
      title: input.title,
      notes: input.notes ?? "",
      status: input.status,
      split: input.split,
      createdAt:
        existingIndex >= 0 ? plans[existingIndex].createdAt : now,
      updatedAt: now,
    }

    const nextPlans =
      existingIndex >= 0
        ? plans.map((plan, index) => (index === existingIndex ? nextPlan : plan))
        : [nextPlan, ...plans]

    await this.writeStoredWorkoutPlans(nextPlans)

    return {
      id: nextPlan.id,
      memberId: nextPlan.memberId,
      title: nextPlan.title,
      status: nextPlan.status,
      split: nextPlan.split,
      notes: nextPlan.notes,
      updatedAt: nextPlan.updatedAt,
    }
  }

  async getSalary() {
    requireRole(this.ctx, ["trainer"])

    const tableSalary = await this.getTableSalary()
    if (tableSalary) return tableSalary

    const storageSalary = await this.getStoredSalary()
    if (storageSalary) return storageSalary

    const currentMonth = currentMonthStartKey()
    return {
      current: {
        monthStart: currentMonth,
        baseSalary: 0,
        bonus: 0,
        total: 0,
        status: "pending" as SalaryStatus,
        paidAt: null,
      },
      lastPaymentDate: null,
      history: [],
    }
  }

  private async getLiveMembers(query: TrainerMemberQuery) {
    const usersResult = await this.admin
      .from("users")
      .select("id,name,email,role,gym_id")
      .eq("role", "client")
      .order("name")

    if (usersResult.error) {
      if (isMissingDbObjectError(usersResult.error)) return null
      throw usersResult.error
    }

    const users = (usersResult.data ?? []) as LiveUserRow[]
    const userIds = users.map((user) => user.id)

    if (userIds.length === 0) {
      return { members: [], count: 0, filters: { total: 0, inactive: 0 } }
    }

    const [detailsResult, membershipsResult, attendanceResult, plans] =
      await Promise.all([
        this.admin
          .from("user_details")
          .select("user_id,profile_pic_url,profile_photo_url")
          .in("user_id", userIds),
        this.admin
          .from("memberships")
          .select("id,user_id,gym_id,start_date,end_date,status")
          .in("user_id", userIds)
          .order("end_date", { ascending: false }),
        this.admin
          .from("attendance")
          .select("id,user_id,date,status,check_in_time,distance_meters")
          .in("user_id", userIds)
          .order("date", { ascending: false }),
        this.readStoredWorkoutPlans(),
      ])

    if (detailsResult.error && !isMissingDbObjectError(detailsResult.error)) {
      throw detailsResult.error
    }
    if (membershipsResult.error && !isMissingDbObjectError(membershipsResult.error)) {
      throw membershipsResult.error
    }
    if (attendanceResult.error && !isMissingDbObjectError(attendanceResult.error)) {
      throw attendanceResult.error
    }

    const detailsByUser = new Map(
      ((detailsResult.data ?? []) as UserDetailsRow[]).map((row) => [
        row.user_id,
        row,
      ])
    )
    const membershipByUser = new Map<string, MembershipRow>()
    for (const membership of (membershipsResult.data ?? []) as MembershipRow[]) {
      if (!membershipByUser.has(membership.user_id)) {
        membershipByUser.set(membership.user_id, membership)
      }
    }
    const attendanceByUser = new Map<string, AttendanceRow>()
    for (const row of (attendanceResult.data ?? []) as AttendanceRow[]) {
      const userId = row.user_id
      if (userId && !attendanceByUser.has(userId)) {
        attendanceByUser.set(userId, row)
      }
    }
    const plansByMember = new Map<string, StoredWorkoutPlan>()
    for (const plan of plans) {
      if (!plansByMember.has(plan.memberId) && plan.status !== "archived") {
        plansByMember.set(plan.memberId, plan)
      }
    }

    const normalized = users.map((user) => {
      const details = detailsByUser.get(user.id)
      const membership = membershipByUser.get(user.id)
      const lastAttendance = attendanceByUser.get(user.id)
      const badge = membershipBadge(
        membership?.status ?? null,
        membership?.end_date ?? null
      )
      const plan = plansByMember.get(user.id)
      const activity = activityFor(lastAttendance?.date ?? null)

      return {
        id: user.id,
        name: user.name ?? user.email ?? "Member",
        avatarUrl: details?.profile_pic_url ?? details?.profile_photo_url ?? null,
        membershipPlan: membership
          ? `${monthLabel(membership.start_date)} to ${monthLabel(membership.end_date)}`
          : "Membership not assigned",
        membershipStatus: badge.status,
        membershipStatusLabel: badge.label,
        expiryDate: membership?.end_date ?? null,
        lastAttendance: lastAttendanceLabel(lastAttendance?.date ?? null),
        lastAttendanceDate: lastAttendance?.date ?? null,
        activity,
        currentWorkoutPlan: plan?.title ?? "No plan assigned",
        workoutPlanStatus: plan
          ? plan.status === "pending"
            ? "pending"
            : "active"
          : "pending",
        workoutProgress: plan ? `${planExerciseCount(plan.split)} exercises` : "Needs plan",
        fitnessGoal: null,
      }
    })

    const filtered = this.filterMembers(normalized, query)

    return {
      members: filtered,
      count: filtered.length,
      filters: {
        total: normalized.length,
        inactive: normalized.filter(
          (member) =>
            member.activity === "inactive" || member.activity === "no_attendance"
        ).length,
      },
    }
  }

  private async getLegacyMembers(query: TrainerMemberQuery) {
    const [membersResult, attendanceResult, plans] = await Promise.all([
      this.admin
        .from("members")
        .select(
          "id,user_id,status,profile_photo_url,membership_plan,expiry_date,workout_plan,created_at,users(name,email)"
        )
        .order("created_at", { ascending: false }),
      this.admin
        .from("attendance")
        .select("member_id,date,status,check_in_time")
        .eq("status", "present")
        .order("date", { ascending: false }),
      this.readStoredWorkoutPlans(),
    ])

    if (membersResult.error) throw membersResult.error
    if (attendanceResult.error && !isMissingDbObjectError(attendanceResult.error)) {
      throw attendanceResult.error
    }

    const lastAttendanceByMember = new Map<string, AttendanceRow>()
    for (const row of (attendanceResult.data ?? []) as AttendanceRow[]) {
      const memberId = String(row.member_id)
      const existing = lastAttendanceByMember.get(memberId)
      if (!existing || row.date > existing.date) {
        lastAttendanceByMember.set(memberId, row)
      }
    }
    const plansByMember = new Map<string, StoredWorkoutPlan>()
    for (const plan of plans) {
      if (!plansByMember.has(plan.memberId) && plan.status !== "archived") {
        plansByMember.set(plan.memberId, plan)
      }
    }

    const normalized = ((membersResult.data ?? []) as LegacyMemberRow[]).map(
      (member) => {
        const user = firstRecord(member.users)
        const id = String(member.id)
        const name =
          stringField(user, "name") ??
          stringField(user, "email") ??
          `Member #${member.id}`
        const lastAttendance = lastAttendanceByMember.get(id)
        const badge = membershipBadge(member.status, member.expiry_date)
        const plan = plansByMember.get(id)
        const legacyTitle = legacyWorkoutTitle(member.workout_plan)
        const activity = activityFor(lastAttendance?.date ?? null)

        return {
          id,
          name,
          avatarUrl: member.profile_photo_url,
          membershipPlan: member.membership_plan ?? "Membership",
          membershipStatus: badge.status,
          membershipStatusLabel: badge.label,
          expiryDate: member.expiry_date,
          lastAttendance: lastAttendanceLabel(lastAttendance?.date ?? null),
          lastAttendanceDate: lastAttendance?.date ?? null,
          activity,
          currentWorkoutPlan: plan?.title ?? legacyTitle ?? "No plan assigned",
          workoutPlanStatus: plan
            ? plan.status === "pending"
              ? "pending"
              : "active"
            : legacyTitle
              ? "active"
              : "pending",
          workoutProgress: plan
            ? `${planExerciseCount(plan.split)} exercises`
            : legacyTitle
              ? "Legacy plan"
              : "Needs plan",
          fitnessGoal:
            stringField(asRecord(member.workout_plan), "goal") ??
            stringField(asRecord(member.workout_plan), "fitnessGoal"),
        }
      }
    )
    const filtered = this.filterMembers(normalized, query)

    return {
      members: filtered,
      count: filtered.length,
      filters: {
        total: normalized.length,
        inactive: normalized.filter(
          (member) =>
            member.activity === "inactive" || member.activity === "no_attendance"
        ).length,
      },
    }
  }

  private filterMembers<T extends { name: string; membershipStatus: string; activity: string }>(
    members: T[],
    query: TrainerMemberQuery
  ) {
    const search = query.search?.toLowerCase()
    return members.filter((member) => {
      const matchesSearch = search
        ? member.name.toLowerCase().includes(search)
        : true
      const matchesStatus =
        query.status === "all" || member.membershipStatus === query.status
      const matchesActivity =
        query.activity === "all" || member.activity === query.activity

      return matchesSearch && matchesStatus && matchesActivity
    })
  }

  private trainerAttendanceStoragePath() {
    return `${TRAINER_ATTENDANCE_PATH_PREFIX}/${this.ctx.authUserId}/${monthLabel(
      currentMonthStartKey()
    )}.json`
  }

  private async getTrainerFloorTiming(): Promise<TrainerFloorTiming> {
    const { data, error } = await this.admin
      .from("user_details")
      .select("floor_start_time,floor_end_time")
      .eq("user_id", this.ctx.authUserId)
      .maybeSingle()

    if (error && !isMissingDbObjectError(error)) throw error

    return {
      floorStartTime: (data as { floor_start_time?: string | null } | null)
        ?.floor_start_time ?? null,
      floorEndTime: (data as { floor_end_time?: string | null } | null)
        ?.floor_end_time ?? null,
    }
  }

  private async readStoredTrainerAttendanceDays(): Promise<StoredDailyAttendance[]> {
    await this.ensureTrainerDataBucket()

    const { data, error } = await this.admin.storage
      .from(TRAINER_DATA_BUCKET)
      .download(this.trainerAttendanceStoragePath())

    if (error) {
      if (
        error.message.toLowerCase().includes("not found") ||
        error.message.toLowerCase().includes("does not exist")
      ) {
        return []
      }

      throw error
    }

    const text = await data.text()
    if (!text.trim()) return []

    try {
      const parsed = JSON.parse(text) as unknown
      const parsedRecord = asRecord(parsed)
      const rows: unknown[] = Array.isArray(parsed)
        ? parsed
        : Array.isArray(parsedRecord?.days)
          ? parsedRecord.days
          : []

      return rows
        .map((row: unknown) => normalizeStoredDay(row))
        .filter((day): day is StoredDailyAttendance => Boolean(day))
    } catch {
      return []
    }
  }

  private async writeStoredTrainerAttendanceDays(days: StoredDailyAttendance[]) {
    await this.ensureTrainerDataBucket()

    const orderedDays = days
      .slice()
      .sort((first, second) => first.date.localeCompare(second.date))

    const { error } = await this.admin.storage
      .from(TRAINER_DATA_BUCKET)
      .upload(
        this.trainerAttendanceStoragePath(),
        Buffer.from(JSON.stringify(orderedDays, null, 2)),
        {
          contentType: "application/json",
          upsert: true,
        }
      )

    if (error) throw error
  }

  private async readLiveTrainerAttendanceRows(): Promise<AttendanceRow[]> {
    const monthStart = currentMonthStartKey()
    const monthEnd = currentMonthEndKey()
    const extended = await this.admin
      .from("attendance")
      .select("id,user_id,date,check_in_time,check_out_time,status,distance_meters")
      .eq("user_id", this.ctx.authUserId)
      .gte("date", monthStart)
      .lte("date", monthEnd)
      .order("date", { ascending: true })

    if (!extended.error) return (extended.data ?? []) as AttendanceRow[]
    if (!isMissingDbObjectError(extended.error)) throw extended.error

    const minimal = await this.admin
      .from("attendance")
      .select("id,user_id,date,check_in_time,status,distance_meters")
      .eq("user_id", this.ctx.authUserId)
      .gte("date", monthStart)
      .lte("date", monthEnd)
      .order("date", { ascending: true })

    if (minimal.error) {
      if (isMissingDbObjectError(minimal.error)) return []
      throw minimal.error
    }

    return (minimal.data ?? []) as AttendanceRow[]
  }

  private async readLegacyTrainerAttendanceRows(): Promise<AttendanceRow[]> {
    const monthStart = currentMonthStartKey()
    const monthEnd = currentMonthEndKey()
    const trainerId = await this.getLegacyTrainerId()
    if (!trainerId) return []

    const extended = await this.admin
      .from("trainer_attendance")
      .select("id,date,check_in_time,check_out_time,status,distance_meters")
      .eq("trainer_id", trainerId)
      .gte("date", monthStart)
      .lte("date", monthEnd)
      .order("date", { ascending: true })

    if (!extended.error) return (extended.data ?? []) as AttendanceRow[]

    const minimal = await this.admin
      .from("trainer_attendance")
      .select("id,date,check_in_time,status,distance_meters")
      .eq("trainer_id", trainerId)
      .gte("date", monthStart)
      .lte("date", monthEnd)
      .order("date", { ascending: true })

    if (minimal.error) {
      if (isMissingDbObjectError(minimal.error)) return []
      throw minimal.error
    }

    return (minimal.data ?? []) as AttendanceRow[]
  }

  private async verifyTrainerLocation(input: {
    latitude?: number
    longitude?: number
  }) {
    if (input.latitude === undefined || input.longitude === undefined) {
      return false
    }

    const gym = await this.getAttendanceGym()
    if (!gym) return false

    const distance = calculateDistance(
      input.latitude,
      input.longitude,
      gym.latitude,
      gym.longitude
    )
    const radius = Math.min(
      Number(gym.radius ?? gym.radius_meters ?? MAX_GYM_RADIUS_METERS),
      MAX_GYM_RADIUS_METERS
    )

    if (distance > radius) {
      throw new ForbiddenError("You are too far from the gym")
    }

    return true
  }

  private rowToStoredDay(row: AttendanceRow, floor: TrainerFloorTiming): StoredDailyAttendance | null {
    if (!row.date || !row.check_in_time) return null
    const isLate =
      row.status === "late" ||
      isCheckInLate(row.check_in_time, floor.floorStartTime)

    return {
      date: row.date,
      checkInAt: row.check_in_time,
      checkOutAt: row.check_out_time ?? null,
      status:
        row.status === "half-day"
          ? "half-day"
          : isLate
            ? "late"
            : "present",
      isLate,
      gpsVerified:
        row.distance_meters !== null && row.distance_meters !== undefined,
    }
  }

  private async markStoredDailyTrainerAttendance(
    action: DailyAttendanceAction,
    input: TrainerAttendanceCheckInInput,
    requestId: string
  ) {
    const now = new Date()
    const { dateKey } = zonedParts(now)
    const floor = await this.getTrainerFloorTiming()
    const days = await this.readStoredTrainerAttendanceDays()
    let day = days.find((entry) => entry.date === dateKey)

    const gpsVerified = await this.verifyTrainerLocation(input)

    if (action === "check_in") {
      if (day?.checkInAt) {
        throw new ConflictError("You already checked in today")
      }

      if (!resolveCheckInWindow(now)) {
        throw new BadRequestError(
          "Check-in is available only during 6:00–10:00 AM and 4:00–10:00 PM"
        )
      }

      const isLate = isCheckInLate(now.toISOString(), floor.floorStartTime)
      day = {
        date: dateKey,
        checkInAt: now.toISOString(),
        checkOutAt: null,
        status: isLate ? "late" : "present",
        isLate,
        gpsVerified,
      }

      const existingIndex = days.findIndex((entry) => entry.date === dateKey)
      if (existingIndex >= 0) days[existingIndex] = day
      else days.push(day)
    } else {
      if (!day?.checkInAt) {
        throw new BadRequestError("Check in before checking out")
      }
      if (day.checkOutAt) {
        throw new ConflictError("You already checked out today")
      }

      const checkOutAt = now.toISOString()
      const status = deriveCheckoutStatus(
        day.checkInAt,
        checkOutAt,
        floor,
        day.isLate
      )

      day = {
        ...day,
        checkOutAt,
        status,
        isLate: status === "late" || day.isLate,
        gpsVerified: day.gpsVerified || gpsVerified,
      }

      const existingIndex = days.findIndex((entry) => entry.date === dateKey)
      if (existingIndex >= 0) days[existingIndex] = day
    }

    await this.writeStoredTrainerAttendanceDays(days)

    return {
      id: `${this.ctx.authUserId}-${dateKey}`,
      attendanceDate: dateKey,
      checkedInAt: day.checkInAt,
      checkedOutAt: day.checkOutAt,
      status: day.status,
      isLate: day.isLate,
      workDuration: formatWorkDuration(day.checkInAt, day.checkOutAt),
      gpsVerified: day.gpsVerified,
      action,
      requestId,
    }
  }

  private formatDailyAttendanceDays(
    storedDays: StoredDailyAttendance[],
    fallbackRows: AttendanceRow[] = [],
    floor: TrainerFloorTiming
  ) {
    const monthStart = currentMonthStartKey()
    const monthEnd = currentMonthEndKey()
    const today = todayKey()
    const dayMap = new Map<string, StoredDailyAttendance>()

    for (const storedDay of storedDays) {
      dayMap.set(storedDay.date, storedDay)
    }

    for (const row of fallbackRows) {
      const normalized = this.rowToStoredDay(row, floor)
      if (!normalized || dayMap.has(normalized.date)) continue
      dayMap.set(normalized.date, normalized)
    }

    const monthCursor = parseDateKey(monthStart)
    const monthEndDate = parseDateKey(monthEnd)
    const days: Array<{
      date: string
      day: number
      status: DailyAttendanceStatus
      checkInTime: string | null
      checkOutTime: string | null
      workDuration: string | null
      isLate: boolean
      gpsVerified: boolean
    }> = []

    while (monthCursor <= monthEndDate) {
      const date = toDateKey(monthCursor)
      const record = dayMap.get(date)
      const future = date > today
      const status: DailyAttendanceStatus = future
        ? "not_marked"
        : record
          ? record.status === "half-day"
            ? "half-day"
            : record.isLate || record.status === "late"
              ? "late"
              : "present"
          : "absent"

      days.push({
        date,
        day: monthCursor.getDate(),
        status,
        checkInTime: record?.checkInAt ?? null,
        checkOutTime: record?.checkOutAt ?? null,
        workDuration: formatWorkDuration(
          record?.checkInAt ?? null,
          record?.checkOutAt ?? null
        ),
        isLate: record?.isLate ?? false,
        gpsVerified: record?.gpsVerified ?? false,
      })

      monthCursor.setDate(monthCursor.getDate() + 1)
    }

    const countedDays = days.filter((day) => day.date <= today)
    const presentDays = countedDays.filter(
      (day) =>
        day.status === "present" ||
        day.status === "late" ||
        day.status === "half-day"
    ).length
    const absentDays = countedDays.filter((day) => day.status === "absent").length
    const lateCheckIns = countedDays.filter((day) => day.isLate).length
    const attendancePercent =
      countedDays.length > 0
        ? Math.round((presentDays / countedDays.length) * 100)
        : 0

    let streak = 0
    const streakCursor = parseDateKey(today)
    while (streakCursor >= parseDateKey(monthStart)) {
      const date = toDateKey(streakCursor)
      if (!dayMap.get(date)?.checkInAt) break
      streak += 1
      streakCursor.setDate(streakCursor.getDate() - 1)
    }

    const todayDay = days.find((day) => day.date === today)
    const todayRecord = dayMap.get(today)

    return {
      month: { start: monthStart, end: monthEnd },
      floorTiming: {
        start: floor.floorStartTime,
        end: floor.floorEndTime,
        startLabel: formatFloorTimeLabel(floor.floorStartTime),
        endLabel: formatFloorTimeLabel(floor.floorEndTime),
      },
      operatingWindows: operatingWindowsForDisplay(),
      today: {
        checkedIn: Boolean(todayRecord?.checkInAt),
        checkedOut: Boolean(todayRecord?.checkOutAt),
        status: todayDay?.status ?? "not_marked",
        checkInTime: todayRecord?.checkInAt ?? null,
        checkOutTime: todayRecord?.checkOutAt ?? null,
        workDuration: formatWorkDuration(
          todayRecord?.checkInAt ?? null,
          todayRecord?.checkOutAt ?? null
        ),
        isLate: todayRecord?.isLate ?? false,
        gpsVerified: todayRecord?.gpsVerified ?? false,
      },
      summary: {
        presentDays,
        absentDays,
        attendancePercent,
        streak,
        lateCheckIns,
      },
      calendar: days,
      history: Array.from(dayMap.values())
        .filter((day) => day.checkInAt)
        .map((day) => ({
          id: `${this.ctx.authUserId}-${day.date}`,
          date: day.date,
          checkInTime: day.checkInAt,
          checkOutTime: day.checkOutAt,
          status: day.status,
          isLate: day.isLate,
          workDuration: formatWorkDuration(day.checkInAt, day.checkOutAt),
          gpsVerified: day.gpsVerified,
        }))
        .sort((first, second) =>
          (second.checkInTime ?? second.date).localeCompare(
            first.checkInTime ?? first.date
          )
        ),
    }
  }

  private async getLiveTrainerAttendance() {
    const monthStart = currentMonthStartKey()
    const monthEnd = currentMonthEndKey()
    const { data, error } = await this.admin
      .from("attendance")
      .select("id,user_id,date,check_in_time,status,distance_meters")
      .eq("user_id", this.ctx.authUserId)
      .gte("date", monthStart)
      .lte("date", monthEnd)
      .order("date", { ascending: true })

    if (error) {
      if (isMissingDbObjectError(error)) return null
      throw error
    }

    return this.formatAttendanceRows((data ?? []) as AttendanceRow[])
  }

  private async getLegacyTrainerAttendance() {
    const monthStart = currentMonthStartKey()
    const monthEnd = currentMonthEndKey()
    const trainerId = await this.getLegacyTrainerId()
    if (!trainerId) return this.formatAttendanceRows([])

    const extended = await this.admin
      .from("trainer_attendance")
      .select("id,date,check_in_time,status,distance_meters")
      .eq("trainer_id", trainerId)
      .gte("date", monthStart)
      .lte("date", monthEnd)
      .order("date", { ascending: true })

    if (!extended.error) return this.formatAttendanceRows(extended.data as AttendanceRow[])

    const minimal = await this.admin
      .from("trainer_attendance")
      .select("id,date,check_in_time")
      .eq("trainer_id", trainerId)
      .gte("date", monthStart)
      .lte("date", monthEnd)
      .order("date", { ascending: true })

    if (minimal.error) {
      if (isMissingDbObjectError(minimal.error)) return this.formatAttendanceRows([])
      throw minimal.error
    }

    return this.formatAttendanceRows(minimal.data as AttendanceRow[])
  }

  private formatAttendanceRows(records: AttendanceRow[]) {
    const monthStart = currentMonthStartKey()
    const monthEnd = currentMonthEndKey()
    const today = todayKey()
    const recordsByDate = new Map(records.map((record) => [record.date, record]))
    const monthCursor = parseDateKey(monthStart)
    const monthEndDate = parseDateKey(monthEnd)
    const days: Array<{
      date: string
      day: number
      status: DailyAttendanceStatus
      checkInTime: string | null
      gpsVerified: boolean
    }> = []

    while (monthCursor <= monthEndDate) {
      const date = toDateKey(monthCursor)
      const record = recordsByDate.get(date)
      const future = date > today

      days.push({
        date,
        day: monthCursor.getDate(),
        status: future
          ? "not_marked"
          : record
            ? record.status === "half-day"
              ? "half-day"
              : record.status === "late"
                ? "late"
                : "present"
            : "absent",
        checkInTime: record?.check_in_time ?? null,
        gpsVerified:
          record?.distance_meters !== null && record?.distance_meters !== undefined,
      })

      monthCursor.setDate(monthCursor.getDate() + 1)
    }

    const countedDays = days.filter((day) => day.date <= today)
    const presentDays = countedDays.filter(
      (day) => day.status === "present" || day.status === "late"
    ).length
    const absentDays = countedDays.filter((day) => day.status === "absent").length
    const lateCheckIns = countedDays.filter((day) => day.status === "late").length
    const attendancePercent =
      countedDays.length > 0
        ? Math.round((presentDays / countedDays.length) * 100)
        : 0
    let streak = 0
    const streakCursor = parseDateKey(today)

    while (streakCursor >= parseDateKey(monthStart)) {
      const record = recordsByDate.get(toDateKey(streakCursor))
      if (!record) break
      streak += 1
      streakCursor.setDate(streakCursor.getDate() - 1)
    }

    const todayRecord = recordsByDate.get(today)

    return {
      month: {
        start: monthStart,
        end: monthEnd,
      },
      today: {
        checkedIn: Boolean(todayRecord),
        status: todayRecord?.status ?? "not_marked",
        checkInTime: todayRecord?.check_in_time ?? null,
      },
      summary: {
        presentDays,
        absentDays,
        attendancePercent,
        streak,
        lateCheckIns,
      },
      calendar: days,
      history: records
        .slice()
        .reverse()
        .map((record) => ({
          id: String(record.id ?? `${this.ctx.authUserId}-${record.date}`),
          date: record.date,
          checkInTime: record.check_in_time ?? null,
          status: record.status === "late" ? "late" : "present",
          gpsVerified:
            record.distance_meters !== null && record.distance_meters !== undefined,
        })),
    }
  }

  private async markLiveDailyTrainerAttendance(
    input: TrainerAttendanceCheckInInput,
    requestId: string
  ) {
    const gym = await this.getAttendanceGym()
    if (!gym) return null

    const date = todayKey()
    const floor = await this.getTrainerFloorTiming()
    const existing = await this.admin
      .from("attendance")
      .select("id,date,check_in_time,check_out_time,status,distance_meters")
      .eq("user_id", this.ctx.authUserId)
      .eq("date", date)
      .maybeSingle()

    if (existing.error && !isMissingDbObjectError(existing.error)) {
      throw existing.error
    }

    let distance: number | null = null
    if (input.latitude !== undefined && input.longitude !== undefined) {
      distance = calculateDistance(
        input.latitude,
        input.longitude,
        gym.latitude,
        gym.longitude
      )
      const radius = Math.min(
        Number(gym.radius ?? gym.radius_meters ?? MAX_GYM_RADIUS_METERS),
        MAX_GYM_RADIUS_METERS
      )

      if (distance > radius) {
        throw new ForbiddenError("You are too far from the gym")
      }
    }

    const gpsVerified = distance !== null
    const nowIso = new Date().toISOString()

    if (input.action === "check_in") {
      if (existing.data?.check_in_time) {
        throw new ConflictError("You already checked in today")
      }

      if (!resolveCheckInWindow(new Date())) {
        throw new BadRequestError(
          "Check-in is available only during 6:00–10:00 AM and 4:00–10:00 PM"
        )
      }

      const isLate = isCheckInLate(nowIso, floor.floorStartTime)
      const insertResult = await this.admin
        .from("attendance")
        .insert({
          user_id: this.ctx.authUserId,
          gym_id: gym.id,
          date,
          status: isLate ? "late" : "present",
          check_in_time: nowIso,
          latitude: input.latitude ?? null,
          longitude: input.longitude ?? null,
          distance_meters:
            distance === null ? null : Number(distance.toFixed(2)),
        })
        .select("id,date,check_in_time,check_out_time,status,distance_meters")
        .single()

      if (insertResult.error) {
        if (isDuplicateError(insertResult.error)) {
          throw new ConflictError("You already checked in today")
        }
        if (isMissingDbObjectError(insertResult.error)) return null
        throw insertResult.error
      }

      return {
        id: insertResult.data.id,
        attendanceDate: insertResult.data.date,
        checkedInAt: insertResult.data.check_in_time,
        checkedOutAt: insertResult.data.check_out_time ?? null,
        status: insertResult.data.status,
        isLate,
        workDuration: null,
        gpsVerified: insertResult.data.distance_meters !== null,
        action: input.action,
        requestId,
      }
    }

    if (!existing.data?.check_in_time) {
      throw new BadRequestError("Check in before checking out")
    }
    if (existing.data.check_out_time) {
      throw new ConflictError("You already checked out today")
    }

    const wasLate =
      existing.data.status === "late" ||
      isCheckInLate(existing.data.check_in_time, floor.floorStartTime)
    const status = deriveCheckoutStatus(
      existing.data.check_in_time,
      nowIso,
      floor,
      wasLate
    )

    const updateResult = await this.admin
      .from("attendance")
      .update({
        check_out_time: nowIso,
        status,
      })
      .eq("id", existing.data.id)
      .select("id,date,check_in_time,check_out_time,status,distance_meters")
      .single()

    if (updateResult.error) {
      if (isMissingDbObjectError(updateResult.error)) return null
      throw updateResult.error
    }

    return {
      id: updateResult.data.id,
      attendanceDate: updateResult.data.date,
      checkedInAt: updateResult.data.check_in_time,
      checkedOutAt: updateResult.data.check_out_time,
      status: updateResult.data.status,
      isLate: status === "late" || wasLate,
      workDuration: formatWorkDuration(
        updateResult.data.check_in_time,
        updateResult.data.check_out_time
      ),
      gpsVerified:
        updateResult.data.distance_meters !== null || gpsVerified,
      action: input.action,
      requestId,
    }
  }

  private async getAttendanceGym() {
    if (this.ctx.user.gymId) {
      const { data, error } = await this.admin
        .from("gyms")
        .select("id,name,latitude,longitude,radius")
        .eq("id", this.ctx.user.gymId)
        .maybeSingle()

      if (error && !isMissingDbObjectError(error)) throw error
      if (data) return data as GymRow
    }

    const { data, error } = await this.admin
      .from("gyms")
      .select("id,name,latitude,longitude,radius")
      .order("created_at", { ascending: true })
      .limit(1)
      .maybeSingle()

    if (error) {
      if (isMissingDbObjectError(error)) return null
      throw error
    }

    return data as GymRow | null
  }

  private async getLegacyTrainerId() {
    const { data, error } = await this.admin
      .from("trainers")
      .select("id")
      .eq("user_id", this.ctx.authUserId)
      .maybeSingle()

    if (error) {
      if (isMissingDbObjectError(error)) return null
      throw error
    }

    return data?.id ? Number(data.id) : null
  }

  private async ensureTrainerDataBucket() {
    const { error } = await this.admin.storage.createBucket(TRAINER_DATA_BUCKET, {
      public: false,
    })

    if (
      error &&
      !error.message.toLowerCase().includes("already exists") &&
      !error.message.toLowerCase().includes("duplicate")
    ) {
      throw error
    }
  }

  private async readStoredWorkoutPlans(): Promise<StoredWorkoutPlan[]> {
    await this.ensureTrainerDataBucket()

    const { data, error } = await this.admin.storage
      .from(TRAINER_DATA_BUCKET)
      .download(WORKOUT_PLANS_PATH)

    if (error) {
      if (
        error.message.toLowerCase().includes("not found") ||
        error.message.toLowerCase().includes("does not exist")
      ) {
        return []
      }

      throw error
    }

    const text = await data.text()
    if (!text.trim()) return []

    try {
      const parsed = JSON.parse(text)
      return Array.isArray(parsed) ? parsed : []
    } catch {
      return []
    }
  }

  private async writeStoredWorkoutPlans(plans: StoredWorkoutPlan[]) {
    await this.ensureTrainerDataBucket()

    const { error } = await this.admin.storage
      .from(TRAINER_DATA_BUCKET)
      .upload(WORKOUT_PLANS_PATH, Buffer.from(JSON.stringify(plans, null, 2)), {
        contentType: "application/json",
        upsert: true,
      })

    if (error) throw error
  }

  private async getTableSalary() {
    // trainer_salaries is keyed by user_id (the trainer's auth user ID).
    // This is the same table the owner writes to via the salary management page.
    const userId = this.ctx.authUserId
    if (!userId) return null

    const { data, error } = await this.admin
      .from("trainer_salaries")
      .select("id,month_start,base_salary,bonus,status,paid_at")
      .eq("user_id", userId)
      .order("month_start", { ascending: false })
      .limit(12)

    if (error) {
      if (isMissingDbObjectError(error)) return null
      throw error
    }

    if (!data || data.length === 0) return null

    return this.formatSalaryRows((data ?? []) as SalaryRow[], 0)
  }

  private async getStoredSalary() {
    await this.ensureTrainerDataBucket()
    const path = `salary/${this.ctx.authUserId}.json`
    const { data, error } = await this.admin.storage
      .from(TRAINER_DATA_BUCKET)
      .download(path)

    if (error) {
      if (
        error.message.toLowerCase().includes("not found") ||
        error.message.toLowerCase().includes("does not exist")
      ) {
        return null
      }
      throw error
    }

    try {
      const parsed = JSON.parse(await data.text())
      const rows = Array.isArray(parsed) ? parsed : []
      return this.formatSalaryRows(rows as SalaryRow[], 0)
    } catch {
      return null
    }
  }

  private formatSalaryRows(rows: SalaryRow[], fallbackBaseSalary: number) {
    const currentMonth = currentMonthStartKey()
    const current =
      rows.find((row) => row.month_start === currentMonth) ??
      ({
        id: "current",
        month_start: currentMonth,
        base_salary: fallbackBaseSalary,
        bonus: 0,
        status: "pending",
        paid_at: null,
      } satisfies SalaryRow)
    const history = rows.map((row) => ({
      id: row.id,
      monthStart: row.month_start,
      baseSalary: toNumber(row.base_salary),
      bonus: toNumber(row.bonus),
      total: toNumber(row.base_salary) + toNumber(row.bonus),
      status: statusPillForSalary(row.status),
      paidAt: row.paid_at,
    }))
    const lastPaid = history.find((row) => row.status === "paid")

    return {
      current: {
        monthStart: current.month_start,
        baseSalary: toNumber(current.base_salary),
        bonus: toNumber(current.bonus),
        total: toNumber(current.base_salary) + toNumber(current.bonus),
        status: statusPillForSalary(current.status),
        paidAt: current.paid_at,
      },
      lastPaymentDate: lastPaid?.paidAt ?? null,
      history,
    }
  }
}
