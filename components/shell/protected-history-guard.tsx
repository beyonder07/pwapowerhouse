"use client"

import { useEffect, useRef } from "react"
import { usePathname, useRouter } from "next/navigation"

export function ProtectedHistoryGuard() {
  const router = useRouter()
  const pathname = usePathname()
  const currentPathRef = useRef(pathname)

  useEffect(() => {
    currentPathRef.current = `${pathname}${window.location.search}${window.location.hash}`
  }, [pathname])

  useEffect(() => {
    const pushGuardState = () => {
      const currentPath = currentPathRef.current

      window.history.replaceState(
        { ...window.history.state, powerhouseProtected: true },
        "",
        currentPath
      )
      window.history.pushState(
        { ...window.history.state, powerhouseGuard: true },
        "",
        currentPath
      )
    }

    const handlePopState = () => {
      const currentPath = currentPathRef.current

      window.history.replaceState(
        { ...window.history.state, powerhouseProtected: true },
        "",
        currentPath
      )
      window.history.pushState(
        { ...window.history.state, powerhouseGuard: true },
        "",
        currentPath
      )
      router.replace(currentPath)
    }

    pushGuardState()
    window.addEventListener("popstate", handlePopState)

    return () => {
      window.removeEventListener("popstate", handlePopState)
    }
  }, [router])

  return null
}
