import type { AuthContext } from "@/src/middleware/auth.middleware"
import { requireRole } from "@/src/middleware/role.middleware"
import { createSupabaseServiceRoleClient } from "@/src/services/supabase.service"
import { getOwnerGymId } from "@/src/utils/owner-gym"

const admin = createSupabaseServiceRoleClient()

function toNumber(value: number | string | null | undefined) {
  if (value === null || value === undefined) return 0
  return Number(value)
}

function daysLeft(endDate: string | null): number {
  if (!endDate) return 0
  const now = new Date()
  const end = new Date(endDate + "T23:59:59")
  return Math.max(0, Math.ceil((end.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)))
}

function membershipStatus(
  status: string | null,
  endDate: string | null
): "active" | "expiring" | "expired" {
  if (!status || status === "expired") return "expired"
  const remaining = daysLeft(endDate)
  if (remaining <= 0) return "expired"
  if (remaining <= 14) return "expiring"
  return "active"
}

// ─── Members ──────────────────────────────────────────────────────────────────

export interface OwnerMemberRow {
  id: string
  name: string
  email: string | null
  phone: string | null
  avatarUrl: string | null
  branch: string | null
  joinDate: string
  membershipPlan: string | null
  membershipStatus: "active" | "expiring" | "expired"
  daysRemaining: number
  lastCheckIn: string | null
  lastCheckInRelative: string
}

export async function listOwnerMembers(
  ctx: AuthContext,
  options: {
    search?: string
    status?: string
    page?: number
    limit?: number
  } = {}
): Promise<{ members: OwnerMemberRow[]; total: number }> {
  requireRole(ctx, ["owner"])

  const { search, status = "all", page = 1, limit = 20 } = options
  const offset = (page - 1) * limit
  const ownerGymId = getOwnerGymId(ctx)

  let usersQuery = admin
    .from("users")
    .select("id, name, email, gym_id, created_at", { count: "exact" })
    .eq("role", "client")
    .order("created_at", { ascending: false })

  if (ownerGymId) {
    usersQuery = usersQuery.eq("gym_id", ownerGymId)
  }

  if (search?.trim()) {
    usersQuery = usersQuery.ilike("name", `%${search.trim()}%`)
  }

  if (status === "all") {
    usersQuery = usersQuery.range(offset, offset + limit - 1)
  }

  const usersResult = await usersQuery
  if (usersResult.error) throw usersResult.error

  const users = usersResult.data ?? []
  const userIds = users.map((u) => u.id)
  let total = usersResult.count ?? 0

  if (userIds.length === 0) return { members: [], total }

  // Parallel: memberships, last attendance, user_details (phone/avatar)
  const [membershipsRes, attendanceRes, detailsRes, gymsRes] = await Promise.all([
    admin
      .from("memberships")
      .select("user_id, start_date, end_date, status, gym_id")
      .in("user_id", userIds)
      .order("end_date", { ascending: false }),
    admin
      .from("attendance")
      .select("user_id, date, check_in_time")
      .in("user_id", userIds)
      .order("date", { ascending: false }),
    admin
      .from("user_details")
      .select("user_id, phone, profile_pic_url, profile_photo_url")
      .in("user_id", userIds),
    admin.from("gyms").select("id, name"),
  ])

  // Build lookup maps
  const membershipByUser = new Map<string, any>()
  for (const m of (membershipsRes.data ?? [])) {
    if (!membershipByUser.has(m.user_id)) membershipByUser.set(m.user_id, m)
  }

  const lastAttendanceByUser = new Map<string, any>()
  for (const a of (attendanceRes.data ?? [])) {
    if (a.user_id && !lastAttendanceByUser.has(a.user_id)) {
      lastAttendanceByUser.set(a.user_id, a)
    }
  }

  const detailsByUser = new Map<string, any>()
  for (const d of (detailsRes.data ?? [])) {
    detailsByUser.set(d.user_id, d)
  }

  const gymById = new Map<string, string>()
  for (const g of (gymsRes.data ?? [])) {
    gymById.set(g.id, g.name)
  }

  function relativeCheckIn(dateStr: string | null): string {
    if (!dateStr) return "No attendance"
    const days = Math.floor(
      (Date.now() - new Date(dateStr + "T00:00:00").getTime()) / (1000 * 60 * 60 * 24)
    )
    if (days === 0) return "Today"
    if (days === 1) return "Yesterday"
    if (days < 7) return `${days} days ago`
    if (days < 30) return `${Math.floor(days / 7)} weeks ago`
    return `${Math.floor(days / 30)} months ago`
  }

  const members: OwnerMemberRow[] = users.map((user) => {
    const membership = membershipByUser.get(user.id)
    const lastA = lastAttendanceByUser.get(user.id)
    const details = detailsByUser.get(user.id)
    const gymName = membership?.gym_id ? gymById.get(membership.gym_id) ?? null : null
    const mStatus = membershipStatus(membership?.status ?? null, membership?.end_date ?? null)

    return {
      id: user.id,
      name: user.name ?? user.email ?? "Member",
      email: user.email ?? null,
      phone: details?.phone ?? null,
      avatarUrl: details?.profile_pic_url ?? details?.profile_photo_url ?? null,
      branch: gymName,
      joinDate: user.created_at,
      membershipPlan: membership
        ? `${membership.start_date} to ${membership.end_date}`
        : null,
      membershipStatus: mStatus,
      daysRemaining: daysLeft(membership?.end_date ?? null),
      lastCheckIn: lastA?.date ?? null,
      lastCheckInRelative: relativeCheckIn(lastA?.date ?? null),
    }
  })

  const filtered =
    status === "all"
      ? members
      : members.filter((m) => m.membershipStatus === status)

  if (status !== "all") {
    total = filtered.length
    const paged = filtered.slice(offset, offset + limit)
    return { members: paged, total }
  }

  return { members: filtered, total }
}

