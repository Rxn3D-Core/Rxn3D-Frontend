import { Eye } from "lucide-react"

interface PlanCardProps {
  title: string
  count: number
  color?: string
}

export function PlanCard({ title, count, color }: PlanCardProps) {
  return (
    <div className="bg-white border border-[#e4e6ef] rounded-lg p-4 shadow-sm">
      <div className="text-sm mb-2" style={{ color: color || "#000000" }}>
        {title}
      </div>
      <div className="text-3xl font-bold mb-2">{count}</div>
      <div className="flex justify-end">
        <div className="rounded-full bg-gray-100 p-2">
          <Eye className="h-4 w-4 text-[#a19d9d]" />
        </div>
      </div>
    </div>
  )
}
