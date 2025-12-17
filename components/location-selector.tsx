"use client"

import { useState } from "react"
import { ChevronDown } from "lucide-react"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"

interface Location {
  id: string
  name: string
}

export function LocationSelector() {
  const [locations, setLocations] = useState<Location[]>([
    { id: "1", name: "Nevada Dental Benefits - Nellis" },
    { id: "2", name: "Nevada Dental Benefits - Craig" },
    { id: "3", name: "Nevada Dental Benefits - Durango" },
    { id: "4", name: "Nevada Dental Benefits - Ranch" },
  ])

  const [selectedLocation, setSelectedLocation] = useState<Location>(locations[0])

  const handleSelectLocation = (location: Location) => {
    setSelectedLocation(location)
    localStorage.setItem("selectedLocation", JSON.stringify(location))
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger className="flex items-center gap-1 px-2 py-1 rounded border border-gray-200 bg-white">
        <span className="text-sm font-medium">{selectedLocation.name}</span>
        <ChevronDown className="h-4 w-4" />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-64">
        <div className="py-2 px-3 text-xs text-gray-500 border-b">- Choose other location -</div>
        {locations.map((location) => (
          <DropdownMenuItem key={location.id} onClick={() => handleSelectLocation(location)} className="py-2">
            {location.name}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
