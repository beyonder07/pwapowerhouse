export interface ParsedPaymentDates {
  planStartDate: string
  paymentDate: string
  screenshotUrl: string
}

export function parsePaymentDates(
  screenshotUrl: string | null | undefined,
  createdAt: string | Date | null | undefined
): ParsedPaymentDates {
  // Default to today or created_at date
  const defaultDateStr = createdAt 
    ? new Date(createdAt).toISOString().split("T")[0]
    : new Date().toISOString().split("T")[0]

  let planStartDate = defaultDateStr
  let paymentDate = defaultDateStr
  let cleanScreenshotUrl = ""

  if (screenshotUrl) {
    if (screenshotUrl.startsWith("http://cash.local")) {
      cleanScreenshotUrl = ""
      try {
        const url = new URL(screenshotUrl)
        const pStart = url.searchParams.get("plan_start_date")
        const pDate = url.searchParams.get("payment_date")
        if (pStart) planStartDate = pStart
        if (pDate) paymentDate = pDate
      } catch (e) {}
    } else {
      try {
        const url = new URL(screenshotUrl)
        const pStart = url.searchParams.get("plan_start_date")
        const pDate = url.searchParams.get("payment_date")
        if (pStart) planStartDate = pStart
        if (pDate) paymentDate = pDate
        
        // Strip parameters to return clean, viewable asset URL
        url.search = ""
        cleanScreenshotUrl = url.toString()
      } catch (e) {
        // Plain string or unparseable URL
        cleanScreenshotUrl = screenshotUrl
      }
    }
  }

  return { planStartDate, paymentDate, screenshotUrl: cleanScreenshotUrl }
}

export function encodePaymentDates(
  screenshotUrl: string | null | undefined,
  planStartDate: string,
  paymentDate: string,
  paymentMode: string
): string {
  const pStart = planStartDate || new Date().toISOString().split("T")[0]
  const pDate = paymentDate || new Date().toISOString().split("T")[0]

  if (paymentMode === "cash") {
    return `http://cash.local?plan_start_date=${pStart}&payment_date=${pDate}`
  }

  const url = screenshotUrl || ""
  if (url && url.startsWith("http")) {
    try {
      const u = new URL(url)
      u.searchParams.set("plan_start_date", pStart)
      u.searchParams.set("payment_date", pDate)
      return u.toString()
    } catch (e) {
      return `${url}?plan_start_date=${pStart}&payment_date=${pDate}`
    }
  } else {
    return `${url}?plan_start_date=${pStart}&payment_date=${pDate}`
  }
}

/**
 * Returns the last day of the month as a string format (YYYY-MM-DD) for a given month prefix (YYYY-MM) or full ISO string.
 */
export function getEndOfMonth(monthStr: string): string {
  const monthPrefix = monthStr.slice(0, 7) // "YYYY-MM"
  const year = parseInt(monthPrefix.slice(0, 4), 10)
  const month = parseInt(monthPrefix.slice(5, 7), 10) // 1-12
  const lastDay = new Date(year, month, 0).getDate()
  return `${monthPrefix}-${String(lastDay).padStart(2, "0")}`
}

