import { ArrowUp, ArrowDown, Info, DollarSign, FileText } from "lucide-react"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"

interface KpiCardProps {
  title: string
  value: string
  change: string
  isPositive: boolean
  icon?: "dollar" | "document" | "none"
}

const KPI_TOOLTIPS: Record<string, string> = {
  "Total Case Spend": "The total amount your office has paid for submitted cases during this period.",
  "Outstanding Balance": "The current unpaid amount for all processed cases and invoices.",
  "Total Cases": "The total number of cases your office has submitted to labs within the selected timeframe.",
  "Case Approval Rate": "The percentage of submitted cases that were accepted by labs without needing revision.",
  "Total Revenue": "The total amount earned by all labs on the Rxn3D platform (Super Admin only).",
  "Labor Cost": "The total technician compensation cost incurred by labs (Super Admin or Lab Admin only).",
  "Total Cases (platform-wide)": "The total number of cases submitted across all labs and offices on the platform.",
  "On-Time Delivery Rate": "The percentage of cases delivered on or before their scheduled due dates.",
}

export function KpiCard({ title, value, change, isPositive, icon = "none" }: KpiCardProps) {
  return (
    <div className="bg-white border border-[#e4e6ef] rounded-lg p-4 shadow-sm">
      <div className="flex items-center justify-between mb-2">
        <div className="text-sm text-[#000000] flex items-center gap-1">
          {title}
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Info className="h-4 w-4 text-[#a19d9d] cursor-pointer" />
              </TooltipTrigger>
              <TooltipContent>
                <span>{KPI_TOOLTIPS[title]}</span>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>
      </div>
      <div className="text-3xl font-bold mb-2">{value}</div>
      <div className="flex items-center justify-between">
        <div className="flex items-center">
          {isPositive ? (
            <ArrowUp className="h-4 w-4 text-green-500 mr-1" />
          ) : (
            <ArrowDown className="h-4 w-4 text-red-500 mr-1" />
          )}
          <span className={`text-xs ${isPositive ? "text-green-500" : "text-red-500"}`}>{change} from last month</span>
        </div>
        <div className="rounded-full bg-gray-100 p-2">
          {icon === "dollar" && <DollarSign className="h-4 w-4 text-[#a19d9d]" />}
          {icon === "document" && <FileText className="h-4 w-4 text-[#a19d9d]" />}
        </div>
      </div>
    </div>
  )
}
