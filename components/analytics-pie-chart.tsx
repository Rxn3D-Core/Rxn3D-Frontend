"use client"

import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from "recharts"

const data = [
  { name: "Full Denture", value: 150, color: " #8b5cf6" },
  { name: "Partial Denture", value: 200, color: " #ef4444" },
  { name: "Flippers and stayplate", value: 300, color: " #f59e0b" },
  { name: "Retainers", value: 300, color: " #10b981" },
  { name: "Repairs and Relines", value: 150, color: " #01C7BE" },
  { name: "Crowns", value: 400, color: " #3b82f6" },
]

const COLORS = ["#3b82f6", "#10b981", "#f59e0b", "#ef4444", "#8b5cf6", "#01C7BE"]

export function AnalyticsPieChart() {
  return (
    <ResponsiveContainer width="100%" height="100%">
      <PieChart>
        <Pie
          data={data}
          cx="50%"
          cy="50%"
          labelLine={false}
          outerRadius={200}
          fill="#8884d8"
          dataKey="value"
          label={({ name, percent }) => `${(percent * 100).toFixed(0)}%`}
        >
          {data.map((entry, index) => (
            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
          ))}
        </Pie>
        <Tooltip
          contentStyle={{
            backgroundColor: "white",
            borderRadius: "8px",
            boxShadow: "0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)",
            border: "none",
          }}
          formatter={(value) => [`${value} cases`, "Volume"]}
        />
      </PieChart>
    </ResponsiveContainer>
  )
}
