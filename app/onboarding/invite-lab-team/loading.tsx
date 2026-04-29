import { Loader2 } from "lucide-react"

export default function Loading() {
  return (
    <div className="min-h-[40vh] flex items-center justify-center bg-[#f7fbff]">
      <Loader2 className="h-8 w-8 animate-spin text-[#1162a8]" />
    </div>
  )
}
