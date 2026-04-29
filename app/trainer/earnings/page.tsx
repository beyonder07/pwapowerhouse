"use client"

import { useState } from "react"
import { motion } from "framer-motion"
import { PageIntro, SurfaceCard, MetricCard, StatusPill } from "@/components/powerhouse"
import { Button } from "@/components/ui/button"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  DollarSign,
  TrendingUp,
  Calendar,
  Download,
  Users,
  ArrowUpRight,
  ArrowDownRight,
} from "lucide-react"

const container = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: { staggerChildren: 0.1 },
  },
}

const item = {
  hidden: { opacity: 0, y: 20 },
  show: { opacity: 1, y: 0 },
}

// Mock data
const stats = {
  thisMonth: 4850,
  lastMonth: 4200,
  pendingPayout: 1250,
  sessionsThisMonth: 42,
  avgPerSession: 115,
}

const recentEarnings = [
  { id: "1", client: "Alex Johnson", type: "Personal Training", amount: 120, date: "Today", status: "completed" },
  { id: "2", client: "Maria Garcia", type: "HIIT Session", amount: 80, date: "Today", status: "completed" },
  { id: "3", client: "James Wilson", type: "Personal Training", amount: 120, date: "Yesterday", status: "completed" },
  { id: "4", client: "Sarah Chen", type: "Flexibility Session", amount: 90, date: "Yesterday", status: "pending" },
  { id: "5", client: "David Kim", type: "Personal Training", amount: 120, date: "Mar 28", status: "completed" },
  { id: "6", client: "Emma Brown", type: "HIIT Session", amount: 80, date: "Mar 28", status: "completed" },
]

const payoutHistory = [
  { id: "p1", date: "Mar 15, 2026", amount: 2100, status: "completed", method: "Bank Transfer" },
  { id: "p2", date: "Mar 1, 2026", amount: 2100, status: "completed", method: "Bank Transfer" },
  { id: "p3", date: "Feb 15, 2026", amount: 1950, status: "completed", method: "Bank Transfer" },
  { id: "p4", date: "Feb 1, 2026", amount: 1850, status: "completed", method: "Bank Transfer" },
]

const monthlyBreakdown = [
  { month: "March", sessions: 42, earnings: 4850, clients: 18 },
  { month: "February", sessions: 38, earnings: 4200, clients: 16 },
  { month: "January", sessions: 35, earnings: 3850, clients: 15 },
  { month: "December", sessions: 30, earnings: 3400, clients: 14 },
]

