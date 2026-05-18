export type DailyAttendanceStatus =
  | "present"
  | "late"
  | "absent"
  | "half-day"
  | "not_marked"

export type DailyAttendanceAction = "check_in" | "check_out"

export interface TrainerFloorTiming {
  floorStartTime: string | null
  floorEndTime: string | null
}

export interface StoredDailyAttendance {
  date: string
  checkInAt: string | null
  checkOutAt: string | null
  status: "present" | "late" | "half-day"
  isLate: boolean
  gpsVerified: boolean
}

const DEFAULT_FLOOR_START = "06:00:00"
const HALF_DAY_RATIO = 0.5

export function pad(value: number) {
  return String(value).padStart(2, "0")
}

export function parseTimeToMinutes(value: string | null | undefined): number | null {
  if (!value?.trim()) return null
  const parts = value.trim().split(":")
  const hour = Number(parts[0])
  const minute = Number(parts[1] ?? 0)
  if (!Number.isFinite(hour) || !Number.isFinite(minute)) return null
  return hour * 60 + minute
}

export function timeLabelFromMinutes(totalMinutes: number) {
  const hour24 = Math.floor(totalMinutes / 60)
  const minute = totalMinutes % 60
  const hour12 = hour24 % 12 || 12
  const period = hour24 >= 12 ? "PM" : "AM"
  return `${hour12}:${pad(minute)} ${period}`
}

export function formatFloorTimeLabel(value: string | null) {
  const minutes = parseTimeToMinutes(value)
  if (minutes === null) return null
  return timeLabelFromMinutes(minutes)
}

export function zonedParts(date = new Date(), timeZone = "Asia/Kolkata") {
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

export function checkInMinutesFromIso(iso: string, timeZone = "Asia/Kolkata") {
  return zonedParts(new Date(iso), timeZone).minutes
}

/**
 * Determines if a check-in is late.
 * Compares the check-in time against the trainer's floorStartTime.
 * If no floorStartTime is set, defaults to 06:00.
 */
export function isCheckInLate(
  checkInIso: string,
  floorStartTime: string | null | undefined,
  graceMinutes = 0
) {
  const minutes = checkInMinutesFromIso(checkInIso)
  const expected = parseTimeToMinutes(floorStartTime ?? DEFAULT_FLOOR_START)
  if (expected === null) return false
  return minutes > expected + graceMinutes
}

export function workDurationMs(checkInIso: string, checkOutIso: string) {
  return Math.max(0, new Date(checkOutIso).getTime() - new Date(checkInIso).getTime())
}

export function formatWorkDuration(checkInIso: string | null, checkOutIso: string | null) {
  if (!checkInIso || !checkOutIso) return null
  const totalMinutes = Math.floor(workDurationMs(checkInIso, checkOutIso) / 60000)
  const hours = Math.floor(totalMinutes / 60)
  const minutes = totalMinutes % 60
  if (hours <= 0) return `${minutes}m`
  if (minutes <= 0) return `${hours}h`
  return `${hours}h ${minutes}m`
}

export function expectedWorkMinutes(floor: TrainerFloorTiming) {
  const start = parseTimeToMinutes(floor.floorStartTime ?? DEFAULT_FLOOR_START)
  const end = parseTimeToMinutes(floor.floorEndTime)
  if (start === null || end === null || end <= start) return null
  return end - start
}

export function deriveCheckoutStatus(
  checkInIso: string,
  checkOutIso: string,
  floor: TrainerFloorTiming,
  wasLate: boolean
): "present" | "late" | "half-day" {
  const expected = expectedWorkMinutes(floor)
  if (expected !== null) {
    const worked = workDurationMs(checkInIso, checkOutIso) / 60000
    if (worked < expected * HALF_DAY_RATIO) return "half-day"
  }
  return wasLate ? "late" : "present"
}

export function asRecord(value: unknown) {
  return value !== null && typeof value === "object"
    ? (value as Record<string, unknown>)
    : null
}

export function stringField(record: Record<string, unknown> | null, key: string) {
  const value = record?.[key]
  return typeof value === "string" && value.trim() ? value.trim() : null
}

/** Migrate legacy morning/evening session blobs to one daily record. */
export function normalizeStoredDay(row: unknown): StoredDailyAttendance | null {
  const record = asRecord(row)
  const date = stringField(record, "date")
  if (!date) return null

  const directCheckIn =
    stringField(record, "checkInAt") ?? stringField(record, "check_in_at")
  if (directCheckIn) {
    const statusRaw = stringField(record, "status")
    const isLate = record?.isLate === true || statusRaw === "late"
    return {
      date,
      checkInAt: directCheckIn,
      checkOutAt:
        stringField(record, "checkOutAt") ?? stringField(record, "check_out_at"),
      status:
        statusRaw === "half-day"
          ? "half-day"
          : isLate
            ? "late"
            : "present",
      isLate,
      gpsVerified: record?.gpsVerified === true,
    }
  }

  // Legacy: merge morning/evening sessions into a single daily record
  const sessions = asRecord(record?.sessions)
  if (!sessions) return null

  const sessionRecords = ["morning", "evening"]
    .map((key) => asRecord(sessions[key]))
    .filter((session): session is Record<string, unknown> => Boolean(session))

  if (sessionRecords.length === 0) return null

  const checkIns = sessionRecords
    .map((session) => stringField(session, "checkInAt"))
    .filter((value): value is string => Boolean(value))
    .sort()
  const checkOuts = sessionRecords
    .map((session) => stringField(session, "checkOutAt"))
    .filter((value): value is string => Boolean(value))
    .sort()

  const isLate = sessionRecords.some((session) => session.status === "late")
  const checkInAt = checkIns[0] ?? null
  const checkOutAt = checkOuts.at(-1) ?? null

  return {
    date,
    checkInAt,
    checkOutAt,
    status: isLate ? "late" : "present",
    isLate,
    gpsVerified: sessionRecords.some((session) => session.gpsVerified === true),
  }
}
