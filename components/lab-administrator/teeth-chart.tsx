"use client"

import { Button } from "@/components/ui/button"

interface TeethChartProps {
  type: "upper" | "lower"
}

export function TeethChart({ type }: TeethChartProps) {
  const teethNumbers =
    type === "upper" ? Array.from({ length: 16 }, (_, i) => i + 1) : Array.from({ length: 16 }, (_, i) => i + 17)

  return (
    <div className="space-y-4">
      <h3 className="text-lg font-medium">{type === "upper" ? "Upper" : "Lower"}</h3>

      <div className="relative">
        {/* Teeth diagram would go here */}
        <div className="aspect-[2/1] bg-gray-100 rounded-lg"></div>
      </div>

      <div className="space-y-2">
        <Button className="w-full bg-yellow-500 hover:bg-yellow-600">Teeth To Replace</Button>
        <Button className="w-full bg-neutral-200 hover:bg-neutral-300 text-black">Teeth In Mouth</Button>
        <Button className="w-full bg-white border-2 hover:bg-gray-50">Missing Teeth</Button>
        <Button className="w-full bg-red-500 hover:bg-red-600">Will Extract On Delivery</Button>
        <Button className="w-full bg-gray-500 hover:bg-gray-600">Has Been Extracted</Button>
        <Button className="w-full bg-green-500 hover:bg-green-600">Fix Or Add</Button>
        <Button className="w-full bg-pink-500 hover:bg-pink-600">Clasps</Button>
      </div>
    </div>
  )
}
