"use client"

import { useState, useEffect, useCallback, useMemo } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { Search, Star, Pencil } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { useToast } from "@/hooks/use-toast"
import { CustomerLogo } from "@/components/customer-logo"
import { SlipCreationHeader } from "@/components/slip-creation-header"

interface Lab {
  id: number
  name: string
  location?: string
  city?: string
  state?: string
  logo?: string
  image?: string
  customer_id?: number
  is_favorite?: boolean
}

interface Doctor {
  id: number
  first_name: string
  last_name: string
  email: string
  image?: string
}

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:3000"

export default function ChooseLabPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { toast } = useToast()
  const [labs, setLabs] = useState<Lab[]>([])
  const [filteredLabs, setFilteredLabs] = useState<Lab[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState("")
  const [sortBy, setSortBy] = useState("name-asc")
  const [selectedDoctor, setSelectedDoctor] = useState<Doctor | null>(null)
  const [createdBy, setCreatedBy] = useState<string>("")

  // Get doctor from URL or localStorage
  useEffect(() => {
    const doctorId = searchParams.get("doctorId")
    if (doctorId) {
      const storedDoctor = localStorage.getItem("selectedDoctor")
      if (storedDoctor) {
        try {
          const doctor = JSON.parse(storedDoctor)
          setSelectedDoctor(doctor)
        } catch (error) {
          console.error("Error parsing selected doctor:", error)
        }
      }
    }

    // Get created by from localStorage (user info)
    const userStr = localStorage.getItem("user")
    if (userStr) {
      try {
        const user = JSON.parse(userStr)
        setCreatedBy(`${user.first_name || ""} ${user.last_name || ""}`.trim())
      } catch (error) {
        console.error("Error parsing user:", error)
      }
    }
  }, [searchParams])

  // Fetch labs using the same logic as dental-slip-page.tsx
  const fetchLabs = useCallback(async () => {
    setIsLoading(true)
    try {
      const token = localStorage.getItem("token")
      if (!token) {
        throw new Error("No authentication token found")
      }

      // Get role from localStorage to determine endpoint
      const role = localStorage.getItem("role") || ""
      
      // Use the same logic as slip-creation-context.tsx
      // For lab_admin, fetch connected-offices, otherwise fetch connected-labs
      const endpoint = role === "lab_admin" 
        ? "/v1/slip/connected-offices"
        : "/v1/slip/connected-labs"
      
      const url = new URL(endpoint, API_BASE_URL)
      
      if (searchQuery.trim()) {
        url.searchParams.append("search", searchQuery.trim())
      }

      const response = await fetch(url.toString(), {
        method: "GET",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
      })

      if (response.status === 401) {
        window.location.href = "/login"
        return
      }

      if (!response.ok) {
        throw new Error(`Failed to fetch labs: ${response.status}`)
      }

      const data = await response.json()
      
      // Transform data based on whether it's offices or labs
      const labsList = (data.data || []).map((item: any) => {
        // Handle both office and lab structures
        const lab = item.lab || item.office || item
        return {
          id: lab.id || item.id,
          name: lab.name || item.name || "",
          location: lab.location || item.location || "",
          city: lab.city || item.city || "",
          state: lab.state || item.state || "",
          logo: lab.logo || item.logo || lab.image || item.image || null,
          image: lab.image || item.image || null,
          customer_id: lab.customer_id || item.customer_id || lab.id || item.id,
          is_favorite: item.is_favorite || false,
        }
      })

      setLabs(labsList)
    } catch (error: any) {
      console.error("Error fetching labs:", error)
      toast({
        title: "Error",
        description: error.message || "Failed to fetch labs",
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }, [searchQuery, toast])

  useEffect(() => {
    fetchLabs()
  }, [fetchLabs])

  // Sort and filter labs
  const sortedAndFilteredLabs = useMemo(() => {
    let result = [...labs]

    // Apply search filter (already handled by API, but we can filter client-side too)
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase()
      result = result.filter(
        (lab) =>
          lab.name.toLowerCase().includes(query) ||
          lab.location?.toLowerCase().includes(query) ||
          lab.city?.toLowerCase().includes(query) ||
          lab.state?.toLowerCase().includes(query)
      )
    }

    // Apply sorting
    result.sort((a, b) => {
      switch (sortBy) {
        case "name-asc":
          return a.name.localeCompare(b.name)
        case "name-desc":
          return b.name.localeCompare(a.name)
        case "location-asc":
          const locationA = `${a.city || ""} ${a.state || ""}`.trim()
          const locationB = `${b.city || ""} ${b.state || ""}`.trim()
          return locationA.localeCompare(locationB)
        default:
          return a.name.localeCompare(b.name)
      }
    })

    return result
  }, [labs, searchQuery, sortBy])

  useEffect(() => {
    setFilteredLabs(sortedAndFilteredLabs)
  }, [sortedAndFilteredLabs])

  const handleAddLab = () => {
    toast({
      title: "Add Lab",
      description: "Add lab functionality will be implemented here",
    })
  }

  const handleLabSelect = (lab: Lab) => {
    // Store selected lab
    localStorage.setItem("selectedLab", JSON.stringify(lab))
    
    // Navigate to patient input page
    router.push(`/patient-input?labId=${lab.id}`)
  }

  const handleCancel = () => {
    router.back()
  }

  const getLocationString = (lab: Lab) => {
    if (lab.location) return lab.location
    if (lab.city && lab.state) return `${lab.city}, ${lab.state}`
    if (lab.city) return lab.city
    if (lab.state) return lab.state
    return ""
  }

  return (
    <div className="min-h-screen bg-white">
      <SlipCreationHeader 
        variant="with-doctor-info"
        doctor={selectedDoctor}
        createdBy={createdBy}
      />

      <div className="container mx-auto px-6 max-w-[1400px]">

          {/* Title */}
          <h1 className="text-xl font-semibold text-center mb-6">Choose a Lab</h1>

          {/* Search and Controls Bar */}
          <div className="flex items-center gap-4 mb-4 max-w-5xl mx-auto">
            {/* Search Input - takes most space */}
            <div className="relative flex-1">
              <Input
                type="text"
                placeholder="Search Dental Lab"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="h-10 pl-4 pr-10 border-gray-300 rounded-md text-sm"
              />
              <Search className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            </div>

            {/* Add Lab Button */}
            <Button
              onClick={handleAddLab}
              className="bg-[#1162a8] hover:bg-[#0e5189] text-white h-10 px-4 rounded-md text-sm font-semibold whitespace-nowrap"
            >
              Add New lab
            </Button>
          </div>

          {/* Sort By and Results Count */}
          <div className="flex items-center justify-between mb-8 max-w-5xl mx-auto">
            {/* Sort By */}
            <div className="flex items-center gap-2">
              <label className="text-sm text-gray-700">Sort By:</label>
              <Select value={sortBy} onValueChange={setSortBy}>
                <SelectTrigger className="w-[130px] h-9 text-sm border-gray-300 rounded-md">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="name-asc">Name A-Z</SelectItem>
                  <SelectItem value="name-desc">Name Z-A</SelectItem>
                  <SelectItem value="location-asc">Location</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Results Count */}
            <p className="text-sm text-gray-400">
              {filteredLabs.length} {filteredLabs.length === 1 ? "lab" : "labs"} found
            </p>
          </div>

          {/* Loading State */}
          {isLoading ? (
            <div className="flex items-center justify-center py-20">
              <div className="text-gray-500">Loading labs...</div>
            </div>
          ) : filteredLabs.length === 0 ? (
            <div className="flex items-center justify-center py-20">
              <div className="text-gray-500">No labs found</div>
            </div>
          ) : (
            /* Lab Cards Grid */
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-12 max-w-6xl mx-auto">
              {filteredLabs.map((lab) => (
                <div
                  key={lab.id}
                  className="bg-white border-2 border-gray-300 rounded-lg p-4 flex flex-col items-center justify-between relative group hover:shadow-lg transition-all min-h-[220px] hover:border-[#1162A8]"
                >
                  {/* Favorite Star */}
                  {lab.is_favorite && (
                    <div className="absolute top-3 left-3">
                      <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                    </div>
                  )}

                  {/* Lab Logo */}
                  <div className="flex-1 flex items-center justify-center w-full py-4">
                    {lab.customer_id ? (
                      <CustomerLogo
                        customerId={lab.customer_id}
                        alt={lab.name}
                        className="max-h-[80px] max-w-[140px] object-contain"
                      />
                    ) : (
                      <div className="w-[140px] h-[80px] bg-gray-50 rounded flex items-center justify-center">
                        <span className="text-xs text-gray-400">No Logo</span>
                      </div>
                    )}
                  </div>

                  {/* Lab Name */}
                  <p className="text-sm font-semibold text-gray-900 text-center mb-1">
                    {lab.name}
                  </p>

                  {/* Location */}
                  {getLocationString(lab) && (
                    <p className="text-xs text-gray-400 text-center mb-3">
                      {getLocationString(lab)}
                    </p>
                  )}

                  {/* Select Button */}
                  <Button
                    onClick={() => handleLabSelect(lab)}
                    className="bg-[#1162a8] hover:bg-[#0e5189] text-white h-9 px-6 rounded-md text-sm font-semibold w-full opacity-0 group-hover:opacity-100 transition-opacity"
                  >
                    Select
                  </Button>
                </div>
              ))}
            </div>
          )}

          {/* Cancel Button */}
          <div className="flex justify-end max-w-6xl mx-auto">
            <Button
              onClick={handleCancel}
              variant="outline"
              className="border-2 border-[#1162a8] text-[#1162a8] h-10 px-6 rounded-md text-sm font-semibold hover:bg-blue-50"
            >
              Cancel
            </Button>
          </div>
        </div>
    </div>
  )
}

