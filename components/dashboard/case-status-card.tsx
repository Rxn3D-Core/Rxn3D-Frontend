import { Eye } from "lucide-react"

interface CaseStatusCardProps {
  title: string
  count: number
  color?: string
}

export function CaseStatusCard({ title, count, color }: CaseStatusCardProps) {
  return (
    <div className="bg-white border border-[#d9d9d9] rounded-lg p-4">
      <div className={`text-base text-center mb-2 ${color ? `text-[${color}]` : "text-[#000000]"}`}>{title}</div>
      <div className="text-2xl font-bold mb-2 text-center">{count}</div>
      <div className="flex justify-end">
        <Eye className="h-5 w-5 text-[#a19d9d]" />
      </div>
    </div>
  )
}
