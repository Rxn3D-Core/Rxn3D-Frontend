"use client"

import type React from "react"
import React from "react"

import { useState, useEffect, useRef } from "react"
import { useRouter } from "next/navigation"
import { Search, X, Star, AlertCircle, Loader2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { AuthHeader } from "@/components/auth-header"
import { useInvitation } from "@/contexts/invitation-context"
import { useCustomer } from "@/contexts/customer-context"
import { useToast } from "@/hooks/use-toast"
import { SendingInvitesDialog } from "@/components/onboarding/sending-invites-dialog"
import { useOnboardingStatus } from "@/hooks/use-onboarding-status"
import { useAuth } from "@/contexts/auth-context"

interface Practice {
  id: number
  name: string
  address?: string
  email?: string
}

interface FormErrors {
  practiceName: string
  practiceEmail: string
}

export default function InvitePracticesPage() {
  const router = useRouter()
  const { user, logout } = useAuth()
  const { isOnboardingComplete, isLoading: onboardingLoading } = useOnboardingStatus()
  const [localSearchQuery, setLocalSearchQuery] = useState("")
  const [showResults, setShowResults] = useState(false)
  const [practiceName, setPracticeName] = useState("")
  const [practiceEmail, setPracticeEmail] = useState("")
  const [invitedPractices, setInvitedPractices] = useState<Practice[]>([])
  const [isButtonDisabled, setIsButtonDisabled] = useState(false)
  const [errors, setErrors] = useState<FormErrors>({
    practiceName: "",
    practiceEmail: "",
  })
  const [customerId, setCustomerId] = useState<string | null>(localStorage.getItem("customerId") || null)

  // Sending dialog state
  const [isSending, setIsSending] = useState(false)

  const searchRef = useRef<HTMLDivElement>(null)

  // Use contexts
  const { sendInvitation, isLoading: invitationLoading, error: invitationError } = useInvitation()
  const { searchResults, isLoading: searchLoading, handleSearch, clearSearch } = useCustomer()
  const { toast } = useToast()

  const [customerType, setCustomerType] = useState(localStorage.getItem("customerType"))

  useEffect(() => {
    if (typeof window !== "undefined") {
      const customerIdStored = localStorage.getItem("customerId")
      if (customerIdStored) setCustomerId(customerIdStored)
    }
  }, [])

  // Validate onboarding status - redirect if already onboarded
  // But only if we're not currently on an onboarding page (allow completing the flow)
  const hasRedirectedRef = React.useRef(false)
  useEffect(() => {
    // Prevent multiple redirects
    if (hasRedirectedRef.current) {
      return
    }

    // Don't redirect if we're in the middle of onboarding flow
    // Only redirect if onboarding was completed before reaching this page
    if (!onboardingLoading && user && isOnboardingComplete) {
      const isSuperAdmin = user.roles?.includes("superadmin")
      if (!isSuperAdmin) {
        // Check if we're on the invite-users page (part of onboarding flow)
        // If so, allow the user to complete this step before redirecting
        const currentPath = window.location.pathname
        if (currentPath.includes("/onboarding/invite-users")) {
          // Allow user to complete this step, don't redirect immediately
          return
        }
        hasRedirectedRef.current = true
        router.replace("/dashboard")
      }
    }
  }, [onboardingLoading, user, isOnboardingComplete, router])

  // Handle search input change with animation
  const handleSearchChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const query = e.target.value
    setLocalSearchQuery(query)

    if (query.length > 2) {
      await handleSearch("Office", query)
      // Add animation delay to show loading state
      setTimeout(() => {
        setShowResults(true)
      }, 300)
    } else {
      setShowResults(false)
      clearSearch()
    }
  }

  // Handle clicking outside of search results to close them
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (searchRef.current && !searchRef.current.contains(event.target as Node)) {
        setShowResults(false)
      }
    }

    document.addEventListener("mousedown", handleClickOutside)
    return () => {
      document.removeEventListener("mousedown", handleClickOutside)
    }
  }, [])

  // Validate form fields
  const validateForm = (): boolean => {
    const newErrors: FormErrors = {
      practiceName: "",
      practiceEmail: "",
    }

    let isValid = true

    if (!practiceName.trim()) {
      newErrors.practiceName = "Practice name is required"
      isValid = false
    }

    if (!practiceEmail.trim()) {
      newErrors.practiceEmail = "Email address is required"
      isValid = false
    } else if (!/\S+@\S+\.\S+/.test(practiceEmail)) {
      newErrors.practiceEmail = "Please enter a valid email address"
      isValid = false
    }

    setErrors(newErrors)
    return isValid
  }

  // Add practice to invited list from search results
  const addPractice = (practice: any) => {
    const newPractice: Practice = {
      id: practice.id,
      name: practice.name,
      address: practice.address,
      email: practice.email,
    }

    if (!invitedPractices.some((p) => p.id === practice.id)) {
      setInvitedPractices([...invitedPractices, newPractice])
    }
    setShowResults(false)
    setLocalSearchQuery("")
    clearSearch()
  }

  // Remove practice from invited list
  const removePractice = (practiceId: number) => {
    setInvitedPractices(invitedPractices.filter((practice) => practice.id !== practiceId))
  }

  // Handle manual practice addition
  const handleManualAdd = () => {
    if (validateForm()) {
      const newPractice = {
        id: Date.now(), // Use timestamp as a simple unique ID
        name: practiceName,
        email: practiceEmail,
      }

      setInvitedPractices([...invitedPractices, newPractice])

      // Disable button temporarily
      setIsButtonDisabled(true)

      // Clear form fields
      setPracticeName("")
      setPracticeEmail("")

      // Re-enable button after 2 seconds
      setTimeout(() => {
        setIsButtonDisabled(false)
      }, 2000)
    }
  }

  // Handle practice name change
  const handlePracticeNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setPracticeName(e.target.value)
    if (errors.practiceName) {
      setErrors({
        ...errors,
        practiceName: "",
      })
    }
  }

  // Handle practice email change
  const handlePracticeEmailChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setPracticeEmail(e.target.value)
    if (errors.practiceEmail) {
      setErrors({
        ...errors,
        practiceEmail: "",
      })
    }
  }

  const executeSendInvitations = async () => {
    if (!customerId) {
      toast({
        title: "Error",
        description: "Customer ID is missing. Please ensure you are logged in or have completed previous steps.",
        variant: "destructive",
      })
      setIsSending(false) 
      return
    }

    let allInvitationsSuccessful = true

    for (const practice of invitedPractices) {
      const success = await sendInvitation({
        name: practice.name,
        email: practice.email || `${practice.name.toLowerCase().replace(/\s+/g, "")}@example.com`,
        invited_by: customerId,
        type: "Office",
      })
      if (!success) {
        allInvitationsSuccessful = false
        setIsSending(false)
        toast({
          title: "Invitation Failed",
          description:
          invitationError || "Failed to send invitation to " + practice.name,
          variant: "destructive",
        })
        break 
      }
    }
   
  }

  const handleDialogComplete = () => {
    setIsSending(false)
    router.push("/onboarding/completion")
  }

  // Handle next button click
  const handleNextClick = () => {
    if (invitedPractices.length === 0) {
      toast({
        title: "No Practices to Invite",
        description: "Please add at least one practice to invite before proceeding.",
        variant: "default",
      })
      return
    }
    setIsSending(true) // Show the dialog
    executeSendInvitations() // Start sending invitations in background
  }

  return (
    <div className="flex flex-col min-h-screen bg-[#f7fbff]">
      {/* Header */}
      <AuthHeader />

      {/* Progress bar */}
      <div className="px-6 py-4 bg-white border-b">
        <div className="relative h-1 bg-[#e4e6ef] rounded-full max-w-3xl mx-auto">
          <div className="absolute h-1 w-[97%] bg-[#1162a8] rounded-full"></div>
        </div>
        <div className="text-right max-w-3xl mx-auto mt-1 text-sm">97% complete</div>
      </div>

      {/* Main content */}
      <div className="flex-1 p-6">
        <div className="max-w-3xl mx-auto">
          <div className="bg-white rounded-lg shadow p-8 mb-6">
            <div className="text-center mb-6">
              <h1 className="text-2xl font-bold mb-1">You're almost there done</h1>
              <p className="text-[#545f71]">You're almost done! Invite your partnered practice to join RXn3D</p>
            </div>

            {/* Search bar with results */}
            <div className="relative mb-6" ref={searchRef}>
              <Input
                type="text"
                placeholder="Search Office"
                className="pl-10 pr-4 py-2"
                value={localSearchQuery}
                onChange={handleSearchChange}
              />
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />

              {/* Loading indicator */}
              {searchLoading && (
                <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
                  <Loader2 className="h-4 w-4 animate-spin text-[#1162a8]" />
                </div>
              )}

              {/* Search results dropdown with animation */}
              {showResults && (
                <div className="absolute left-0 right-0 top-full mt-1 bg-white border border-gray-200 rounded-md shadow-sm z-10 max-h-60 overflow-y-auto animate-in slide-in-from-top-2 duration-300">
                  {searchLoading ? (
                    <div className="flex items-center justify-center py-4">
                      <Loader2 className="h-6 w-6 animate-spin text-[#1162a8]" />
                      <span className="ml-2 text-gray-500">Searching...</span>
                    </div>
                  ) : searchResults.length > 0 ? (
                    searchResults.map((practice, index) => (
                      <div
                        key={practice.id}
                        className={`flex items-center justify-between px-3 py-2 hover:bg-[#f2f8ff] cursor-pointer border-b border-gray-100 animate-in fade-in duration-300`}
                        style={{ animationDelay: `${index * 50}ms` }}
                        onClick={() => addPractice(practice)}
                      >
                        <div>
                          <div className="font-medium">{practice.name}</div>
                          <div className="text-sm text-gray-500">{practice.address}</div>
                        </div>
                        <button className="text-[#1162a8] hover:text-[#1162a8]/80">
                          <div className="w-6 h-6 rounded-full border border-[#1162a8] flex items-center justify-center">
                            <span className="text-[#1162a8]">+</span>
                          </div>
                        </button>
                      </div>
                    ))
                  ) : (
                    <div className="px-3 py-4 text-center text-gray-500">No offices found matching your search.</div>
                  )}
                </div>
              )}
            </div>

            {/* Manual practice entry form */}
            <div className="mb-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                <div>
                  <label htmlFor="practice-name" className="block text-sm font-medium text-gray-700 mb-1">
                    Practice name <span className="text-red-500">*</span>
                  </label>
                  <Input
                    id="practice-name"
                    type="text"
                    value={practiceName}
                    onChange={handlePracticeNameChange}
                    className={`w-full ${errors.practiceName ? "border-red-500" : ""}`}
                  />
                  {errors.practiceName && (
                    <div className="flex items-center mt-1 text-red-500 text-xs">
                      <AlertCircle className="h-3 w-3 mr-1" />
                      {errors.practiceName}
                    </div>
                  )}
                </div>
                <div>
                  <label htmlFor="email-address" className="block text-sm font-medium text-gray-700 mb-1">
                    Email Address <span className="text-red-500">*</span>
                  </label>
                  <Input
                    id="email-address"
                    type="email"
                    value={practiceEmail}
                    onChange={handlePracticeEmailChange}
                    className={`w-full ${errors.practiceEmail ? "border-red-500" : ""}`}
                  />
                  {errors.practiceEmail && (
                    <div className="flex items-center mt-1 text-red-500 text-xs">
                      <AlertCircle className="h-3 w-3 mr-1" />
                      {errors.practiceEmail}
                    </div>
                  )}
                </div>
              </div>
              <div className="flex justify-end">
                <Button
                  onClick={handleManualAdd}
                  className="bg-[#1162a8] hover:bg-[#1162a8]/90 border border-[#1162a8]"
                  disabled={isButtonDisabled}
                >
                  {isButtonDisabled ? "Practice Added" : "Add Practice"}
                </Button>
              </div>
            </div>

            {/* Invited practices section */}
            {invitedPractices.length > 0 && (
              <div className="bg-[#f2f8ff] p-4 rounded-md mb-6">
                <h3 className="text-center font-medium mb-4">Practices to Invite</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {invitedPractices.map((practice) => (
                    <div
                      key={practice.id}
                      className="flex items-center justify-between bg-white border border-gray-200 rounded-md px-3 py-2"
                    >
                      <div className="flex items-center">
                        <Star className="h-4 w-4 text-[#ff9900] mr-2 fill-[#ff9900]" />
                        <span className="text-sm">{practice.name}</span>
                      </div>
                      <button
                        onClick={() => removePractice(practice.id)}
                        className="text-[#cf0202] hover:text-[#cf0202]/80"
                      >
                        <X className="h-4 w-4" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Navigation buttons */}
          <div className="flex justify-end space-x-3">
            <Button
              variant="outline"
              className="bg-[#eef1f4] border-[#eef1f4] hover:bg-[#dfeefb] hover:border-[#dfeefb]"
              onClick={() => {
                setTimeout(() => {
                  logout()
                }, 0)
              }}
            >
              Continue Later
            </Button>
            <Button
              variant="outline"
              className="bg-[#eef1f4] border-[#eef1f4] hover:bg-[#dfeefb] hover:border-[#dfeefb]"
              onClick={() => router.replace(customerType === "Office" ? "/onboarding/business-hours" : "/onboarding/product-grades")}
            >
              Previous
            </Button>
            <Button
              className="bg-[#1162a8] hover:bg-[#1162a8]/90 border border-[#1162a8]"
              onClick={handleNextClick}
              disabled={isSending || invitationLoading}
            >
              {isSending || invitationLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Sending...
                </>
              ) : (
                "Next"
              )}
            </Button>
          </div>
        </div>
      </div>

      {/* Sending Dialog - Now a reusable component */}
      <SendingInvitesDialog isOpen={isSending} onComplete={handleDialogComplete} practices={invitedPractices} />
    </div>
  )
}
