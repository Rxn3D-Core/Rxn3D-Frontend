"use client"

import { useState, useEffect, useCallback, useMemo } from "react"
import { useRouter } from "next/navigation"
import { Search } from "lucide-react"
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
import { SlipCreationHeader } from "@/components/slip-creation-header"

interface Doctor {
  id: number
  first_name: string
  last_name: string
  email: string
  image?: string
  status?: string
}

interface ConnectedOffice {
  office?: {
    id: number
    name: string
  }
}

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:3000"

export default function ChooseDoctorPage() {
  const router = useRouter()
  const { toast } = useToast()
  const [doctors, setDoctors] = useState<Doctor[]>([])
  const [filteredDoctors, setFilteredDoctors] = useState<Doctor[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState("")
  const [sortBy, setSortBy] = useState("name-asc")
  const [connectedOffices, setConnectedOffices] = useState<ConnectedOffice[]>([])

  // Fetch connected offices (for lab_admin role)
  const fetchConnectedOffices = useCallback(async () => {
    try {
      const token = localStorage.getItem("token")
      if (!token) return

      const url = new URL("/v1/slip/connected-offices", API_BASE_URL)
      const res = await fetch(url.toString(), {
        headers: { Authorization: `Bearer ${token}` },
      })
      
      if (res.status === 401) {
        window.location.href = "/login"
        return
      }
      
      const json = await res.json()
      setConnectedOffices(json.data || [])
      return json.data || []
    } catch (e) {
      console.error("Error fetching connected offices:", e)
      setConnectedOffices([])
      return []
    }
  }, [])

  // Fetch doctors using the same logic as dental-slip-page.tsx
  const fetchDoctors = useCallback(async () => {
    setIsLoading(true)
    try {
      const token = localStorage.getItem("token")
      if (!token) {
        throw new Error("No authentication token found")
      }

      const role = localStorage.getItem("role") || ""
      let officeId: number | null = null

      // Determine office ID based on role (same logic as dental-slip-page.tsx)
      if (role === "office_admin" || role === "doctor") {
        // For office_admin and doctor roles, use customerId as officeId
        const customerId = localStorage.getItem("customerId")
        if (customerId) {
          officeId = Number(customerId)
        } else {
          throw new Error("No customer ID found")
        }
      } else if (role === "lab_admin") {
        // For lab_admin, first fetch connected offices, then use first office
        const offices = await fetchConnectedOffices()
        if (offices && offices.length > 0) {
          const firstOffice = offices[0] as ConnectedOffice
          officeId = firstOffice?.office?.id || null
          if (!officeId) {
            throw new Error("No office ID found in connected offices")
          }
        } else {
          throw new Error("No connected offices found")
        }
      } else {
        throw new Error(`Role ${role} not supported for doctor selection`)
      }

      if (!officeId) {
        throw new Error("Unable to determine office ID")
      }

      // Fetch doctors using the office ID endpoint
      const url = new URL(`/v1/slip/office/${officeId}/doctors`, API_BASE_URL)
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
        throw new Error(`Failed to fetch doctors: ${response.status}`)
      }

      const data = await response.json()
      const doctorsList = (data.data || []).map((doctor: any) => ({
        id: doctor.id,
        first_name: doctor.first_name || "",
        last_name: doctor.last_name || "",
        email: doctor.email || "",
        image: doctor.image || doctor.profile_image || null,
        status: doctor.status || "active",
      }))

      setDoctors(doctorsList)
    } catch (error: any) {
      console.error("Error fetching doctors:", error)
      toast({
        title: "Error",
        description: error.message || "Failed to fetch doctors",
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }, [fetchConnectedOffices, toast])

  // Fetch doctors on mount
  useEffect(() => {
    const role = localStorage.getItem("role") || ""
    
    // For lab_admin, first fetch offices, then doctors
    if (role === "lab_admin") {
      fetchConnectedOffices().then(() => {
        fetchDoctors()
      })
    } else {
      fetchDoctors()
    }
  }, [fetchDoctors, fetchConnectedOffices])

  // Sort and filter doctors
  const sortedAndFilteredDoctors = useMemo(() => {
    let result = [...doctors]

    // Apply search filter
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase()
      result = result.filter(
        (doctor) =>
          doctor.first_name.toLowerCase().includes(query) ||
          doctor.last_name.toLowerCase().includes(query) ||
          doctor.email.toLowerCase().includes(query)
      )
    }

    // Apply sorting
    result.sort((a, b) => {
      const nameA = `${a.first_name} ${a.last_name}`.toLowerCase()
      const nameB = `${b.first_name} ${b.last_name}`.toLowerCase()

      switch (sortBy) {
        case "name-asc":
          return nameA.localeCompare(nameB)
        case "name-desc":
          return nameB.localeCompare(nameA)
        default:
          return nameA.localeCompare(nameB)
      }
    })

    return result
  }, [doctors, searchQuery, sortBy])

  useEffect(() => {
    setFilteredDoctors(sortedAndFilteredDoctors)
  }, [sortedAndFilteredDoctors])

  const handleAddDoctor = () => {
    // Navigate to add doctor page or open modal
    // For now, we'll just show a toast
    toast({
      title: "Add Doctor",
      description: "Add doctor functionality will be implemented here",
    })
  }

  const handleDoctorSelect = (doctor: Doctor) => {
    // Store selected doctor in localStorage for the next step
    localStorage.setItem("selectedDoctor", JSON.stringify(doctor))
    // Navigate to choose-lab page
    router.push(`/choose-lab?doctorId=${doctor.id}`)
  }

  const handleCancel = () => {
    router.back()
  }

  const getInitials = (firstName: string, lastName: string) => {
    const first = firstName?.charAt(0) || ""
    const last = lastName?.charAt(0) || ""
    return `${first}${last}`.toUpperCase()
  }

  return (
    <div className="min-h-screen bg-white">
      <SlipCreationHeader variant="simple" />

      <div className="container mx-auto px-6 max-w-[1400px]">
        <div className="border-t border-gray-200 pt-8">
          {/* Title */}
          <h1 className="text-xl font-semibold text-center mb-8">Choose a Doctor</h1>

          {/* Search and Controls Bar */}
          <div className="flex items-center gap-4 mb-4 max-w-5xl mx-auto">
            {/* Search Input - takes most space */}
            <div className="relative flex-1">
              <Input
                type="text"
                placeholder="Search Doctors"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="h-10 pl-4 pr-10 border-gray-300 rounded-md text-sm"
              />
              <Search className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            </div>

            {/* Add Doctor Button */}
            <Button
              onClick={handleAddDoctor}
              className="bg-[#1162a8] hover:bg-[#0e5189] text-white h-10 px-4 rounded-md text-sm font-semibold whitespace-nowrap"
            >
              + Add Doctor
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
                </SelectContent>
              </Select>
            </div>

            {/* Results Count */}
            <p className="text-sm text-gray-400">
              {filteredDoctors.length} {filteredDoctors.length === 1 ? "doctor" : "doctors"} found
            </p>
          </div>

          {/* Loading State */}
          {isLoading ? (
            <div className="flex items-center justify-center py-20">
              <div className="text-gray-500">Loading doctors...</div>
            </div>
          ) : filteredDoctors.length === 0 ? (
            <div className="flex items-center justify-center py-20">
              <div className="text-gray-500">No doctors found</div>
            </div>
          ) : (
            /* Doctor Cards Grid */
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-x-12 gap-y-16 mb-16 max-w-6xl mx-auto px-4 place-items-center">
              {filteredDoctors.map((doctor) => (
                <div
                  key={doctor.id}
                  className="flex flex-col items-center justify-center gap-4 cursor-pointer group"
                  onClick={() => handleDoctorSelect(doctor)}
                >
                  <div className="relative w-40 h-40 rounded-full overflow-hidden border-2 border-gray-200 group-hover:border-[#1162a8] transition-colors flex items-center justify-center">
                    <Avatar className="w-full h-full">
                      <AvatarImage
                        src={doctor.image || "/images/doctor-image.png"}
                        alt={`${doctor.first_name} ${doctor.last_name}`}
                        className="object-cover"
                      />
                      <AvatarFallback className="bg-[#1162a8] text-white text-3xl font-semibold">
                        {getInitials(doctor.first_name, doctor.last_name)}
                      </AvatarFallback>
                    </Avatar>
                  </div>
                  <p className="text-sm font-semibold text-gray-900 text-center">
                    {doctor.first_name} {doctor.last_name}, DDS
                  </p>
                </div>
              ))}
            </div>
          )}

          {/* Cancel Button */}
          <div className="flex justify-end max-w-6xl mx-auto px-4">
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
    </div>
  )
}

