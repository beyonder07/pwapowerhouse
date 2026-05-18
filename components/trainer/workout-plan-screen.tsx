"use client"

import { useEffect, useState } from "react"
import { createPortal } from "react-dom"
import { ArrowLeft, Loader2, Save, X } from "lucide-react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { WorkoutPlanEditor } from "@/components/trainer/workout-plan-editor"
import type { WorkoutForm, WorkoutMember } from "@/lib/trainer/workout-plan"

interface WorkoutPlanScreenProps {
  title: string
  description: string
  form: WorkoutForm
  members: WorkoutMember[]
  isSaving: boolean
  onChange: (updater: (current: WorkoutForm) => WorkoutForm) => void
  onSave: () => void
  onClose?: () => void
  closeHref?: string
  mode?: "page" | "dialog"
}

export function WorkoutPlanScreen({
  title,
  description,
  form,
  members,
  isSaving,
  onChange,
  onSave,
  onClose,
  closeHref = "/trainer/workouts",
  mode = "page",
}: WorkoutPlanScreenProps) {
  const isPage = mode === "page"
  const [mounted, setMounted] = useState(false)
  const [isMobile, setIsMobile] = useState(false)

  useEffect(() => {
    setMounted(true)
    if (!isPage) return
    const previous = document.body.style.overflow
    document.body.style.overflow = "hidden"
    return () => {
      document.body.style.overflow = previous
    }
  }, [isPage])

  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 1024)
    checkMobile()
    window.addEventListener("resize", checkMobile)
    return () => window.removeEventListener("resize", checkMobile)
  }, [])

  const content = (
    <div
      className={
        isPage
          ? "fixed inset-0 z-[60] flex flex-col bg-background lg:static lg:z-auto lg:mx-auto lg:max-h-none lg:max-w-2xl lg:rounded-xl lg:border lg:border-border"
          : "flex h-full min-h-0 flex-col"
      }
    >
      <header className="shrink-0 border-b border-border bg-background px-4 pb-3 pt-[max(0.75rem,env(safe-area-inset-top,0px))] sm:px-6">
        <div className="flex items-start gap-3">
          {isPage ? (
            <Button variant="ghost" size="icon" className="mt-0.5 shrink-0" asChild>
              <Link href={closeHref} aria-label="Back to workout plans">
                <ArrowLeft className="h-5 w-5" />
              </Link>
            </Button>
          ) : onClose ? (
            <Button
              variant="ghost"
              size="icon"
              className="mt-0.5 shrink-0"
              onClick={onClose}
              aria-label="Close"
            >
              <X className="h-5 w-5" />
            </Button>
          ) : null}

          <div className="min-w-0 flex-1 pr-8 sm:pr-0">
            <h1 className="text-base font-semibold text-foreground sm:text-lg">{title}</h1>
            <p className="mt-1 text-xs text-muted-foreground sm:text-sm">{description}</p>
          </div>
        </div>
      </header>

      <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-4 py-4 sm:px-6">
        <WorkoutPlanEditor form={form} members={members} onChange={onChange} />
        <div className="h-32 shrink-0" aria-hidden="true" />
      </div>

      <footer className="shrink-0 border-t border-border bg-background/95 px-4 pt-3 pb-[max(0.75rem,env(safe-area-inset-bottom,0px))] backdrop-blur supports-[backdrop-filter]:bg-background/80 sm:px-6">
        <Button onClick={onSave} disabled={isSaving} className="h-11 w-full text-base">
          {isSaving ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Saving...
            </>
          ) : (
            <>
              <Save className="mr-2 h-4 w-4" />
              Save Workout Plan
            </>
          )}
        </Button>
      </footer>
    </div>
  )

  if (isPage && isMobile && mounted) {
    return createPortal(content, document.body)
  }

  return content
}
