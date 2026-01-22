"use client"

import { useState, useEffect, useMemo, useRef } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { useQuery } from "@tanstack/react-query"
import { useClearCaseDesignCenterStateMutation } from "@/hooks/use-case-design-center-state"
import { Search, Star, Pencil, Filter } from "lucide-react"
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
import { CustomerLogo } from "@/components/customer-logo"
import { SlipCreationHeader } from "@/components/slip-creation-header"
import { useDebounce } from "@/lib/performance-utils"
import { SlipCreationFooter } from "@/components/slip-creation-footer"
import { AddNewLabModal } from "@/components/add-new-lab-modal"
import { useCustomerLogoStore } from "@/stores/customer-logo-store"
import { Dialog, DialogContent, DialogOverlay, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog"

interface Lab {
  id: number
  name: string
  location?: string
  city?: string
  state?: string
  logo?: string
  image?: string
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
  const clearCaseDesignCenterStateMutation = useClearCaseDesignCenterStateMutation()
  const [searchQuery, setSearchQuery] = useState("")
  const [sortBy, setSortBy] = useState("name-asc")
  const [selectedDoctor, setSelectedDoctor] = useState<Doctor | null>(null)
  const [createdBy, setCreatedBy] = useState<string>("")
  const [showRefreshWarningModal, setShowRefreshWarningModal] = useState(false)
  const [showAddLabModal, setShowAddLabModal] = useState(false)
  const [sortPopoverOpen, setSortPopoverOpen] = useState(false)
  const allowNavigationRef = useRef<boolean>(false)
  const { setCustomerLogo } = useCustomerLogoStore()

  // Debounce search query to avoid excessive API calls
  const debouncedSearchQuery = useDebounce(searchQuery, 500)

  // Remove caseDesignCenterState from localStorage on page load/refresh using React Query
  useEffect(() => {
    clearCaseDesignCenterStateMutation.mutate()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Redirect office_admin directly to case-design-center (only if no doctorId in URL)
  // If doctorId is present, allow them to select a lab after selecting a doctor
  useEffect(() => {
    if (typeof window !== "undefined") {
      const role = localStorage.getItem("role")
      const doctorId = searchParams.get("doctorId")
      if (role === "office_admin" && !doctorId) {
        router.replace("/case-design-center")
      }
    }
  }, [router, searchParams])

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

  // Fetch labs using React Query with debounced search
  const {
    data: labs = [],
    isLoading,
    error,
    refetch,
  } = useQuery<Lab[]>({
    queryKey: ["labs", debouncedSearchQuery],
    queryFn: async () => {
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
        throw new Error(`Failed to fetch labs: ${response.status}`)
      }

      const data = await response.json()
      
      // Transform data based on whether it's offices or labs
      const labsList = (data.data || []).map((item: any) => {
        // Handle both office and lab structures
        const lab = item.lab || item.office || item
        return {
          id: lab.id || item.id, // Use lab/office ID directly
          name: lab.name || item.name || "",
          location: lab.location || item.location || "",
          city: lab.city || item.city || "",
          state: lab.state || item.state || "",
          logo: lab.logo_url || lab.logo || item.logo || lab.image || item.image || null,
          image: lab.image || item.image || null,
          is_favorite: item.is_favorite || false,
        }
      })

      return labsList
    },
    enabled: typeof window !== "undefined" && !!localStorage.getItem("token"),
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
        description: error instanceof Error ? error.message : "Failed to fetch labs",
        variant: "destructive",
      })
    }
  }, [error, toast])

  // Sort labs (search is handled by API with debounced query)
  const sortedAndFilteredLabs = useMemo(() => {
    let result = [...labs]

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
  }, [labs, sortBy])

  const handleAddLab = () => {
    setShowAddLabModal(true)
  }

  const handleLabSelect = (lab: Lab) => {
    // Store selected lab
    localStorage.setItem("selectedLab", JSON.stringify(lab))
    
    // Store logo in the format CustomerLogo component expects (only for "Sending to" section)
    // This does NOT change the center logo, which remains the user's own customer logo
    if (lab.logo) {
      setCustomerLogo(lab.id, lab.logo)
    }
    
    // Get user role
    const role = typeof window !== "undefined" ? localStorage.getItem("role") || "" : ""
    
    // If role is office_admin, redirect to patient-input page
    // office_admin has already selected a doctor, so they go to patient input next
    if (role === "office_admin") {
      router.push(`/patient-input?labId=${lab.id}`)
      return
    }
    
    // Navigate to choose doctor page (for other roles)
    router.push(`/choose-doctor?labId=${lab.id}`)
  }

  const handleLabSelectFromModal = (lab: any) => {
    // Handle lab selection from the modal
    // The modal might return a lab that was just connected
    // Refresh the labs list to show the newly connected lab
    refetch()
    // If a lab is provided, select it and navigate
    if (lab) {
      // Transform lab to match Lab interface if needed
      const transformedLab: Lab = {
        id: lab.id || lab.customer_id,
        name: lab.name || "",
        location: lab.location || "",
        city: lab.city || "",
        state: lab.state || "",
        logo: lab.logo_url || lab.logo || lab.image || null,
        image: lab.image || null,
        is_favorite: lab.is_favorite || false,
      }
      handleLabSelect(transformedLab)
    }
  }


  // Check if there's unsaved work (selected doctor)
  const hasUnsavedWork = useMemo(() => {
    return selectedDoctor !== null
  }, [selectedDoctor])

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
        variant="full"
        doctor={selectedDoctor}
        showLogo={true}
        hideSecondHeader={true}
      />

      <div className="container mx-auto px-6 max-w-[1400px] pt-8">

          {/* Title */}
          <h1 className="text-xl font-semibold text-center mb-6">
            {typeof window !== "undefined"
              ? (() => {
                  const role = window.localStorage.getItem("role");
                  if (role === "lab_admin") return "Choose a Office";
                  if (role === "office_admin") return "Choose a Lab";
                  return "Choose Lab";
                })()
              : "Choose Lab"}
          </h1>

          {/* Search and Controls Bar */}
          <div className="flex items-center justify-between gap-4 mb-4 max-w-5xl mx-auto">
            {/* Search Input - takes most space - hide if 5 or fewer labs/offices */}
            {labs.length > 5 && (
              <div className="relative flex-1">
                <Input
                  type="text"
                  placeholder={
                    typeof window !== "undefined"
                      ? (() => {
                          const role = window.localStorage.getItem("role");
                          if (role === "lab_admin") return "Search Dental Office";
                          if (role === "office_admin") return "Search Dental lab";
                          return "Search Dental Lab";
                        })()
                      : "Search Dental Lab"
                  }
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="h-10 pl-4 pr-10 border-gray-300 rounded-md text-sm"
                />
                <Search className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
              </div>
            )}

            {/* Add Lab Button */}
            <Button
              onClick={handleAddLab}
              className="bg-[#1162a8] hover:bg-[#0e5189] text-white h-10 px-4 rounded-md text-sm font-semibold whitespace-nowrap ml-auto"
            >
              {typeof window !== "undefined"
                ? (() => {
                    const role = window.localStorage.getItem("role");
                    if (role === "lab_admin") return "Add New Office";
                    if (role === "office_admin") return "Add New Lab";
                    return "Add New Lab";
                  })()
                : "Add New Lab"}
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
                  <button
                    onClick={() => {
                      setSortBy("location-asc")
                      setSortPopoverOpen(false)
                    }}
                    className={`w-full text-left px-2 py-1.5 text-sm rounded hover:bg-gray-100 ${
                      sortBy === "location-asc" ? "bg-gray-100 font-medium" : ""
                    }`}
                  >
                    Location
                  </button>
                </div>
              </PopoverContent>
            </Popover>

            {/* Results Count */}
            <p className="text-sm text-gray-400">
              {sortedAndFilteredLabs.length} {sortedAndFilteredLabs.length === 1 ? "lab" : "labs"} found
            </p>
          </div>

          {/* Loading State */}
          {isLoading ? (
            <div className="flex items-center justify-center py-20">
              <div className="text-gray-500">
                {typeof window !== "undefined"
                  ? (() => {
                      const role = window.localStorage.getItem("role");
                      if (role === "lab_admin") {
                        return "Loading Offices...";
                      }
                      if (role === "office_admin") {
                        return "Loading Labs...";
                      }
                      return "Loading...";
                    })()
                  : "Loading..."}
              </div>
            </div>
          ) : sortedAndFilteredLabs.length === 0 ? (
            <div className="flex items-center justify-center py-20">
              <div className="text-gray-500">
                {typeof window !== "undefined"
                  ? (() => {
                      const role = window.localStorage.getItem("role");
                      if (role === "office_admin") {
                        // If there are no labs found, check if there are any 'lab_admin' roles in the lab data
                        const anyLabAdmin = sortedAndFilteredLabs.some(
                          (lab: any) => lab.role === "lab_admin"
                        );
                        return anyLabAdmin ? "No offices found" : "No labs found";
                      }
                      return "No labs found";
                    })()
                  : "No labs found"}
              </div>
            </div>
          ) : (
            /* Lab Cards Grid */
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-12 max-w-6xl mx-auto">
              {sortedAndFilteredLabs.map((lab: Lab) => (
                <div
                  key={lab.id}
                  onClick={() => handleLabSelect(lab)}
                  className="bg-white border-2 border-gray-300 rounded-lg p-4 flex flex-col items-center justify-between relative group hover:shadow-lg transition-all min-h-[220px] hover:border-[#1162A8] cursor-pointer"
                >
                  {/* Favorite Star */}
                  {lab.is_favorite && (
                    <div className="absolute top-3 left-3">
                      <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                    </div>
                  )}

                  {/* Click and select label - appears on hover */}
                  <p 
                    className="opacity-0 group-hover:opacity-100 transition-opacity absolute top-3 right-3"
                    style={{
                      fontFamily: 'Verdana',
                      fontStyle: 'normal',
                      fontWeight: 400,
                      fontSize: '14px',
                      lineHeight: '22px',
                      textAlign: 'center',
                      letterSpacing: '-0.02em',
                      color: '#7F7F7F',
                      width: '106px',
                      height: '22px',
                    }}
                  >
                    Click and select
                  </p>

                  {/* Lab Logo */}
                  <div className="flex-1 flex items-center justify-center w-full py-4">
                    {lab.logo ? (
                      <img
                        src={lab.logo}
                        alt={lab.name}
                        className="max-h-[80px] max-w-[140px] object-contain"
                        onError={(e) => {
                          // Fallback to CustomerLogo if image fails to load
                          const target = e.target as HTMLImageElement
                          target.style.display = 'none'
                          const fallback = target.nextElementSibling as HTMLElement
                          if (fallback) {
                            fallback.style.display = 'flex'
                          }
                        }}
                      />
                    ) : null}
                    {lab.id && (
                      <div style={{ display: lab.logo ? 'none' : 'flex' }} className="items-center justify-center">
                        <CustomerLogo
                          customerId={lab.id}
                          alt={lab.name}
                          className="max-h-[80px] max-w-[140px] object-contain"
                        />
                      </div>
                    )}
                    {!lab.logo && !lab.id && (
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
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer - Consistent across all pages */}
        <SlipCreationFooter 
          showPrevious={true}
          onPrevious={() => {
            // Check if we came from choose-doctor (doctorId in URL)
            const doctorId = searchParams.get("doctorId")
            if (doctorId) {
              router.push(`/choose-doctor`)
            } else {
              // Otherwise go back to dashboard
              router.push("/dashboard")
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

      {/* Add New Lab Modal */}
      <AddNewLabModal
        open={showAddLabModal}
        onOpenChange={(open) => {
          setShowAddLabModal(open)
          // Refresh labs list when modal closes (in case a lab was added/connected)
          if (!open) {
            refetch()
          }
        }}
        onLabSelect={handleLabSelectFromModal}
      />
    </div>
  )
}