// ─── Trainers ─────────────────────────────────────────────────────────────────

export interface OwnerTrainerRow {
  id: string
  name: string
  email: string | null
  phone: string | null
  avatarUrl: string | null
  branch: string | null
  joinDate: string
  specialization: string | null
  experience: string | null
  clientCount: number
  attendanceToday: boolean
  attendancePercent: number
  salaryStatus: "paid" | "processing" | "pending"
  currentSalary: number
}

export async function listOwnerTrainers(
  ctx: AuthContext,
  options: { search?: string } = {}
): Promise<{ trainers: OwnerTrainerRow[] }> {
  requireRole(ctx, ["owner"])

  const { search } = options
  const ownerGymId = getOwnerGymId(ctx)

  let trainersQuery = admin
    .from("users")
    .select("id, name, email, gym_id, created_at")
    .eq("role", "trainer")
    .order("name")

  if (ownerGymId) {
    trainersQuery = trainersQuery.eq("gym_id", ownerGymId)
  }

  if (search?.trim()) {
    trainersQuery = trainersQuery.ilike("name", `%${search.trim()}%`)
  }

  const trainersResult = await trainersQuery
  if (trainersResult.error) throw trainersResult.error

  const trainers = trainersResult.data ?? []
  const trainerIds = trainers.map((t) => t.id)

  if (trainerIds.length === 0) return { trainers: [] }

  const today = new Date().toISOString().split("T")[0]!
  const thisMonth = today.slice(0, 7)

  const [detailsRes, clientsRes, attendanceTodayRes, salaryRes, gymsRes] = await Promise.all([
    admin
      .from("user_details")
      .select("user_id, phone, profile_pic_url, profile_photo_url, specialization, experience")
      .in("user_id", trainerIds),
    // Count clients per trainer via memberships.trainer_id (if exists) or fallback to gym_id match
    admin
      .from("users")
      .select("gym_id")
      .eq("role", "client"),
    admin
      .from("attendance")
      .select("user_id, check_in_time")
      .in("user_id", trainerIds)
      .eq("date", today),
    admin
      .from("trainer_salaries")
      .select("user_id, base_salary, bonus, status, month_start")
      .in("user_id", trainerIds)
      .gte("month_start", `${thisMonth}-01`)
      .lte("month_start", `${thisMonth}-31`),
    admin.from("gyms").select("id, name"),
  ])

  const detailsByTrainer = new Map<string, any>()
  for (const d of (detailsRes.data ?? [])) {
    detailsByTrainer.set(d.user_id, d)
  }

  const checkedInToday = new Set<string>(
    (attendanceTodayRes.data ?? []).map((a: any) => a.user_id)
  )

  const salaryByTrainer = new Map<string, any>()
  for (const s of (salaryRes.data ?? [])) {
    if (!salaryByTrainer.has(s.user_id)) salaryByTrainer.set(s.user_id, s)
  }

  const gymById = new Map<string, string>()
  for (const g of (gymsRes.data ?? [])) {
    gymById.set(g.id, g.name)
  }

  // Approximate client count: clients in the same gym
  const clientsByGym = new Map<string, number>()
  for (const c of (clientsRes.data ?? [])) {
    if (c.gym_id) {
      clientsByGym.set(c.gym_id, (clientsByGym.get(c.gym_id) ?? 0) + 1)
    }
  }

  const result: OwnerTrainerRow[] = trainers.map((trainer) => {
    const details = detailsByTrainer.get(trainer.id)
    const salary = salaryByTrainer.get(trainer.id)
    const gymName = trainer.gym_id ? gymById.get(trainer.gym_id) ?? null : null
    const clientCount = trainer.gym_id ? (clientsByGym.get(trainer.gym_id) ?? 0) : 0

    return {
      id: trainer.id,
      name: trainer.name ?? trainer.email ?? "Trainer",
      email: trainer.email ?? null,
      phone: details?.phone ?? null,
      avatarUrl: details?.profile_pic_url ?? details?.profile_photo_url ?? null,
      branch: gymName,
      joinDate: trainer.created_at,
      specialization: details?.specialization ?? null,
      experience: details?.experience ?? null,
      clientCount,
      attendanceToday: checkedInToday.has(trainer.id),
      attendancePercent: 0, // computed separately if needed
      salaryStatus: salary?.status ?? "pending",
      currentSalary: toNumber(salary?.base_salary) + toNumber(salary?.bonus),
    }
  })

  return { trainers: result }
}

