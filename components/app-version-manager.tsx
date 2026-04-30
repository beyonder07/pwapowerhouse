"use client"

import { useEffect } from "react"

const VERSION_URL = "/version.json"
const VERSION_STORAGE_KEY = "powerhouse-app-version"
const RELOAD_STORAGE_KEY = "powerhouse-version-reload"

interface VersionPayload {
  version?: string
}

async function fetchDeployedVersion() {
  const response = await fetch(`${VERSION_URL}?t=${Date.now()}`, {
    cache: "no-store",
    headers: {
      "Cache-Control": "no-cache",
    },
  })

  if (!response.ok) return null

  const payload = (await response.json()) as VersionPayload
  return typeof payload.version === "string" ? payload.version : null
}

async function clearBrowserCaches() {
  if (!("caches" in window)) return

  const cacheNames = await caches.keys()
  await Promise.all(cacheNames.map((cacheName) => caches.delete(cacheName)))
}

async function updateServiceWorkers() {
  if (!("serviceWorker" in navigator)) return

  const registrations = await navigator.serviceWorker.getRegistrations()

  await Promise.all(
    registrations.map(async (registration) => {
      await registration.update()
      registration.waiting?.postMessage({ type: "SKIP_WAITING" })
      registration.active?.postMessage({ type: "CLEAR_CACHES" })
    })
  )
}

async function registerServiceWorker() {
  if (!("serviceWorker" in navigator)) return

  const registration = await navigator.serviceWorker.register("/sw.js", {
    updateViaCache: "none",
  })

  registration.addEventListener("updatefound", () => {
    const installingWorker = registration.installing
    if (!installingWorker) return

    installingWorker.addEventListener("statechange", () => {
      if (
        installingWorker.state === "installed" &&
        navigator.serviceWorker.controller
      ) {
        installingWorker.postMessage({ type: "SKIP_WAITING" })
      }
    })
  })

  await registration.update()
}

async function checkForNewVersion() {
  const deployedVersion = await fetchDeployedVersion()
  if (!deployedVersion) return

  const currentVersion = window.localStorage.getItem(VERSION_STORAGE_KEY)

  if (!currentVersion) {
    window.localStorage.setItem(VERSION_STORAGE_KEY, deployedVersion)
    return
  }

  if (currentVersion === deployedVersion) return

  const reloadMarker = `${currentVersion}->${deployedVersion}`
  if (window.sessionStorage.getItem(RELOAD_STORAGE_KEY) === reloadMarker) {
    window.localStorage.setItem(VERSION_STORAGE_KEY, deployedVersion)
    return
  }

  window.sessionStorage.setItem(RELOAD_STORAGE_KEY, reloadMarker)
  window.localStorage.setItem(VERSION_STORAGE_KEY, deployedVersion)

  await updateServiceWorkers()
  await clearBrowserCaches()

  window.location.reload()
}

export function AppVersionManager() {
  useEffect(() => {
    let cancelled = false
    let hasReloadedForControllerChange = false

    async function boot() {
      try {
        await registerServiceWorker()
        if (!cancelled) await checkForNewVersion()
      } catch (error) {
        console.warn(
          "PowerHouse update check failed:",
          error instanceof Error ? error.message : error
        )
      }
    }

    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible") {
        checkForNewVersion().catch(() => undefined)
      }
    }

    const handleControllerChange = () => {
      if (hasReloadedForControllerChange) return

      hasReloadedForControllerChange = true
      window.location.reload()
    }

    if (document.readyState === "complete") {
      boot()
    } else {
      window.addEventListener("load", boot, { once: true })
    }
    window.addEventListener("focus", handleVisibilityChange)
    document.addEventListener("visibilitychange", handleVisibilityChange)

    if ("serviceWorker" in navigator) {
      navigator.serviceWorker.addEventListener(
        "controllerchange",
        handleControllerChange
      )
    }

    return () => {
      cancelled = true
      window.removeEventListener("load", boot)
      window.removeEventListener("focus", handleVisibilityChange)
      document.removeEventListener("visibilitychange", handleVisibilityChange)

      if ("serviceWorker" in navigator) {
        navigator.serviceWorker.removeEventListener(
          "controllerchange",
          handleControllerChange
        )
      }
    }
  }, [])

  return null
}
