"use client"

import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts"

const data = [
  { date: "01/01", revenue: 14000 },
  { date: "02/01", revenue: 22000 },
  { date: "03/01", revenue: 19000 },
  { date: "04/01", revenue: 28000 },
  { date: "05/01", revenue: 21000 },
  { date: "06/01", revenue: 25000 },
  { date: "07/01", revenue: 31000 },
  { date: "08/01", revenue: 29000 },
  { date: "09/01", revenue: 33000 },
  { date: "10/01", revenue: 37000 },
  { date: "11/01", revenue: 34000 },
  { date: "12/01", revenue: 39000 },
  { date: "13/01", revenue: 35000 },
  { date: "14/01", revenue: 42000 },
  { date: "15/01", revenue: 41000 },
  { date: "16/01", revenue: 45000 },
  { date: "17/01", revenue: 43000 },
  { date: "18/01", revenue: 47000 },
  { date: "19/01", revenue: 49000 },
  { date: "20/01", revenue: 51000 },
  { date: "21/01", revenue: 53000 },
  { date: "22/01", revenue: 52000 },
  { date: "23/01", revenue: 56000 },
  { date: "24/01", revenue: 60000 },
  { date: "25/01", revenue: 58000 },
  { date: "26/01", revenue: 63000 },
  { date: "27/01", revenue: 61000 },
  { date: "28/01", revenue: 65000 },
  { date: "29/01", revenue: 68000 },
  { date: "30/01", revenue: 70000 },
]

export function AnalyticsAreaChart() {
  return (
    <ResponsiveContainer width="100%" height="100%">
      <AreaChart
        data={data}
        margin={{
          top: 10,
          right: 30,
          left: 0,
          bottom: 0,
        }}
      >
        <CartesianGrid strokeDasharray="3 3" vertical={false} />
        <XAxis dataKey="date" />
        <YAxis />
        <Tooltip
          contentStyle={{
            backgroundColor: "white",
            borderRadius: "8px",
            boxShadow: "0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)",
            border: "none",
          }}
          formatter={(value) => [`$${value}`, "Daily Revenue"]}
        />
        <Area type="monotone" dataKey="revenue" stroke="#3b82f6" fill="#93c5fd" fillOpacity={0.3} />
      </AreaChart>
    </ResponsiveContainer>
  )
}
