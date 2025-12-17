"use client"

import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts"

const data = [
  { source: "Direct Office", cases: 400 },
  { source: "Partner Labs", cases: 300 },
  { source: "Digital Scans", cases: 200 },
  { source: "Referrals", cases: 278 },
  { source: "Website", cases: 189 },
]

export function AnalyticsBarChart() {
  return (
    <ResponsiveContainer width="100%" height="100%">
      <BarChart
        data={data}
        margin={{
          top: 5,
          right: 30,
          left: 20,
          bottom: 5,
        }}
      >
        <CartesianGrid strokeDasharray="3 3" vertical={false} />
        <XAxis dataKey="source" />
        <YAxis />
        <Tooltip
          contentStyle={{
            backgroundColor: "white",
            borderRadius: "8px",
            boxShadow: "0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)",
            border: "none",
          }}
          formatter={(value) => [`${value}`, "Cases"]}
        />
        <Legend />
        <Bar dataKey="cases" fill="#3b82f6" radius={[4, 4, 0, 0]} name="Case Count" />
      </BarChart>
    </ResponsiveContainer>
  )
}
