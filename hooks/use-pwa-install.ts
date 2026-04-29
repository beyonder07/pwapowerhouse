"use client"

import { useState, useEffect } from "react"

interface BeforeInstallPromptEvent extends Event {
  readonly platforms: Array<string>
  readonly userChoice: Promise<{
    outcome: "accepted" | "dismissed"
    platform: string
  }>
  prompt(): Promise<void>
}

import { toast } from "sonner"

export function usePwaInstall() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null)
  const [isInstallable, setIsInstallable] = useState(false)

  useEffect(() => {
    const handler = (e: Event) => {
      e.preventDefault()
      setDeferredPrompt(e as BeforeInstallPromptEvent)
      setIsInstallable(true)
    }

    window.addEventListener("beforeinstallprompt", handler)

    return () => {
      window.removeEventListener("beforeinstallprompt", handler)
    }
  }, [])

  const installPwa = async () => {
    if (!deferredPrompt) {
      // Fallback instructions for iOS and non-installable browsers
      const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) && !(window as any).MSStream;
      
      if (isIOS) {
        toast.info("Install Instructions", {
          description: "Tap the 'Share' button at the bottom of your browser and then tap 'Add to Home Screen'.",
          duration: 6000,
        });
      } else {
        toast.info("Installation", {
          description: "To install this app, open your browser menu and select 'Install' or 'Add to Home Screen'.",
          duration: 6000,
        });
      }
      return
    }

    deferredPrompt.prompt()
    const { outcome } = await deferredPrompt.userChoice
    console.log(`User response to the install prompt: ${outcome}`)
    setDeferredPrompt(null)
    setIsInstallable(false)
  }

  return { isInstallable, installPwa }
}
