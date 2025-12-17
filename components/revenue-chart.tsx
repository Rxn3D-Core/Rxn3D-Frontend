"use client"

import { Bar, BarChart, CartesianGrid, ResponsiveContainer, XAxis, YAxis } from "recharts"

const data = [
  {
    name: "Jan",
    total: 1500,
  },
  {
    name: "Feb",
    total: 2300,
  },
  {
    name: "Mar",
    total: 3200,
  },
  {
    name: "Apr",
    total: 4500,
  },
  {
    name: "May",
    total: 3200,
  },
  {
    name: "Jun",
    total: 5100,
  },
  {
    name: "Jul",
    total: 6200,
  },
  {
    name: "Aug",
    total: 7800,
  },
  {
    name: "Sep",
    total: 6100,
  },
  {
    name: "Oct",
    total: 5400,
  },
  {
    name: "Nov",
    total: 3800,
  },
  {
    name: "Dec",
    total: 4300,
  },
]

export function RevenueChart() {
  return (
    <ResponsiveContainer width="100%" height={350}>
      <BarChart data={data}>
        <CartesianGrid strokeDasharray="3 3" vertical={false} />
        <XAxis dataKey="name" stroke="#888888" fontSize={12} tickLine={false} axisLine={false} />
        <YAxis
          stroke="#888888"
          fontSize={12}
          tickLine={false}
          axisLine={false}
          tickFormatter={(value) => `$${value}`}
        />
        <Bar dataKey="total" fill="currentColor" radius={[4, 4, 0, 0]} className="fill-primary" />
      </BarChart>
    </ResponsiveContainer>
  )
}
