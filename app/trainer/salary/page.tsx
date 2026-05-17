"use client"

import { useEffect, useState } from "react"
import { CalendarDays, IndianRupee, Loader2, WalletCards } from "lucide-react"
import { toast } from "sonner"
import { MetricCard, PageIntro, StatusPill, SurfaceCard } from "@/components/powerhouse"

interface SalaryRow {
  id: string
  monthStart: string
  baseSalary: number
  bonus: number
  total: number
  status: "paid" | "processing" | "pending"
  paidAt: string | null
}

interface SalaryData {
  current: {
    monthStart: string
    baseSalary: number
    bonus: number
    total: number
    status: "paid" | "processing" | "pending"
    paidAt: string | null
  }
  lastPaymentDate: string | null
  history: SalaryRow[]
}

function formatCurrency(value: number) {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(value)
}

function formatMonth(value: string) {
  return new Intl.DateTimeFormat("en-IN", {
    month: "long",
    year: "numeric",
  }).format(new Date(`${value}T00:00:00`))
}

function formatDate(value: string | null) {
  if (!value) return "Not paid yet"
  return new Intl.DateTimeFormat("en-IN", {
    dateStyle: "medium",
  }).format(new Date(value))
}

function salaryStatusTone(status: SalaryRow["status"]) {
  if (status === "paid") return "success"
  if (status === "processing") return "warning"
  return "error"
}

export default function TrainerSalaryPage() {
  const [salary, setSalary] = useState<SalaryData | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    let mounted = true

    async function loadSalary() {
      try {
        const response = await fetch("/api/trainer/salary", {
          credentials: "include",
          cache: "no-store",
        })
        const result = await response.json()

        if (!response.ok || !result.success) {
          throw new Error(result.error || "Unable to load salary")
        }

        if (mounted) setSalary(result.data)
      } catch (error) {
        toast.error("Salary unavailable", {
          description:
            error instanceof Error
              ? error.message
              : "Please refresh and try again.",
        })
      } finally {
        if (mounted) setIsLoading(false)
      }
    }

    loadSalary()

    return () => {
      mounted = false
    }
  }, [])

  if (isLoading) {
    return (
      <div className="space-y-5">
        <PageIntro
          title="My Salary"
          description="Your own salary status and payment history"
        />
        <div className="flex h-48 items-center justify-center rounded-xl border border-border bg-card">
          <Loader2 className="h-6 w-6 animate-spin text-primary" />
        </div>
      </div>
    )
  }

  if (!salary) {
    return (
      <div className="space-y-5">
        <PageIntro
          title="My Salary"
          description="Your own salary status and payment history"
        />
        <SurfaceCard>
          <p className="text-sm text-muted-foreground">
            Salary data is unavailable right now.
          </p>
        </SurfaceCard>
      </div>
    )
  }

  return (
    <div className="space-y-5">
      <PageIntro
        title="My Salary"
        description="Your own salary status and payment history"
      />

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <MetricCard
          label="Current Month"
          value={formatCurrency(salary.current.total)}
          subValue={formatMonth(salary.current.monthStart)}
          icon={IndianRupee}
          accentColor="green"
        />
        <MetricCard
          label="Payment Status"
          value={salary.current.status}
          icon={WalletCards}
          accentColor={salary.current.status === "paid" ? "green" : "amber"}
        />
        <MetricCard
          label="Last Payment"
          value={formatDate(salary.lastPaymentDate)}
          icon={CalendarDays}
          accentColor="red"
        />
      </div>

      <SurfaceCard>
        <div className="mb-4 flex items-center justify-between gap-3">
          <div>
            <h2 className="text-lg font-semibold text-foreground">
              Current Salary
            </h2>
            <p className="text-sm text-muted-foreground">
              Only your salary record is visible here.
            </p>
          </div>
          <StatusPill
            status={salaryStatusTone(salary.current.status)}
            label={salary.current.status}
          />
        </div>

        <div className="grid gap-3 sm:grid-cols-3">
          <div className="rounded-lg bg-background p-3">
            <p className="text-xs text-muted-foreground">Base salary</p>
            <p className="mt-1 text-lg font-semibold text-foreground">
              {formatCurrency(salary.current.baseSalary)}
            </p>
          </div>
          <div className="rounded-lg bg-background p-3">
            <p className="text-xs text-muted-foreground">Bonus</p>
            <p className="mt-1 text-lg font-semibold text-foreground">
              {formatCurrency(salary.current.bonus)}
            </p>
          </div>
          <div className="rounded-lg bg-background p-3">
            <p className="text-xs text-muted-foreground">Paid date</p>
            <p className="mt-1 text-lg font-semibold text-foreground">
              {formatDate(salary.current.paidAt)}
            </p>
          </div>
        </div>
      </SurfaceCard>

      <SurfaceCard>
        <h2 className="mb-4 text-lg font-semibold text-foreground">
          Salary History
        </h2>
        {salary.history.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            No salary history has been recorded yet.
          </p>
        ) : (
          <div className="space-y-3">
            {salary.history.map((row) => (
              <div
                key={row.id}
                className="grid gap-3 rounded-lg border border-border bg-background p-3 sm:grid-cols-[1fr_auto_auto] sm:items-center"
              >
                <div>
                  <p className="text-sm font-semibold text-foreground">
                    {formatMonth(row.monthStart)}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Bonus {formatCurrency(row.bonus)}
                  </p>
                </div>
                <p className="text-base font-semibold text-foreground">
                  {formatCurrency(row.total)}
                </p>
                <StatusPill
                  status={salaryStatusTone(row.status)}
                  label={row.status}
                  size="sm"
                />
              </div>
            ))}
          </div>
        )}
      </SurfaceCard>
    </div>
  )
}
