import type { Session } from "@supabase/supabase-js"
import type { NextRequest, NextResponse } from "next/server"

const useSecureCookiePrefix = process.env.NODE_ENV === "production"

export const ACCESS_COOKIE = useSecureCookiePrefix
  ? "__Host-ph_access"
  : "ph_access"
export const REFRESH_COOKIE = useSecureCookiePrefix
  ? "__Host-ph_refresh"
  : "ph_refresh"

const COOKIE_BASE = {
  httpOnly: true,
  path: "/",
  sameSite: "lax" as const,
  secure: useSecureCookiePrefix,
}

export function getAccessToken(req: NextRequest) {
  return req.cookies.get(ACCESS_COOKIE)?.value
}

export function getRefreshToken(req: NextRequest) {
  return req.cookies.get(REFRESH_COOKIE)?.value
}

export function setSessionCookies(res: NextResponse, session: Session) {
  res.cookies.set(ACCESS_COOKIE, session.access_token, {
    ...COOKIE_BASE,
    maxAge: Math.min(session.expires_in ?? 900, 60 * 15),
  })

  res.cookies.set(REFRESH_COOKIE, session.refresh_token, {
    ...COOKIE_BASE,
    maxAge: 60 * 60 * 24 * 30,
  })
}

export function clearSessionCookies(res: NextResponse) {
  res.cookies.set(ACCESS_COOKIE, "", { ...COOKIE_BASE, maxAge: 0 })
  res.cookies.set(REFRESH_COOKIE, "", { ...COOKIE_BASE, maxAge: 0 })
}
