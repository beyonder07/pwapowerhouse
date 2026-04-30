"use client"

import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts"
import { SurfaceCard } from "@/components/powerhouse"

export interface AttendanceTrendPoint {
  date: string
  checkIns: number
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat("en-IN", {
    weekday: "short",
    day: "2-digit",
  }).format(new Date(value))
}

export function AttendanceTrendChart({
  data,
}: {
  data: AttendanceTrendPoint[]
}) {
  const chartData = data.map((point) => ({
    date: formatDate(point.date),
    attendance: point.checkIns,
  }))

  return (
    <SurfaceCard>
      <h3 className="mb-4 text-lg font-semibold text-foreground">
        Weekly Attendance
      </h3>
      <div className="chart-container">
        <ResponsiveContainer width="100%" height={300}>
          <LineChart data={chartData}>
            <CartesianGrid strokeDasharray="3 3" stroke="#333" />
            <XAxis dataKey="date" stroke="#666" />
            <YAxis stroke="#666" allowDecimals={false} />
            <Tooltip
              contentStyle={{
                backgroundColor: "#1a1a1a",
                border: "1px solid #333",
              }}
            />
            <Line
              type="monotone"
              dataKey="attendance"
              stroke="#ef4444"
              dot={{ fill: "#ef4444" }}
              strokeWidth={2}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </SurfaceCard>
  )
}
