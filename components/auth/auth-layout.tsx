"use client"

import { motion } from "framer-motion"
import { BrandLogo } from "@/components/brand-logo"

interface AuthLayoutProps {
  children: React.ReactNode
  title: string
  subtitle?: string
}

export function AuthLayout({ children, title, subtitle }: AuthLayoutProps) {
  return (
    <div className="safe-area-page flex flex-col bg-background">
      {/* Header */}
      <header className="p-3 sm:p-4">
        <BrandLogo href="/" size="lg" />
      </header>

      {/* Content */}
      <main className="app-scroll flex-1 px-4 py-6 sm:py-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          className="mx-auto flex min-h-full w-full max-w-md flex-col justify-center"
        >
          <div className="text-center mb-6 sm:mb-8">
            <h1 className="text-xl sm:text-2xl font-bold text-foreground text-balance">{title}</h1>
            {subtitle && (
              <p className="mt-2 text-xs sm:text-sm text-muted-foreground text-balance">{subtitle}</p>
            )}
          </div>
          <div className="rounded-lg sm:rounded-2xl border border-border bg-card p-4 sm:p-6 md:p-8">
            {children}
          </div>
        </motion.div>
      </main>

      {/* Footer */}
      <footer className="p-3 sm:p-4 text-center">
        <p className="text-xs text-muted-foreground">
          &copy; {new Date().getFullYear()} PowerHouse Gym
        </p>
      </footer>
    </div>
  )
}
