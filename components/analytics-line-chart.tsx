"use client"

import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts"

const data = [
  { month: "Jan", cases: 240, revenue: 40000, completedCases: 220 },
  { month: "Feb", cases: 198, revenue: 33000, completedCases: 180 },
  { month: "Mar", cases: 280, revenue: 50000, completedCases: 260 },
  { month: "Apr", cases: 190, revenue: 27800, completedCases: 175 },
  { month: "May", cases: 170, revenue: 18900, completedCases: 155 },
  { month: "Jun", cases: 210, revenue: 23900, completedCases: 190 },
  { month: "Jul", cases: 250, revenue: 34900, completedCases: 230 },
  { month: "Aug", cases: 280, revenue: 40000, completedCases: 260 },
  { month: "Sep", cases: 300, revenue: 50000, completedCases: 280 },
  { month: "Oct", cases: 270, revenue: 45000, completedCases: 250 },
  { month: "Nov", cases: 230, revenue: 35000, completedCases: 210 },
  { month: "Dec", cases: 350, revenue: 60000, completedCases: 320 },
]

export function AnalyticsLineChart() {
  return (
    <ResponsiveContainer width="100%" height="100%">
      <LineChart
        data={data}
        margin={{
          top: 5,
          right: 30,
          left: 20,
          bottom: 5,
        }}
      >
        <CartesianGrid strokeDasharray="3 3" vertical={false} />
        <XAxis dataKey="month" />
        <YAxis />
        <Tooltip
          contentStyle={{
            backgroundColor: "white",
            borderRadius: "8px",
            boxShadow: "0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)",
            border: "none",
          }}
        />
        <Legend />
        <Line
          type="monotone"
          dataKey="revenue"
          stroke="#3b82f6"
          strokeWidth={2}
          activeDot={{ r: 8 }}
          name="Revenue ($)"
        />
        <Line type="monotone" dataKey="cases" stroke="#10b981" strokeWidth={2} name="New Cases" />
        <Line type="monotone" dataKey="completedCases" stroke="#f59e0b" strokeWidth={2} name="Completed Cases" />
      </LineChart>
    </ResponsiveContainer>
  )
}