// ─── Salary ───────────────────────────────────────────────────────────────────

export interface OwnerSalaryRow {
  id: string
  trainerId: string
  trainerName: string
  avatarUrl: string | null
  monthStart: string
  baseSalary: number
  bonus: number
  total: number
  status: "paid" | "processing" | "pending"
  paidAt: string | null
}

export async function listOwnerSalaries(
  ctx: AuthContext,
  options: { month?: string } = {}
): Promise<{ salaries: OwnerSalaryRow[]; month: string }> {
  requireRole(ctx, ["owner"])

  const now = new Date()
  const month =
    options.month ??
    `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-01`

  const salariesRes = await admin
    .from("trainer_salaries")
    .select("id, user_id, base_salary, bonus, status, paid_at, month_start")
    .gte("month_start", month)
    .lte("month_start", month.slice(0, 7) + "-31")
    .order("month_start", { ascending: false })

  if (salariesRes.error) {
    // Table might not exist yet — return empty instead of 500
    const code = (salariesRes.error as any).code
    if (code === "42P01" || code === "PGRST200" || code === "PGRST205") {
      return { salaries: [], month }
    }
    throw salariesRes.error
  }

  const trainerIds = [...new Set((salariesRes.data ?? []).map((s: any) => s.user_id))]

  const [trainersRes, detailsRes] = trainerIds.length > 0
    ? await Promise.all([
        admin.from("users").select("id, name").in("id", trainerIds),
        admin
          .from("user_details")
          .select("user_id, profile_pic_url, profile_photo_url")
          .in("user_id", trainerIds),
      ])
    : [{ data: [] }, { data: [] }]

  const trainerById = new Map<string, string>()
  for (const t of (trainersRes.data ?? [])) {
    trainerById.set(t.id, t.name ?? "Trainer")
  }

  const avatarByTrainer = new Map<string, string | null>()
  for (const d of (detailsRes.data ?? [])) {
    avatarByTrainer.set(d.user_id, d.profile_pic_url ?? d.profile_photo_url ?? null)
  }

  const salaries: OwnerSalaryRow[] = (salariesRes.data ?? []).map((s: any) => ({
    id: s.id,
    trainerId: s.user_id,
    trainerName: trainerById.get(s.user_id) ?? "Trainer",
    avatarUrl: avatarByTrainer.get(s.user_id) ?? null,
    monthStart: s.month_start,
    baseSalary: toNumber(s.base_salary),
    bonus: toNumber(s.bonus),
    total: toNumber(s.base_salary) + toNumber(s.bonus),
    status: (s.status as "paid" | "processing" | "pending") ?? "pending",
    paidAt: s.paid_at ?? null,
  }))

  return { salaries, month }
}

export async function updateSalaryRecord(
  ctx: AuthContext,
  input: { id: string; status?: "paid" | "processing" | "pending"; baseSalary?: number; bonus?: number }
): Promise<void> {
  requireRole(ctx, ["owner"])

  const update: Record<string, unknown> = {}

  if (input.status !== undefined) {
    update.status = input.status
    if (input.status === "paid") {
      update.paid_at = new Date().toISOString()
    } else {
      // Reset paid_at when reverting from paid
      update.paid_at = null
    }
  }

  if (input.baseSalary !== undefined) update.base_salary = input.baseSalary
  if (input.bonus !== undefined) update.bonus = input.bonus

  if (Object.keys(update).length === 0) return

  const { error } = await admin
    .from("trainer_salaries")
    .update(update)
    .eq("id", input.id)

  if (error) throw error
}
