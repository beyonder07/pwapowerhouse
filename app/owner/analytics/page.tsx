"use client"

import { useEffect, useState } from "react"
import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from "recharts"
import { ArrowDownRight, ArrowUpRight, Download, IndianRupee, Loader2, RotateCcw, TrendingUp, UserCheck, Users, Zap } from "lucide-react"
import { toast } from "sonner"
import { PageIntro, SurfaceCard } from "@/components/powerhouse"
import { Button } from "@/components/ui/button"
import { RevenueTab, AttendanceTab } from "@/components/analytics"

type Tab = "revenue" | "attendance" | "retention"

interface RetentionData {
  totalMembers: number; activeMembers: number; newThisMonth: number
  churnRate: number; renewalRate: number; expiringThisWeek: number
  lifetimeValue: number
  membershipSegments: Array<{ label: string; count: number; color: string }>
}
interface InactiveData {
  count: number
  members: Array<{ memberId: string; fullName: string | null; email: string | null; lastAttendanceDate: string | null; inactiveDays: number | null }>
}

const CHART_COLORS = { grid:"#1f2937", axis:"#4b5563", tooltip:{ bg:"#111827", border:"#1f2937" } }
function formatCurrency(v: number) { return new Intl.NumberFormat("en-IN",{style:"currency",currency:"INR",maximumFractionDigits:0}).format(v) }

function StatCard({label,value,sub,icon:Icon,accent="default"}:{label:string;value:string|number;sub?:string;icon?:React.ElementType;accent?:"green"|"red"|"amber"|"default"}){
  const colors={green:"#10b981",red:"#ef4444",amber:"#f59e0b",default:"#6b7280"}
  const color=colors[accent]
  return(
    <div className="rounded-xl border border-border bg-card p-4" style={{borderLeftWidth:4,borderLeftColor:color}}>
      <div className="flex items-start justify-between">
        <div>
          <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">{label}</p>
          <p className="mt-1.5 text-2xl font-bold text-foreground tabular-nums">{value}</p>
          {sub&&<p className="mt-0.5 text-xs text-muted-foreground">{sub}</p>}
        </div>
        {Icon&&<div className="rounded-lg bg-secondary p-2"><Icon className="h-5 w-5" style={{color}}/></div>}
      </div>
    </div>
  )
}
function RetentionTab() {
  const [data, setData] = useState<RetentionData | null>(null)
  const [inactive, setInactive] = useState<InactiveData | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    Promise.all([
      fetch("/api/analytics/retention", { credentials: "include", cache: "no-store" }).then(r => r.json()),
      fetch("/api/analytics/inactive-members?days=14&limit=20", { credentials: "include", cache: "no-store" }).then(r => r.json()),
    ]).then(([ret, inact]) => {
      if (ret.success) setData(ret.data)
      if (inact.success) setInactive(inact.data)
    }).catch(() => toast.error("Retention data unavailable"))
      .finally(() => setLoading(false))
  }, [])

  if (loading) return <div className="flex h-64 items-center justify-center"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>

  const segments = data?.membershipSegments ?? []
  const total = segments.reduce((s, seg) => s + seg.count, 0)

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard label="Total Members" value={data?.totalMembers ?? 0} icon={Users} />
        <StatCard label="Active" value={data?.activeMembers ?? 0} sub="Valid membership" icon={UserCheck} accent="green" />
        <StatCard label="New This Month" value={data?.newThisMonth ?? 0} sub="Signups" icon={TrendingUp} accent="green" />
        <StatCard label="Avg Lifetime Value" value={formatCurrency(data?.lifetimeValue ?? 0)} sub="Per member" icon={IndianRupee} accent="amber" />
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Segment donut */}
        <SurfaceCard>
          <h3 className="mb-4 text-sm font-bold uppercase tracking-widest text-muted-foreground">Membership Breakdown</h3>
          <div className="flex items-center gap-6">
            <ResponsiveContainer width={180} height={180}>
              <PieChart>
                <Pie data={segments} dataKey="count" cx="50%" cy="50%" innerRadius={50} outerRadius={80} paddingAngle={3}>
                  {segments.map((seg, i) => <Cell key={i} fill={seg.color} />)}
                </Pie>
                <Tooltip contentStyle={{ backgroundColor: CHART_COLORS.tooltip.bg, border: `1px solid ${CHART_COLORS.tooltip.border}`, borderRadius: 8 }} />
              </PieChart>
            </ResponsiveContainer>
            <div className="flex-1 space-y-2">
              {segments.map((seg, i) => (
                <div key={i} className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2">
                    <div className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: seg.color }} />
                    <span className="text-sm text-muted-foreground">{seg.label}</span>
                  </div>
                  <div className="text-right">
                    <span className="text-sm font-bold text-foreground">{seg.count}</span>
                    <span className="ml-1 text-xs text-muted-foreground">{total > 0 ? `${Math.round(seg.count / total * 100)}%` : "0%"}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </SurfaceCard>

        {/* Renewal / Churn */}
        <SurfaceCard>
          <h3 className="mb-4 text-sm font-bold uppercase tracking-widest text-muted-foreground">Retention Health</h3>
          <div className="space-y-4">
            <div>
              <div className="mb-1 flex justify-between text-sm">
                <span className="text-muted-foreground">Renewal Rate</span>
                <span className="font-bold text-emerald-500">{data?.renewalRate ?? 0}%</span>
              </div>
              <div className="h-2 rounded-full bg-muted">
                <div className="h-2 rounded-full bg-emerald-500 transition-all" style={{ width: `${data?.renewalRate ?? 0}%` }} />
              </div>
            </div>
            <div>
              <div className="mb-1 flex justify-between text-sm">
                <span className="text-muted-foreground">Churn Rate</span>
                <span className="font-bold text-red-500">{data?.churnRate ?? 0}%</span>
              </div>
              <div className="h-2 rounded-full bg-muted">
                <div className="h-2 rounded-full bg-red-500 transition-all" style={{ width: `${data?.churnRate ?? 0}%` }} />
              </div>
            </div>
            <div className="rounded-lg border border-border bg-background p-3">
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Expiring This Week</span>
                <span className="text-sm font-bold text-amber-500">{data?.expiringThisWeek ?? 0} members</span>
              </div>
            </div>
          </div>
        </SurfaceCard>
      </div>

      {/* Inactive list */}
      {(inactive?.members?.length ?? 0) > 0 && (
        <SurfaceCard>
          <div className="mb-4 flex items-center gap-2">
            <Zap className="h-4 w-4 text-amber-500" />
            <h3 className="text-sm font-bold uppercase tracking-widest text-muted-foreground">
              Inactive Members (14+ Days)
            </h3>
          </div>
          <div className="space-y-2">
            {inactive!.members.map((m, i) => (
              <div key={i} className="flex items-center justify-between rounded-lg border border-border bg-background px-3 py-2">
                <div>
                  <p className="text-sm font-medium text-foreground">{m.fullName ?? "Member"}</p>
                  {m.email && <p className="text-xs text-muted-foreground">{m.email}</p>}
                </div>
                <div className="text-right">
                  <span className={`text-sm font-bold ${(m.inactiveDays ?? 0) >= 30 ? "text-red-500" : "text-amber-500"}`}>
                    {m.inactiveDays != null ? `${m.inactiveDays}d ago` : "Never"}
                  </span>
                  {m.lastAttendanceDate && (
                    <p className="text-xs text-muted-foreground">{m.lastAttendanceDate}</p>
                  )}
                </div>
              </div>
            ))}
          </div>
        </SurfaceCard>
      )}
    </div>
  )
}

