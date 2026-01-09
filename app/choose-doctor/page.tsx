"use client"

import { useState, useEffect, useCallback, useMemo, useRef } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { Search, Filter } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { useToast } from "@/hooks/use-toast"
import { SlipCreationHeader } from "@/components/slip-creation-header"
import { AddDoctorModal } from "@/components/add-doctor-modal"
import { clearSlipCreationStorage } from "@/utils/slip-creation-storage"
import CancelSlipCreationModal from "@/components/cancel-slip-creation-modal"

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

interface Lab {
  id: number
  name: string
  logo?: string
}

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:3000"

export default function ChooseDoctorPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { toast } = useToast()
  const [doctors, setDoctors] = useState<Doctor[]>([])
  const [filteredDoctors, setFilteredDoctors] = useState<Doctor[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState("")
  const [sortBy, setSortBy] = useState("name-asc")
  const [connectedOffices, setConnectedOffices] = useState<ConnectedOffice[]>([])
  const [selectedLab, setSelectedLab] = useState<Lab | null>(null)
  const [createdBy, setCreatedBy] = useState<string>("")
  const [showAddDoctorModal, setShowAddDoctorModal] = useState(false)
  const [showCancelModal, setShowCancelModal] = useState(false)
  const [sortPopoverOpen, setSortPopoverOpen] = useState(false)

  // Get lab from URL or localStorage
  useEffect(() => {
    const labId = searchParams.get("labId")
    if (labId) {
      const storedLab = localStorage.getItem("selectedLab")
      if (storedLab) {
        try {
          const lab = JSON.parse(storedLab)
          setSelectedLab(lab)
        } catch (error) {
          console.error("Error parsing selected lab:", error)
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

  // Refs for debouncing API calls
  const fetchConnectedOfficesTimeoutRef = useRef<NodeJS.Timeout | null>(null)
  const fetchDoctorsTimeoutRef = useRef<NodeJS.Timeout | null>(null)

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

  // Debounced version of fetchConnectedOffices
  const debouncedFetchConnectedOffices = useCallback((): Promise<any> => {
    return new Promise((resolve, reject) => {
      if (fetchConnectedOfficesTimeoutRef.current) {
        clearTimeout(fetchConnectedOfficesTimeoutRef.current)
      }
      fetchConnectedOfficesTimeoutRef.current = setTimeout(async () => {
        try {
          const result = await fetchConnectedOffices()
          resolve(result)
        } catch (error) {
          reject(error)
        }
      }, 300) // 300ms debounce delay
    })
  }, [fetchConnectedOffices])

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

      // Priority 1: If lab/office is selected from choose-lab page, use its ID
      if (selectedLab) {
        // Use the lab/office ID directly
        officeId = selectedLab.id
      } else {
        // Priority 2: Determine office ID based on role (same logic as dental-slip-page.tsx)
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
          const offices = await debouncedFetchConnectedOffices()
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
  }, [selectedLab, debouncedFetchConnectedOffices, toast])

  // Debounced version of fetchDoctors
  const debouncedFetchDoctors = useCallback((): Promise<void> => {
    return new Promise((resolve, reject) => {
      if (fetchDoctorsTimeoutRef.current) {
        clearTimeout(fetchDoctorsTimeoutRef.current)
      }
      fetchDoctorsTimeoutRef.current = setTimeout(async () => {
        try {
          await fetchDoctors()
          resolve()
        } catch (error) {
          reject(error)
        }
      }, 300) // 300ms debounce delay
    })
  }, [fetchDoctors])

  // Fetch doctors on mount and when selectedLab changes (with debouncing)
  useEffect(() => {
    const role = localStorage.getItem("role") || ""
    
    // If lab is selected, fetch doctors directly (debounced)
    if (selectedLab) {
      debouncedFetchDoctors()
    } else {
      // For lab_admin, first fetch offices (debounced), then doctors (debounced)
      if (role === "lab_admin") {
        debouncedFetchConnectedOffices().then(() => {
          debouncedFetchDoctors()
        })
      } else {
        debouncedFetchDoctors()
      }
    }

    // Cleanup timeouts on unmount or dependency change
    return () => {
      if (fetchConnectedOfficesTimeoutRef.current) {
        clearTimeout(fetchConnectedOfficesTimeoutRef.current)
      }
      if (fetchDoctorsTimeoutRef.current) {
        clearTimeout(fetchDoctorsTimeoutRef.current)
      }
    }
  }, [selectedLab, debouncedFetchDoctors, debouncedFetchConnectedOffices])

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
    setShowAddDoctorModal(true)
  }

  const handleDoctorSelect = (doctor: Doctor) => {
    // Store selected doctor in localStorage for the next step
    localStorage.setItem("selectedDoctor", JSON.stringify(doctor))
    
    // Get user role
    const role = localStorage.getItem("role") || ""
    
    // If role is office_admin, always redirect to choose-lab page
    if (role === "office_admin") {
      router.push(`/choose-lab?doctorId=${doctor.id}`)
      return
    }
    
    // Check if lab is already selected (from URL param)
    const labId = searchParams.get("labId")
    if (labId && selectedLab) {
      // If lab is selected, navigate to patient input page
      router.push(`/patient-input?labId=${labId}&doctorId=${doctor.id}`)
    } else {
      // Otherwise, navigate to choose-lab page (backward compatibility)
      router.push(`/choose-lab?doctorId=${doctor.id}`)
    }
  }

  const handleCancel = () => {
    setShowCancelModal(true)
  }

  const getInitials = (firstName: string, lastName: string) => {
    const first = firstName?.charAt(0) || ""
    const last = lastName?.charAt(0) || ""
    return `${first}${last}`.toUpperCase()
  }

  return (
    <div className="min-h-screen bg-white">
      <SlipCreationHeader 
        variant={selectedLab ? "full" : "simple"}
        sendingToLab={selectedLab}
        createdBy={createdBy}
        showLogo={true}
        hideSecondHeader={true}
      />

      <div className="container mx-auto px-6 max-w-[1400px] pt-8">
        <div className="">
          {/* Title */}
          <h1 className="text-xl font-semibold text-center mb-8">Choose a Doctor</h1>

          {/* Search and Controls Bar */}
          <div className="flex items-center justify-between gap-4 mb-4 max-w-5xl mx-auto">
            {/* Search Input - takes most space - hide if 5 or fewer doctors */}
            {doctors.length > 5 && (
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
            )}

            {/* Add Doctor Button */}
            <Button
              onClick={handleAddDoctor}
              className="bg-[#1162a8] hover:bg-[#0e5189] text-white h-10 px-4 rounded-md text-sm font-semibold whitespace-nowrap ml-auto"
            >
              + Add Doctor
            </Button>
          </div>

          {/* Sort By and Results Count */}
          <div className="flex items-center justify-between mb-8 max-w-5xl mx-auto">
            {/* Sort By */}
            <Popover open={sortPopoverOpen} onOpenChange={setSortPopoverOpen}>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className="h-9 w-9 p-0 border-gray-300 rounded-md hover:bg-gray-50"
                  aria-label="Sort options"
                >
                  <Filter className="h-4 w-4 text-gray-700" />
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-48 p-2" align="start">
                <div className="space-y-1">
                  <p className="text-xs font-semibold text-gray-700 mb-2 px-2">Sort By</p>
                  <button
                    onClick={() => {
                      setSortBy("name-asc")
                      setSortPopoverOpen(false)
                    }}
                    className={`w-full text-left px-2 py-1.5 text-sm rounded hover:bg-gray-100 ${
                      sortBy === "name-asc" ? "bg-gray-100 font-medium" : ""
                    }`}
                  >
                    Name A-Z
                  </button>
                  <button
                    onClick={() => {
                      setSortBy("name-desc")
                      setSortPopoverOpen(false)
                    }}
                    className={`w-full text-left px-2 py-1.5 text-sm rounded hover:bg-gray-100 ${
                      sortBy === "name-desc" ? "bg-gray-100 font-medium" : ""
                    }`}
                  >
                    Name Z-A
                  </button>
                </div>
              </PopoverContent>
            </Popover>

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
                  <p 
                    className="opacity-0 group-hover:opacity-100 transition-opacity text-center"
                    style={{
                      fontFamily: 'Verdana',
                      fontStyle: 'normal',
                      fontWeight: 400,
                      fontSize: '14px',
                      lineHeight: '22px',
                      letterSpacing: '-0.02em',
                      color: '#7F7F7F',
                      width: '106px',
                      height: '22px',
                    }}
                  >
                    Click and select
                  </p>
                </div>
              ))}
            </div>
          )}

        </div>

        {/* Footer - Consistent across all pages */}
        <div 
          className="bg-white flex-shrink-0 sticky bottom-0 left-0 right-0 z-10"
          style={{
            height: "59.94px",
            background: "#FFFFFF",
          }}
        >
          <div className="flex justify-end items-center gap-3 h-full px-6">
            <Button
              onClick={() => router.back()}
              variant="outline"
              style={{
                display: "flex",
                flexDirection: "row",
                justifyContent: "center",
                alignItems: "center",
                padding: "12px 16px",
                gap: "10px",
                minWidth: "111px",
                height: "27px",
                background: "#1162A8",
                borderRadius: "6px",
                border: "none",
                fontFamily: "Verdana",
                fontStyle: "normal",
                fontWeight: 700,
                fontSize: "12px",
                lineHeight: "22px",
                letterSpacing: "-0.02em",
                color: "#FFFFFF",
                whiteSpace: "nowrap",
              }}
              className="hover:opacity-90"
            >
              Previous
            </Button>
            <Button
              onClick={handleCancel}
              variant="outline"
              style={{
                boxSizing: "border-box",
                display: "flex",
                flexDirection: "row",
                justifyContent: "center",
                alignItems: "center",
                padding: "12px 16px",
                gap: "10px",
                minWidth: "111px",
                height: "27px",
                border: "2px solid #9BA5B7",
                borderRadius: "6px",
                fontFamily: "Verdana",
                fontStyle: "normal",
                fontWeight: 700,
                fontSize: "12px",
                lineHeight: "22px",
                letterSpacing: "-0.02em",
                color: "#9BA5B7",
                background: "transparent",
                whiteSpace: "nowrap",
              }}
              className="hover:opacity-80"
            >
              Cancel
            </Button>
          </div>
        </div>
      </div>

      {/* Add Doctor Modal */}
      <AddDoctorModal
        isOpen={showAddDoctorModal}
        onClose={() => setShowAddDoctorModal(false)}
        onDoctorConnect={(doctorId: string, doctorData?: any) => {
          // Refresh the doctors list to show the newly connected doctor
          fetchDoctors()
          
          // If doctor data is provided and user wants to auto-select, we can do that
          // For now, just refresh the list and close the modal
          setShowAddDoctorModal(false)
          
          // Show success message
          if (doctorData) {
            const doctorName = doctorData.name || `${doctorData.first_name || ""} ${doctorData.last_name || ""}`.trim()
            toast({
              title: "Doctor Connected",
              description: `${doctorName} has been connected successfully.`,
            })
          } else {
            toast({
              title: "Doctor Connected",
              description: "Doctor has been connected successfully.",
            })
          }
        }}
      />

      {/* Cancel Slip Creation Modal */}
      {showCancelModal && (
        <CancelSlipCreationModal
          open={showCancelModal}
          onCancel={() => setShowCancelModal(false)}
          onConfirm={() => {
            setShowCancelModal(false)
            setTimeout(() => {
              router.replace("/dashboard")
            }, 100)
          }}
        />
      )}
    </div>
  )
}

