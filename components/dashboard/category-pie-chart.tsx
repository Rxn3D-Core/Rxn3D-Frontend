"use client"
import { AnalyticsPieChart } from "@/components/analytics-pie-chart"

const data = [
  { name: "Full Denture", value: 150, color: " #8b5cf6" },
  { name: "Partial Denture", value: 200, color: " #ef4444" },
  { name: "Flippers and stayplate", value: 300, color: " #f59e0b" },
  { name: "Retainers", value: 300, color: " #10b981" },
  { name: "Repairs and Relines", value: 150, color: " #01C7BE" },
  { name: "Crowns", value: 400, color: " #3b82f6" },
]

export function CategoryPieChart() {
  return (
    <div className="bg-white border border-[#d9d9d9] rounded-lg">
      <div className="p-4 border-b border-[#d9d9d9]">
        <h2 className="font-bold text-lg">Cases by Category</h2>
        <div className="text-sm text-[#a19d9d]">Top performing cases by category</div>
      </div>
      <div className="p-4">
        <div className="mb-6" style={{ height: 500 }}>
          <AnalyticsPieChart />
        </div>
        <div className="grid grid-cols-2 gap-x-4 gap-y-2 justify-center items-center">
          {data.map((item, index) => (
            <div key={index} className="flex items-center gap-2">
              <div className="h-4 w-4 rounded-sm" style={{ backgroundColor: item.color }}></div>
              <div className="text-sm">{item.name}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
