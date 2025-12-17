"use client"

import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar } from "recharts"

// Mock data for credit usage
const creditData = [
  { date: "2025-02-01", credits: 150, amount: 15 },
  { date: "2025-02-05", credits: 200, amount: 20 },
  { date: "2025-02-10", credits: 180, amount: 18 },
  { date: "2025-02-15", credits: 250, amount: 25 },
  { date: "2025-02-20", credits: 300, amount: 30 },
  { date: "2025-02-25", credits: 280, amount: 28 },
  { date: "2025-03-01", credits: 350, amount: 35 },
]

interface CreditUsageChartProps {
  billingMode: "prepaid" | "postpaid"
}

export function CreditUsageChart({ billingMode }: CreditUsageChartProps) {
  return (
    <ResponsiveContainer width="100%" height={350}>
      {billingMode === "prepaid" ? (
        <AreaChart data={creditData} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" vertical={false} />
          <XAxis
            dataKey="date"
            tickFormatter={(date) => new Date(date).toLocaleDateString(undefined, { month: "short", day: "numeric" })}
          />
          <YAxis />
          <Tooltip
            formatter={(value) => [`${value} credits`, "Usage"]}
            labelFormatter={(date) => new Date(date).toLocaleDateString()}
            contentStyle={{
              backgroundColor: "white",
              borderRadius: "8px",
              boxShadow: "0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)",
              border: "none",
            }}
          />
          <Area type="monotone" dataKey="credits" stroke="#3b82f6" fill="#93c5fd" fillOpacity={0.3} />
        </AreaChart>
      ) : (
        <BarChart data={creditData} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" vertical={false} />
          <XAxis
            dataKey="date"
            tickFormatter={(date) => new Date(date).toLocaleDateString(undefined, { month: "short", day: "numeric" })}
          />
          <YAxis />
          <Tooltip
            formatter={(value) => [`$${value}`, "Amount"]}
            labelFormatter={(date) => new Date(date).toLocaleDateString()}
            contentStyle={{
              backgroundColor: "white",
              borderRadius: "8px",
              boxShadow: "0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)",
              border: "none",
            }}
          />
          <Bar dataKey="amount" fill="#3b82f6" radius={[4, 4, 0, 0]} />
        </BarChart>
      )}
    </ResponsiveContainer>
  )
}
