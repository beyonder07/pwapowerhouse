"use client"

import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts"
import { SurfaceCard } from "@/components/powerhouse"

export interface RevenuePoint {
  date: string
  revenue: number
  pendingTotal: number
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat("en-IN", {
    weekday: "short",
    day: "2-digit",
  }).format(new Date(value))
}

export function RevenueBarChart({ data }: { data: RevenuePoint[] }) {
  const chartData = data.map((point) => ({
    date: formatDate(point.date),
    revenue: point.revenue,
    pending: point.pendingTotal,
  }))

  return (
    <SurfaceCard>
      <h3 className="mb-4 text-lg font-semibold text-foreground">
        Weekly Revenue
      </h3>
      <div className="chart-container">
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={chartData}>
            <CartesianGrid strokeDasharray="3 3" stroke="#333" />
            <XAxis dataKey="date" stroke="#666" />
            <YAxis stroke="#666" />
            <Tooltip
              contentStyle={{
                backgroundColor: "#1a1a1a",
                border: "1px solid #333",
              }}
            />
            <Bar dataKey="revenue" fill="#ef4444" name="Paid" radius={[4, 4, 0, 0]} />
            <Bar dataKey="pending" fill="#f59e0b" name="Pending" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </SurfaceCard>
  )
}
