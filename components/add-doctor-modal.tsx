"use client"

import type React from "react"
import { useState, useEffect, useCallback } from "react"
// Using custom modal approach like AddNewLabModal
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { Search, Plus, CheckCircle, X, ChevronDown, Loader2, AlertCircle } from "lucide-react"
import Image from "next/image"
import { useToast } from "@/hooks/use-toast"
import { useInvitation } from "@/contexts/invitation-context"
import { userInvitationService } from "@/services/user-invitation-service"

interface Doctor {
  id: string
  name: string
  email: string
  title: string
  image?: string
  status?: "available" | "requested" | "connected" | "Invited"
  userStatus?: "Active" | "Inactive" | "Suspended" | "Pending" | "Archived" | "Invited"
}

interface AddDoctorModalProps {
  isOpen: boolean
  onClose: () => void
  onDoctorConnect: (doctorId: string, doctorData?: Doctor) => void
}

type ModalStep = "search" | "connect" | "invite" | "sending" | "success"

// API base URL
const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:3000/api"

export function AddDoctorModal({ isOpen, onClose, onDoctorConnect }: AddDoctorModalProps) {
  const [step, setStep] = useState<ModalStep>("search")
  const [searchTerm, setSearchTerm] = useState("")
  const [sortBy, setSortBy] = useState("name-az")
  const [selectedDoctor, setSelectedDoctor] = useState<Doctor | null>(null)
  const [filteredDoctors, setFilteredDoctors] = useState<Doctor[]>([])
  const [connectType, setConnectType] = useState<"request" | "invite">("request")
  const [isSearchFocused, setIsSearchFocused] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [customToast, setCustomToast] = useState<{
    title: string
    description: string
    variant: "default" | "destructive"
    show: boolean
  } | null>(null)
  
  const { toast } = useToast()
  const { sendInvitation, isLoading: isInvitationLoading } = useInvitation()

  // Custom toast function that appears in front of modal
  const showCustomToast = (title: string, description: string, variant: "default" | "destructive" = "default") => {
    setCustomToast({ title, description, variant, show: true })
    setTimeout(() => {
      setCustomToast(null)
    }, 5000)
  }

  // Invite form state
  const [inviteForm, setInviteForm] = useState({
    name: "",
    email: ""
  })

  // Search for doctors using the user search API
  const searchDoctors = useCallback(async (searchQuery: string = "") => {
    setIsLoading(true)
    setError(null)
    
    try {
      const token = localStorage.getItem("token")
      if (!token) {
        throw new Error("No authentication token found")
      }

      // Get current user info to determine customer_id
      const userStr = localStorage.getItem("user")
      if (!userStr) {
        throw new Error("No user information found")
      }
      
      const user = JSON.parse(userStr)
      const customerId = user.customers?.[0]?.id
      
      if (!customerId) {
        throw new Error("No customer ID found")
      }

      // Build query parameters
      // Note: We search for Active doctors, but the API may also return Invited doctors
      // The status filter might need to be adjusted based on backend implementation
      const params = new URLSearchParams({
        customer_id: customerId.toString(),
        role: "doctor", // Only search for doctors
        per_page: "50"
      })
      
      // If we want to include Invited status, we might need to search without status filter
      // or make separate calls. For now, let's search without status to get all doctors
      
      if (searchQuery.trim()) {
        params.append("q", searchQuery.trim())
      }

      // Include Invited status in search to show all doctors including invited ones
      const response = await fetch(`${API_BASE_URL}/users?${params}`, {
        method: "GET",
        headers: {
          "Authorization": `Bearer ${token}`,
          "Content-Type": "application/json",
        },
      })

      if (!response.ok) {
        throw new Error(`Failed to search doctors: ${response.status}`)
      }

      const data = await response.json()
      
      // Transform the API response to match our Doctor interface
      const doctors: Doctor[] = data.data?.map((user: any) => ({
        id: user.id.toString(),
        name: user.full_name || `${user.first_name || ""} ${user.last_name || ""}`.trim(),
        email: user.email,
        title: user.title || "DDS",
        image: user.profile_image || "/images/doctor-image.png",
        status: user.status === "Invited" ? "Invited" : "available", // Show invited status
        userStatus: user.status // Store the actual user status
      })) || []

      setFilteredDoctors(doctors)
      
      // Show toast if no results found and user was searching
      if (searchQuery.trim() && doctors.length === 0) {
        showCustomToast("No Results Found", `No doctors found for "${searchQuery}"`, "destructive")
      }
    } catch (err: any) {
      console.error("Error searching doctors:", err)
      const errorMessage = err.message || "Failed to search doctors"
      setError(errorMessage)
      setFilteredDoctors([])
      
      // Show toast error message
      showCustomToast("Search Error", errorMessage, "destructive")
    } finally {
      setIsLoading(false)
    }
  }, [])

  // Debounced search effect
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      if (isOpen) {
        searchDoctors(searchTerm)
      }
    }, 300)

    return () => clearTimeout(timeoutId)
  }, [searchTerm, isOpen, searchDoctors])

  // Show initial search when modal opens
  useEffect(() => {
    if (isOpen && !searchTerm) {
      searchDoctors()
    }
  }, [isOpen, searchDoctors])

  // Sort doctors when sortBy changes
  useEffect(() => {
    if (filteredDoctors.length > 0) {
      const sorted = [...filteredDoctors].sort((a, b) => {
        if (sortBy === "name-az") {
          return a.name.localeCompare(b.name)
        } else if (sortBy === "name-za") {
          return b.name.localeCompare(a.name)
        }
        return 0
      })
      setFilteredDoctors(sorted)
    }
  }, [sortBy])

  const handleDoctorSelect = (doctor: Doctor) => {
    setSelectedDoctor(doctor)
    if (doctor.status === "requested") {
      return // Do nothing for already requested doctors
    }
    // If doctor is already invited or active, connect them directly
    if (doctor.status === "Invited" || doctor.userStatus === "Invited" || doctor.userStatus === "Active") {
      onDoctorConnect(doctor.id, doctor)
      handleClose()
      return
    }
    setStep("connect")
  }

  const handleConnect = async (type: "request" | "invite") => {
    setConnectType(type)
    if (type === "invite") {
      setStep("invite")
    } else {
      setStep("sending")
      try {
        // For request type, we'll send an invitation to connect
        if (selectedDoctor) {
          const userStr = localStorage.getItem("user")
          if (!userStr) {
            throw new Error("No user information found. Please log in again.")
          }
          
          const user = JSON.parse(userStr)
          const invitedBy = user.id.toString()
          
          const success = await sendInvitation({
            name: selectedDoctor.name,
            email: selectedDoctor.email,
            invited_by: invitedBy,
            type: "Doctor"
          })
          
          if (success) {
            setStep("success")
            showCustomToast("Connection Request Sent", `Connection request sent to ${selectedDoctor.name}`)
            setTimeout(() => {
              handleClose()
            }, 2000)
          } else {
            setStep("search")
            showCustomToast("Failed to Send Request", "Unable to send connection request. Please try again.", "destructive")
          }
        } else {
          throw new Error("No doctor selected")
        }
      } catch (error: any) {
        console.error("Error sending connection request:", error)
        setStep("search")
        showCustomToast("Error", error.message || "Failed to send connection request. Please try again.", "destructive")
      }
    }
  }

  const handleInviteSubmit = async (submitAndConnect: boolean = false) => {
    // Validate form data
    if (!inviteForm.name.trim()) {
      showCustomToast("Validation Error", "Doctor name is required", "destructive")
      return
    }
    
    if (!inviteForm.email.trim()) {
      showCustomToast("Validation Error", "Doctor email is required", "destructive")
      return
    }
    
    // Basic email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(inviteForm.email)) {
      showCustomToast("Validation Error", "Please enter a valid email address", "destructive")
      return
    }

    setStep("sending")
    try {
      const userStr = localStorage.getItem("user")
      if (!userStr) {
        throw new Error("No user information found. Please log in again.")
      }
      
      const user = JSON.parse(userStr)
      const customerId = user.customers?.[0]?.id
      
      if (!customerId) {
        throw new Error("No customer ID found. Please ensure you are associated with a customer.")
      }

      // Use the new invite-doctor endpoint
      const response = await userInvitationService.inviteDoctor({
        customer_id: customerId,
        name: inviteForm.name.trim(),
        email: inviteForm.email.trim(),
        role: "doctor"
      })
      
      if (response.data && response.data.user) {
        const invitedDoctor: Doctor = {
          id: response.data.user.id.toString(),
          name: response.data.user.first_name + " " + response.data.user.last_name,
          email: response.data.user.email,
          title: "DDS",
          status: "Invited",
          userStatus: "Invited"
        }

        setStep("success")
        showCustomToast(
          "Doctor Invited", 
          `Doctor invited successfully. ${submitAndConnect ? "You can now create slips with this doctor." : "Invitation email sent."}`
        )
        
        // If submitAndConnect is true, call onDoctorConnect with the user ID
        if (submitAndConnect) {
          onDoctorConnect(response.data.user.id.toString(), invitedDoctor)
        }
        
        setTimeout(() => {
          handleClose()
        }, submitAndConnect ? 1000 : 2000)
      } else {
        throw new Error("Invalid response from server")
      }
    } catch (error: any) {
      console.error("Error sending invitation:", error)
      setStep("invite")
      const errorMessage = error.message || "Failed to send invitation. Please try again."
      
      // Handle specific error cases
      if (errorMessage.includes("already belongs")) {
        showCustomToast("Doctor Already Linked", "This doctor is already linked to your office.", "destructive")
      } else if (errorMessage.includes("permission")) {
        showCustomToast("Permission Denied", "You do not have permission to invite doctors for this customer.", "destructive")
      } else {
        showCustomToast("Error", errorMessage, "destructive")
      }
    }
  }

  const handleClose = () => {
    setStep("search")
    setSearchTerm("")
    setSelectedDoctor(null)
    setError(null)
    setInviteForm({
      name: "",
      email: ""
    })
    onClose()
  }

  const renderSearchStep = () => (
    <>
      <div className="p-6">
        {/* New Slip dropdown button */}
        <div className="flex items-center justify-end mb-6">
        </div>

        {/* Search Bar Row */}
        <div className="flex items-center gap-4 mb-4">
          <div className="relative flex-1">
            <div className="relative">
              <Search className="absolute right-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                placeholder="Search Doctors"
                value={searchTerm}
                onChange={(e) => {
                  setSearchTerm(e.target.value)
                  if (e.target.value) {
                    setIsSearchFocused(false)
                  }
                }}
                onFocus={() => setIsSearchFocused(true)}
                onBlur={() => setIsSearchFocused(false)}
                className="pr-10 py-2 bg-white border border-gray-300 rounded-lg w-full"
              />
              
              {/* Dropdown content */}
              {searchTerm && (
                <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-gray-300 rounded-lg shadow-lg z-50">
                  {/* Invite option */}
                  <div 
                    className="p-4 border-b border-gray-200 cursor-pointer hover:bg-blue-50 transition-colors"
                    onClick={() => setStep("invite")}
                  >
                    <div className="flex items-center gap-3">
                      <Plus className="w-5 h-5 text-blue-600" />
                      <span className="text-blue-800 font-medium">
                        Invite '{searchTerm}'
                      </span>
                    </div>
                  </div>
                  
                  {/* Loading state */}
                  {isLoading && (
                    <div className="p-4 text-center">
                      <Loader2 className="w-5 h-5 animate-spin mx-auto mb-2 text-blue-600" />
                      <p className="text-sm text-gray-500">Searching doctors...</p>
                    </div>
                  )}
                  
                  {/* Error state */}
                  {error && !isLoading && (
                    <div className="p-4 text-center">
                      <AlertCircle className="w-5 h-5 mx-auto mb-2 text-red-500" />
                      <p className="text-sm text-red-600">{error}</p>
                    </div>
                  )}
                  
                  {/* Search results */}
                  {!isLoading && !error && filteredDoctors.length > 0 && (
                    <div className="max-h-60 overflow-y-auto">
                      {filteredDoctors.map((doctor) => (
                        <div
                          key={doctor.id}
                          className="p-3 hover:bg-gray-50 cursor-pointer border-b border-gray-100 last:border-b-0"
                          onClick={() => handleDoctorSelect(doctor)}
                        >
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 bg-gray-200 rounded-full flex items-center justify-center">
                              {doctor.image ? (
                                <Image src={doctor.image} alt={doctor.name} width={32} height={32} className="rounded-full object-cover" />
                              ) : (
                                <div className="w-full h-full bg-gradient-to-br from-blue-400 to-blue-600 rounded-full flex items-center justify-center text-white font-medium text-xs">
                                  {doctor.name.split(' ').map(n => n[0]).join('')}
                                </div>
                              )}
                            </div>
                            <div className="flex-1">
                              <div className="flex items-center gap-2">
                                <p className="font-medium text-sm">{doctor.name}, {doctor.title}</p>
                                {(doctor.status === "Invited" || doctor.userStatus === "Invited") && (
                                  <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs bg-yellow-100 text-yellow-700">
                                    Invited
                                  </span>
                                )}
                              </div>
                              <p className="text-xs text-gray-500">{doctor.email}</p>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                  
                  {/* No results message */}
                  {!isLoading && !error && filteredDoctors.length === 0 && searchTerm && (
                    <div className="p-4 text-center text-gray-500 text-sm">
                      No doctors found for '{searchTerm}'
                    </div>
                  )}
                </div>
              )}
              
              {/* Tooltip */}
              {isSearchFocused && !searchTerm && (
                <div className="absolute top-full left-0 mt-2 z-50">
                  <div className="relative bg-orange-100 border border-orange-200 rounded-lg px-4 py-3 shadow-lg max-w-sm">
                    <div className="absolute -top-2 left-6 w-4 h-4 bg-orange-100 border-l border-t border-orange-200 transform rotate-45"></div>
                    <p className="text-sm text-orange-800">
                      Type the doctor's name to connect with an existing user or create a new one.
                    </p>
                  </div>
                </div>
              )}
            </div>
          </div>
          
          {/* Add new button */}
          <Button 
            onClick={() => {
              setSearchTerm("")
              setStep("invite")
            }}
            className="bg-[#1162a8] hover:bg-[#0f5490] text-white rounded-lg px-4 py-2 whitespace-nowrap"
          >
            Add new
          </Button>
        </div>

        {/* Sort Row */}
        <div className="flex items-center gap-2 mb-4">
          <Label className="text-sm text-gray-600">Sort By:</Label>
          <Select value={sortBy} onValueChange={setSortBy}>
            <SelectTrigger className="w-32">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="name-az">Name A-Z</SelectItem>
              <SelectItem value="name-za">Name Z-A</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Count */}
        <div className="flex items-center justify-end mb-6">
          <p className="text-sm text-gray-500">
            {filteredDoctors.length} doctor{filteredDoctors.length !== 1 ? 's' : ''} found
          </p>
        </div>

        {/* Doctors Grid - Only show when no search term */}
        <div className="mb-8">
          {!searchTerm && (
            <>
              {isLoading ? (
                <div className="flex items-center justify-center py-12">
                  <div className="text-center">
                    <Loader2 className="w-8 h-8 animate-spin mx-auto mb-4 text-blue-600" />
                    <p className="text-gray-500">Loading doctors...</p>
                  </div>
                </div>
              ) : error ? (
                <div className="flex items-center justify-center py-12">
                  <div className="text-center">
                    <AlertCircle className="w-8 h-8 mx-auto mb-4 text-red-500" />
                    <p className="text-red-600 mb-2">{error}</p>
                    <Button 
                      variant="outline" 
                      size="sm" 
                      onClick={() => {
                        setError(null)
                        searchDoctors(searchTerm)
                      }}
                    >
                      Try Again
                    </Button>
                  </div>
                </div>
              ) : filteredDoctors.length === 0 ? (
                <div className="flex items-center justify-center py-12">
                  <div className="text-center">
                    <p className="text-gray-500 mb-4">No doctors found</p>
                    <p className="text-sm text-gray-400">Try searching for a specific doctor or invite a new one</p>
                  </div>
                </div>
              ) : (
                <div className="grid grid-cols-4 gap-6">
                  {filteredDoctors.map((doctor) => (
                <div
                  key={doctor.id}
                  className={`p-6 border rounded-lg text-center cursor-pointer transition-all ${
                    doctor.status === "requested"
                      ? "border-orange-300 bg-orange-50"
                      : "border-gray-200 hover:border-blue-400 hover:bg-blue-50"
                  }`}
                  onClick={() => handleDoctorSelect(doctor)}
                >
                  <div className="w-20 h-20 mx-auto mb-4 bg-gray-200 rounded-full flex items-center justify-center">
                    {doctor.image ? (
                      <Image src={doctor.image} alt={doctor.name} width={80} height={80} className="rounded-full object-cover" />
                    ) : (
                      <div className="w-full h-full bg-gradient-to-br from-blue-400 to-blue-600 rounded-full flex items-center justify-center text-white font-medium text-lg">
                        {doctor.name.split(' ').map(n => n[0]).join('')}
                      </div>
                    )}
                  </div>
                  <h3 className="font-medium text-base mb-1">{doctor.name}, {doctor.title}</h3>
                  <p className="text-sm text-gray-500 mb-4">{doctor.email}</p>
                  {doctor.status === "requested" ? (
                    <div className="inline-flex items-center px-3 py-1 rounded-full text-xs bg-orange-100 text-orange-700">
                      Requested
                    </div>
                  ) : doctor.status === "Invited" || doctor.userStatus === "Invited" ? (
                    <div className="inline-flex items-center px-3 py-1 rounded-full text-xs bg-yellow-100 text-yellow-700">
                      Invited
                    </div>
                  ) : (
                    <Button
                      size="sm"
                      className="bg-blue-600 hover:bg-blue-700 text-white text-sm px-4 py-2"
                    >
                      Request connection
                    </Button>
                  )}
                </div>
                  ))}
                </div>
              )}
            </>
          )}
          
          {/* Show message when searching */}
          {searchTerm && (
            <div className="flex flex-col items-center justify-center py-12">
              <p className="text-gray-500 text-center">
                Search results appear in the dropdown above
              </p>
            </div>
          )}
        </div>

        {/* Cancel Button */}
        <div className="flex justify-end mt-8">
          <Button
            variant="outline"
            className="bg-red-600 text-white hover:bg-red-700 border-red-600"
            onClick={handleClose}
          >
            Cancel
          </Button>
        </div>
      </div>
    </>
  )

  // Only need the search step since other steps are now separate modals
  const renderContent = () => {
    return renderSearchStep()
  }

  if (!isOpen) return null

  return (
    <>
      {/* Main Modal - Match AddNewLabModal z-index pattern */}
      <div className="fixed inset-0 z-[10001] bg-black/50" onClick={handleClose} />
      <div className="fixed left-1/2 top-1/2 z-[10002] w-[95vw] max-w-[1600px] max-h-[90vh] -translate-x-1/2 -translate-y-1/2 bg-white rounded-lg shadow-lg overflow-hidden">
        {/* Header with close button */}
        <div className="px-6 py-4 border-b border-gray-200 bg-blue-600">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-semibold text-white">Add a Doctor</h2>
            <button
              onClick={handleClose}
              className="text-white hover:text-gray-200 transition-colors"
            >
              <X className="w-6 h-6" />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="overflow-y-auto max-h-[calc(90vh-80px)]">
          {renderContent()}
        </div>
      </div>

      {/* Connect Modal */}
      {step === "connect" && selectedDoctor && (
        <>
          <div className="fixed inset-0 z-[10003] bg-black/50" onClick={() => setStep("search")} />
          <div className="fixed left-1/2 top-1/2 z-[10004] w-full max-w-lg -translate-x-1/2 -translate-y-1/2 bg-white rounded-lg shadow-lg overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-200 bg-blue-600 text-white">
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-semibold">Connect to Doctor</h2>
                <button
                  onClick={() => setStep("search")}
                  className="text-white hover:text-gray-200 transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>
            <div className="p-6">
              <div className="mb-6">
                <p className="text-gray-700 mb-2">Choose how you'd like to connect this doctor.</p>
                <p className="text-sm text-gray-500">You can send a request only, or send a request and submit the case at the same time.</p>
              </div>

              <div className="flex gap-3">
                <Button
                  variant="outline"
                  className="flex-1 border-gray-300 text-gray-700 hover:bg-gray-50"
                  onClick={() => setStep("search")}
                >
                  Cancel
                </Button>
                <Button
                  variant="outline"
                  className="flex-1 border-gray-300 text-gray-700 hover:bg-gray-50"
                  onClick={() => handleConnect("request")}
                >
                  Send Request and Submit
                </Button>
                <Button
                  className="flex-1 bg-blue-600 hover:bg-blue-700 text-white"
                  onClick={() => handleConnect("request")}
                >
                  Send Request only
                </Button>
              </div>
            </div>
          </div>
        </>
      )}

      {/* Sending Modal */}
      {step === "sending" && (
        <>
          <div className="fixed inset-0 z-[10005] bg-black/50" />
          <div className="fixed left-1/2 top-1/2 z-[10006] w-full max-w-md -translate-x-1/2 -translate-y-1/2 bg-white rounded-lg shadow-lg overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-200 bg-blue-600 text-white">
              <h2 className="text-lg font-semibold">
                {connectType === "request" ? "Sending connection request" : "Sending invitation"}
              </h2>
            </div>
            <div className="p-6 text-center">
              <p className="text-gray-700 mb-4">
                {connectType === "request" 
                  ? "Please wait while we send your connection request to the doctor."
                  : "Please wait while we send the invitation to the doctor."
                }
              </p>
              <div className="flex justify-center">
                <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
              </div>
            </div>
          </div>
        </>
      )}

      {/* Success Modal */}
      {step === "success" && (
        <>
          <div className="fixed inset-0 z-[10007] bg-black/50" />
          <div className="fixed left-1/2 top-1/2 z-[10008] w-full max-w-md -translate-x-1/2 -translate-y-1/2 bg-white rounded-lg shadow-lg overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-200 bg-green-600 text-white">
              <h2 className="text-lg font-semibold">
                {connectType === "request" ? "Connection Request Sent!" : "Invitation Sent!"}
              </h2>
            </div>
            <div className="p-6 text-center">
              <div className="mb-4">
                <div className="w-16 h-16 bg-green-500 rounded-full flex items-center justify-center mx-auto">
                  <CheckCircle className="w-8 h-8 text-white" />
                </div>
              </div>
              <p className="text-lg font-semibold text-gray-900 mb-4">
                {connectType === "request" ? "Request Sent!" : "Invitation Sent!"}
              </p>
              <p className="text-sm text-gray-600 mb-4">
                {connectType === "request" 
                  ? "The doctor will be notified of your connection request."
                  : "The doctor will receive an email invitation to join."
                }
              </p>
              <Button onClick={handleClose} className="bg-blue-600 hover:bg-blue-700">
                Done
              </Button>
            </div>
          </div>
        </>
      )}

      {/* Invite Modal */}
      {step === "invite" && (
        <>
          <div className="fixed inset-0 z-[10009] bg-black/50" onClick={() => setStep("search")} />
          <div className="fixed left-1/2 top-1/2 z-[10010] w-full max-w-2xl -translate-x-1/2 -translate-y-1/2 bg-white rounded-lg shadow-lg overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-200 bg-blue-600 text-white">
              <h2 className="text-lg font-semibold">Invite new doctor</h2>
            </div>
            <div className="p-8">
              <div className="bg-blue-50 p-4 rounded-lg mb-6 border border-blue-200">
                <p className="text-sm text-gray-700 mb-2 font-medium">Invite a new doctor during slip creation</p>
                <p className="text-xs text-gray-600">
                  The doctor will be created immediately with "Invited" status. You can use them in slip creation right away, even before they accept the invitation.
                </p>
              </div>

              <div className="space-y-4 mb-8">
                <div className="grid grid-cols-2 gap-4">
                  <Input
                    placeholder="Name"
                    value={inviteForm.name}
                    onChange={(e) => setInviteForm(prev => ({...prev, name: e.target.value}))}
                    className="py-3"
                  />
                  <Input
                    placeholder="Email Address *"
                    value={inviteForm.email}
                    onChange={(e) => setInviteForm(prev => ({...prev, email: e.target.value}))}
                    className="py-3"
                  />
                </div>
              </div>

              <div className="flex gap-4">
                <Button
                  variant="outline"
                  className="flex-1"
                  onClick={() => setStep("search")}
                >
                  Cancel
                </Button>
                <Button
                  variant="outline"
                  className="flex-1"
                  onClick={() => handleInviteSubmit(true)}
                  disabled={isInvitationLoading}
                >
                  Send Invite and Submit
                </Button>
                <Button
                  className="flex-1 bg-blue-600 hover:bg-blue-700"
                  onClick={() => handleInviteSubmit(false)}
                  disabled={isInvitationLoading}
                >
                  {isInvitationLoading ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Sending...
                    </>
                  ) : (
                    "Send Invite only"
                  )}
                </Button>
              </div>
            </div>
          </div>
        </>
      )}

      {/* Custom Toast - appears in front of modal */}
      {customToast && (
        <div className="fixed top-4 right-4 z-[99999] animate-in slide-in-from-top-2 duration-300">
          <div 
            className={`${
              customToast.variant === "destructive" 
                ? "border-red-500 bg-red-50 text-red-900" 
                : "border-blue-500 bg-blue-50 text-blue-900"
            } shadow-lg rounded-lg border p-4 max-w-sm`}
          >
            <div className="flex items-start space-x-3">
              <div className="flex-1">
                <div className="font-semibold text-sm">{customToast.title}</div>
                <div className="text-sm mt-1 opacity-90">{customToast.description}</div>
              </div>
              <button
                onClick={() => setCustomToast(null)}
                className="text-gray-400 hover:text-gray-600 transition-colors flex-shrink-0"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}