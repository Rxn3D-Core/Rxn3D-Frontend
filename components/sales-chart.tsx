"use client"

import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from "recharts"

const data = [
  { name: "Direct", value: 400, color: "#3b82f6" },
  { name: "Affiliate", value: 300, color: "#8b5cf6" },
  { name: "Social", value: 200, color: "#22c55e" },
  { name: "Other", value: 100, color: "#f97316" },
]

export function SalesChart() {
  return (
    <div className="flex h-[300px] items-center justify-center">
      <ResponsiveContainer width="100%" height="100%">
        <PieChart>
          <Pie data={data} cx="50%" cy="50%" innerRadius={60} outerRadius={80} paddingAngle={5} dataKey="value">
            {data.map((entry, index) => (
              <Cell key={`cell-${index}`} fill={entry.color} />
            ))}
          </Pie>
          <Tooltip formatter={(value) => [`${value}`, "Sales"]} labelFormatter={(name) => `${name}`} />
        </PieChart>
      </ResponsiveContainer>
      <div className="grid grid-cols-2 gap-4">
        {data.map((item, index) => (
          <div key={index} className="flex items-center gap-2">
            <div className="h-3 w-3 rounded-full" style={{ backgroundColor: item.color }} />
            <div className="text-sm text-muted-foreground">{item.name}</div>
          </div>
        ))}
      </div>
    </div>
  )
}
