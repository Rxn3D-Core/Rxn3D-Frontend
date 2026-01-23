"use client"

import { useState, useEffect, useCallback, useMemo, useRef } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { useQuery, useQueryClient } from "@tanstack/react-query"
import { useClearCaseDesignCenterStateMutation } from "@/hooks/use-case-design-center-state"
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
import { SlipCreationFooter } from "@/components/slip-creation-footer"
import { useDebounce } from "@/lib/performance-utils"
import { Dialog, DialogContent, DialogOverlay, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog"

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
  const queryClient = useQueryClient()
  const clearCaseDesignCenterStateMutation = useClearCaseDesignCenterStateMutation()
  const [searchQuery, setSearchQuery] = useState("")
  const [sortBy, setSortBy] = useState("name-asc")
  const [selectedLab, setSelectedLab] = useState<Lab | null>(null)
  const [createdBy, setCreatedBy] = useState<string>("")
  const [showAddDoctorModal, setShowAddDoctorModal] = useState(false)
  const [showRefreshWarningModal, setShowRefreshWarningModal] = useState(false)
  const [sortPopoverOpen, setSortPopoverOpen] = useState(false)
  const [hasAutoSelected, setHasAutoSelected] = useState(false)
  const allowNavigationRef = useRef<boolean>(false)

  // Debounce search query
  const debouncedSearchQuery = useDebounce(searchQuery, 500)

  // Remove caseDesignCenterState from localStorage on page load/refresh using React Query
  useEffect(() => {
    clearCaseDesignCenterStateMutation.mutate()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

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

  // Fetch connected offices (for lab_admin role) using React Query
  const {
    data: connectedOffices = [],
  } = useQuery<ConnectedOffice[]>({
    queryKey: ["connected-offices"],
    queryFn: async () => {
      const token = localStorage.getItem("token")
      if (!token) {
        throw new Error("No authentication token found")
      }

      const url = new URL("/v1/slip/connected-offices", API_BASE_URL)
      const res = await fetch(url.toString(), {
        headers: { Authorization: `Bearer ${token}` },
      })
      
      if (res.status === 401) {
        window.location.href = "/login"
        throw new Error("Unauthorized")
      }
      
      if (!res.ok) {
        throw new Error(`Failed to fetch connected offices: ${res.status}`)
      }
      
      const json = await res.json()
      return json.data || []
    },
    enabled: typeof window !== "undefined" && !!localStorage.getItem("token") && localStorage.getItem("role") === "lab_admin" && !selectedLab,
    staleTime: 1000 * 60 * 5, // 5 minutes
    gcTime: 1000 * 60 * 10, // 10 minutes
    retry: 1,
    refetchOnWindowFocus: false,
  })

  // Determine if doctors query should be enabled
  const shouldFetchDoctors = useMemo(() => {
    if (typeof window === "undefined") return false
    const token = localStorage.getItem("token")
    if (!token) return false
    
    const role = localStorage.getItem("role") || ""
    
    // If lab is selected, we can fetch
    if (selectedLab) return true
    
    // For office_admin and doctor, we can fetch (they use customerId)
    if (role === "office_admin" || role === "doctor") return true
    
    // For lab_admin, we need connected offices first
    if (role === "lab_admin") {
      return connectedOffices.length > 0
    }
    
    return false
  }, [selectedLab, connectedOffices])

  // Fetch doctors using React Query
  const {
    data: doctors = [],
    isLoading,
    error,
    refetch,
  } = useQuery<Doctor[]>({
    queryKey: ["doctors", selectedLab?.id, debouncedSearchQuery, connectedOffices],
    queryFn: async () => {
      const token = localStorage.getItem("token")
      if (!token) {
        throw new Error("No authentication token found")
      }

      const role = localStorage.getItem("role") || ""
      let officeId: number | null = null

      // Priority 1: If lab/office is selected from choose-lab page, use its ID
      if (selectedLab) {
        officeId = selectedLab.id
      } else {
        // Priority 2: Determine office ID based on role
        if (role === "office_admin" || role === "doctor") {
          // For office_admin and doctor roles, use customerId as officeId
          const customerId = localStorage.getItem("customerId")
          if (customerId) {
            officeId = Number(customerId)
          } else {
            throw new Error("No customer ID found")
          }
        } else if (role === "lab_admin") {
          // For lab_admin, use first connected office
          if (connectedOffices && connectedOffices.length > 0) {
            const firstOffice = connectedOffices[0]
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
      
      // Add search query if provided
      if (debouncedSearchQuery.trim()) {
        url.searchParams.append("search", debouncedSearchQuery.trim())
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
        throw new Error("Unauthorized")
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

      return doctorsList
    },
    enabled: shouldFetchDoctors,
    staleTime: 1000 * 60 * 5, // 5 minutes
    gcTime: 1000 * 60 * 10, // 10 minutes
    retry: 1,
    refetchOnWindowFocus: false,
  })

  // Show error toast if query fails
  useEffect(() => {
    if (error) {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to fetch doctors",
        variant: "destructive",
      })
    }
  }, [error, toast])

  // Sort doctors (search is handled by API with debounced query)
  const sortedAndFilteredDoctors = useMemo(() => {
    let result = [...doctors]

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
  }, [doctors, sortBy])

  const handleAddDoctor = () => {
    setShowAddDoctorModal(true)
  }

  const handleDoctorSelect = useCallback((doctor: Doctor) => {
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
    // Use labId from URL directly instead of relying on selectedLab state
    // This prevents navigation glitches when auto-select runs before state is set
    const labId = searchParams.get("labId")
    if (labId) {
      // If labId is in URL, navigate to patient input page
      // This means user came from choose-lab page with a selected lab
      router.push(`/patient-input?labId=${labId}&doctorId=${doctor.id}`)
    } else {
      // Otherwise, navigate to choose-lab page (backward compatibility)
      router.push(`/choose-lab?doctorId=${doctor.id}`)
    }
  }, [router, searchParams])

  // Auto-select doctor if there's only 1 doctor
  useEffect(() => {
    if (!isLoading && doctors.length === 1 && !hasAutoSelected) {
      setHasAutoSelected(true)
      handleDoctorSelect(doctors[0])
    }
  }, [isLoading, doctors, hasAutoSelected, handleDoctorSelect])

  // Check if there's unsaved work (selected lab or doctor)
  const hasUnsavedWork = useMemo(() => {
    return selectedLab !== null
  }, [selectedLab])

  // Handle page refresh/navigation warning
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (hasUnsavedWork && !allowNavigationRef.current) {
        // Show browser's default confirmation
        e.preventDefault()
        e.returnValue = '' // Required for Chrome
        return '' // Required for Safari
      }
    }

    // Add event listener
    window.addEventListener('beforeunload', handleBeforeUnload)

    // Cleanup
    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload)
    }
  }, [hasUnsavedWork])

  // Handle refresh button click (F5 or Ctrl+R / Cmd+R) - show custom modal
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Detect F5 or Ctrl+R / Cmd+R
      if (e.key === 'F5' || (e.key === 'r' && (e.ctrlKey || e.metaKey))) {
        if (hasUnsavedWork && !allowNavigationRef.current) {
          e.preventDefault()
          setShowRefreshWarningModal(true)
        }
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => {
      window.removeEventListener('keydown', handleKeyDown)
    }
  }, [hasUnsavedWork])


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
              {sortedAndFilteredDoctors.length} {sortedAndFilteredDoctors.length === 1 ? "doctor" : "doctors"} found
            </p>
          </div>

          {/* Loading State */}
          {isLoading ? (
            <div className="flex items-center justify-center py-20">
              <div className="text-gray-500">Loading doctors...</div>
            </div>
          ) : sortedAndFilteredDoctors.length === 0 ? (
            <div className="flex items-center justify-center py-20">
              <div className="text-gray-500">No doctors found</div>
            </div>
          ) : (
            /* Doctor Cards Grid */
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-x-12 gap-y-16 mb-16 max-w-6xl mx-auto px-4 place-items-center">
              {sortedAndFilteredDoctors.map((doctor) => (
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
        <SlipCreationFooter 
          showPrevious={true}
          onPrevious={() => {
            // Check if we came from choose-lab (labId in URL)
            const labId = searchParams.get("labId")
            if (labId) {
              router.push(`/choose-lab`)
            } else {
              // Otherwise go back to dashboard
              router.push("/dashboard")
            }
          }}
        />
      </div>

      {/* Add Doctor Modal */}
      <AddDoctorModal
        isOpen={showAddDoctorModal}
        onClose={() => setShowAddDoctorModal(false)}
        onDoctorConnect={(doctorId: string, doctorData?: any) => {
          // Refresh the doctors list to show the newly connected doctor
          refetch()
          
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

      {/* Refresh Warning Modal */}
      {showRefreshWarningModal && (
        <Dialog open={showRefreshWarningModal} onOpenChange={(open) => {
          if (!open) setShowRefreshWarningModal(false)
        }}>
          <DialogOverlay className="fixed inset-0 z-[100000] bg-black/50 backdrop-blur-sm" />
          <DialogContent className="sm:max-w-[425px] p-6 rounded-lg shadow-lg" style={{ zIndex: 100001 }}>
            <DialogHeader className="text-center">
              <DialogTitle className="text-2xl font-bold text-gray-900">Refresh Page?</DialogTitle>
              <DialogDescription className="text-gray-500 mt-2">
                Are you sure you want to refresh the page? All unsaved changes will be lost. Your work is saved in the browser, but refreshing will reset your current session.
              </DialogDescription>
            </DialogHeader>
            <div className="flex justify-center gap-4 mt-6">
              <Button 
                variant="outline" 
                onClick={() => setShowRefreshWarningModal(false)} 
                className="px-6 py-2 rounded-lg bg-transparent"
              >
                Stay on Page
              </Button>
              <Button 
                onClick={() => {
                  // Allow navigation and refresh
                  allowNavigationRef.current = true
                  setShowRefreshWarningModal(false)
                  // Trigger page refresh
                  window.location.reload()
                }} 
                className="bg-red-600 hover:bg-red-700 text-white px-6 py-2 rounded-lg"
              >
                Yes, Refresh
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      )}
    </div>
  )
}