export default function TrainerEarningsPage() {
  const [activeTab, setActiveTab] = useState("overview")
  const [period, setPeriod] = useState("this-month")

  const monthChange = ((stats.thisMonth - stats.lastMonth) / stats.lastMonth) * 100

  return (
    <motion.div
      variants={container}
      initial="hidden"
      animate="show"
      className="space-y-6"
    >
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <PageIntro
          title="Earnings"
          subtitle="Track your income and payouts"
        />
        <div className="flex gap-2">
          <Select value={period} onValueChange={setPeriod}>
            <SelectTrigger className="w-40">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="this-month">This Month</SelectItem>
              <SelectItem value="last-month">Last Month</SelectItem>
              <SelectItem value="this-quarter">This Quarter</SelectItem>
              <SelectItem value="this-year">This Year</SelectItem>
            </SelectContent>
          </Select>
          <Button variant="outline">
            <Download className="mr-2 h-4 w-4" />
            Export
          </Button>
        </div>
      </div>

      {/* Stats Overview */}
      <motion.div variants={item} className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <MetricCard
          title="This Month"
          value={`$${stats.thisMonth.toLocaleString()}`}
          icon={DollarSign}
          trend={{ value: Math.round(monthChange), isPositive: monthChange > 0 }}
        />
        <MetricCard
          title="Pending Payout"
          value={`$${stats.pendingPayout.toLocaleString()}`}
          icon={TrendingUp}
          subtitle="Next payout: Apr 1"
        />
        <MetricCard
          title="Sessions"
          value={stats.sessionsThisMonth}
          icon={Calendar}
          trend={{ value: 10, isPositive: true }}
        />
        <MetricCard
          title="Avg. per Session"
          value={`$${stats.avgPerSession}`}
          icon={Users}
        />
      </motion.div>

      <motion.div variants={item}>
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="mb-4">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="transactions">Transactions</TabsTrigger>
            <TabsTrigger value="payouts">Payouts</TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-6">
            {/* Monthly Breakdown */}
            <SurfaceCard>
              <h3 className="font-semibold text-foreground mb-4">Monthly Breakdown</h3>
              <div className="space-y-4">
                {monthlyBreakdown.map((month, index) => (
                  <div
                    key={month.month}
                    className="flex items-center justify-between p-4 rounded-lg bg-muted/30"
                  >
                    <div className="flex items-center gap-4">
                      <div className="w-20 font-medium text-foreground">{month.month}</div>
                      <div className="flex items-center gap-6 text-sm text-muted-foreground">
                        <span>{month.sessions} sessions</span>
                        <span>{month.clients} clients</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-4">
                      <span className="font-semibold text-foreground">
                        ${month.earnings.toLocaleString()}
                      </span>
                      {index > 0 && (
                        <span
                          className={`flex items-center text-sm ${
                            month.earnings > monthlyBreakdown[index - 1]?.earnings
                              ? "text-green-500"
                              : "text-red-500"
                          }`}
                        >
                          {month.earnings > monthlyBreakdown[index - 1]?.earnings ? (
                            <ArrowUpRight className="h-4 w-4" />
                          ) : (
                            <ArrowDownRight className="h-4 w-4" />
                          )}
                        </span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </SurfaceCard>

            {/* Recent Earnings */}
            <SurfaceCard>
              <h3 className="font-semibold text-foreground mb-4">Recent Earnings</h3>
              <div className="space-y-3">
                {recentEarnings.slice(0, 5).map((earning) => (
                  <div
                    key={earning.id}
                    className="flex items-center justify-between p-3 rounded-lg hover:bg-muted/50 transition-colors"
                  >
                    <div>
                      <p className="font-medium text-foreground">{earning.client}</p>
                      <p className="text-sm text-muted-foreground">{earning.type}</p>
                    </div>
                    <div className="text-right">
                      <p className="font-semibold text-foreground">${earning.amount}</p>
                      <p className="text-xs text-muted-foreground">{earning.date}</p>
                    </div>
                  </div>
                ))}
              </div>
            </SurfaceCard>
          </TabsContent>

          <TabsContent value="transactions" className="space-y-4">
            <SurfaceCard className="p-0 overflow-hidden">
              <div className="divide-y divide-border">
                {recentEarnings.map((earning) => (
                  <div
                    key={earning.id}
                    className="flex items-center justify-between p-4 hover:bg-muted/50 transition-colors"
                  >
                    <div className="flex items-center gap-4">
                      <div className="p-2 rounded-lg bg-primary/10">
                        <DollarSign className="h-5 w-5 text-primary" />
                      </div>
                      <div>
                        <p className="font-medium text-foreground">{earning.client}</p>
                        <p className="text-sm text-muted-foreground">{earning.type}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-4">
                      <div className="text-right">
                        <p className="font-semibold text-foreground">${earning.amount}</p>
                        <p className="text-xs text-muted-foreground">{earning.date}</p>
                      </div>
                      <StatusPill
                        status={earning.status === "completed" ? "success" : "warning"}
                      >
                        {earning.status}
                      </StatusPill>
                    </div>
                  </div>
                ))}
              </div>
            </SurfaceCard>
          </TabsContent>

          <TabsContent value="payouts" className="space-y-4">
            <SurfaceCard>
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h3 className="font-semibold text-foreground">Pending Payout</h3>
                  <p className="text-sm text-muted-foreground">Next payout scheduled for April 1, 2026</p>
                </div>
                <div className="text-right">
                  <p className="text-2xl font-bold text-foreground">${stats.pendingPayout.toLocaleString()}</p>
                  <StatusPill status="warning">Pending</StatusPill>
                </div>
              </div>
              <Button className="w-full">Request Early Payout</Button>
            </SurfaceCard>

            <SurfaceCard>
              <h3 className="font-semibold text-foreground mb-4">Payout History</h3>
              <div className="space-y-3">
                {payoutHistory.map((payout) => (
                  <div
                    key={payout.id}
                    className="flex items-center justify-between p-4 rounded-lg bg-muted/30"
                  >
                    <div>
                      <p className="font-medium text-foreground">${payout.amount.toLocaleString()}</p>
                      <p className="text-sm text-muted-foreground">{payout.method}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm text-muted-foreground">{payout.date}</p>
                      <StatusPill status="success">{payout.status}</StatusPill>
                    </div>
                  </div>
                ))}
              </div>
            </SurfaceCard>
          </TabsContent>
        </Tabs>
      </motion.div>
    </motion.div>
  )
}
