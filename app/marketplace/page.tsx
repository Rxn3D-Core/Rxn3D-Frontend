"use client"

import { ComingSoon } from "@/components/coming-soon"
import { Store } from "lucide-react"

export default function MarketplacePage() {
  return (
    <ComingSoon 
      title="Marketplace"
      description="Marketplace features are currently under development and will be available soon."
      icon={<Store className="h-6 w-6 sm:h-8 sm:w-8 text-[#1162a8]" />}
    />
  )
}