/* ══════════════════════════════════════════════════════════════════════════
   Page Shell
══════════════════════════════════════════════════════════════════════════ */
export default function OwnerAnalyticsPage() {
  const [tab, setTab] = useState<Tab>("revenue")
  const [downloading, setDownloading] = useState(false)

  const now = new Date()
  const defaultMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`
  const [reportMonth, setReportMonth] = useState(defaultMonth)

  async function downloadReport() {
    setDownloading(true)
    try {
      const res = await fetch(`/api/owner/reports/monthly?month=${reportMonth}`, {
        credentials: "include",
      })
      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        throw new Error(err?.error ?? "Download failed")
      }
      const blob = await res.blob()
      const url = URL.createObjectURL(blob)
      const a = document.createElement("a")
      a.href = url
      a.download = `PowerHouse_Report_${reportMonth}.xlsx`
      document.body.appendChild(a)
      a.click()
      a.remove()
      URL.revokeObjectURL(url)
    } catch (error) {
      toast.error("Download failed", {
        description: error instanceof Error ? error.message : "Please try again.",
      })
    } finally {
      setDownloading(false)
    }
  }

  const tabs: Array<{ id: Tab; label: string; icon: React.ElementType }> = [
    { id: "revenue", label: "Revenue", icon: IndianRupee },
    { id: "attendance", label: "Attendance", icon: TrendingUp },
    { id: "retention", label: "Retention", icon: RotateCcw },
  ]

  return (
    <div className="max-w-6xl">
        <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <PageIntro title="Analytics" description="Revenue trends, attendance patterns, and member retention" />

          {/* Download Report */}
          <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row sm:items-center">
            <input
              type="month"
              value={reportMonth}
              onChange={(e) => setReportMonth(e.target.value)}
              className="h-10 w-full rounded-lg border border-border bg-card px-3 text-sm text-foreground focus:border-primary focus:outline-none sm:w-auto"
            />
            <Button
              size="sm"
              className="h-10 w-full gap-2 bg-primary text-background hover:bg-primary/90 sm:w-auto"
              onClick={downloadReport}
              disabled={downloading}
            >
              {downloading
                ? <Loader2 className="h-4 w-4 animate-spin" />
                : <Download className="h-4 w-4" />}
              {downloading ? "Generating…" : "Download Report"}
            </Button>
          </div>
        </div>

        {/* Tab bar */}
        <div className="mb-6 flex gap-1 rounded-xl border border-border bg-card p-1">
          {tabs.map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              onClick={() => setTab(id)}
              className={`flex flex-1 items-center justify-center gap-2 rounded-lg px-4 py-2.5 text-sm font-semibold transition-all ${
                tab === id
                  ? "bg-primary text-background shadow"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <Icon className="h-4 w-4" />
              {label}
            </button>
          ))}
        </div>

        {tab === "revenue" && <RevenueTab />}
        {tab === "attendance" && <AttendanceTab />}
        {tab === "retention" && <RetentionTab />}
      </div>
  )
}
