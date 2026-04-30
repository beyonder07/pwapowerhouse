"use client"

import { motion } from "framer-motion"
import { Button } from "@/components/ui/button"
import { WifiOff, RefreshCw } from "lucide-react"
import { BrandLogo } from "@/components/brand-logo"

export default function OfflinePage() {
  const handleRetry = () => {
    window.location.reload()
  }

  return (
    <div className="safe-area-page flex flex-col bg-background">
      {/* Header */}
      <header className="p-4">
        <BrandLogo size="lg" />
      </header>

      {/* Content */}
      <main className="flex-1 flex items-center justify-center px-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          className="text-center max-w-md"
        >
          <motion.div
            initial={{ scale: 0.8 }}
            animate={{ scale: 1 }}
            transition={{ delay: 0.1, type: "spring", stiffness: 200 }}
            className="flex justify-center mb-6"
          >
            <div className="relative">
              <div className="h-20 w-20 rounded-full bg-secondary flex items-center justify-center">
                <WifiOff className="h-10 w-10 text-muted-foreground" />
              </div>
              <motion.div
                animate={{
                  scale: [1, 1.2, 1],
                  opacity: [0.5, 0.2, 0.5],
                }}
                transition={{
                  duration: 2,
                  repeat: Infinity,
                  ease: "easeInOut",
                }}
                className="absolute inset-0 rounded-full border-2 border-muted-foreground/30"
              />
            </div>
          </motion.div>

          <h1 className="text-2xl font-bold text-foreground mb-3">
            You&apos;re Offline
          </h1>
          <p className="text-muted-foreground mb-6 text-pretty">
            It looks like you&apos;ve lost your internet connection. Don&apos;t worry, 
            you can still access some features while offline.
          </p>

          <div className="rounded-xl border border-border bg-card p-4 mb-6">
            <h2 className="font-semibold text-foreground text-sm mb-2">
              Available Offline
            </h2>
            <ul className="text-sm text-muted-foreground space-y-1.5">
              <li>View your profile information</li>
              <li>See your workout plan</li>
              <li>Check your membership details</li>
            </ul>
          </div>

          <Button onClick={handleRetry} className="w-full sm:w-auto tap-target">
            <RefreshCw className="mr-2 h-4 w-4" />
            Try Again
          </Button>

          <p className="mt-6 text-xs text-muted-foreground">
            The app will automatically reconnect when your internet is back.
          </p>
        </motion.div>
      </main>

      {/* Footer */}
      <footer className="p-4 text-center">
        <p className="text-xs text-muted-foreground">
          PowerHouse Gym PWA
        </p>
      </footer>
    </div>
  )
}
