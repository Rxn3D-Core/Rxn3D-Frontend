import { useCallback, useEffect } from 'react'
import { useLabModalStore } from '@/stores/lab-modal-store'
import { useInvitation } from '@/contexts/invitation-context'
import {
  labInviteSchema,
  labConnectionSchema,
  type LabInviteInput,
  type LabConnectionInput,
} from '@/lib/validations/lab-modal'

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:3000"

export const useLabModal = () => {
  const store = useLabModalStore()
  const { sendInvitation, isLoading: isInvitationLoading } = useInvitation()

  // Destructure needed values from store to stabilize dependencies
  const {
    sortBy,
    setLabs,
    setIsLoading,
    setError,
    showCustomToast
  } = store

  // Search labs - fetch connected labs/offices
  const searchLabs = useCallback(async (searchQuery: string = "") => {
    setIsLoading(true)
    setError(null)

    try {
      const token = localStorage.getItem("token")
      if (!token) {
        throw new Error("No authentication token found")
      }

      // Get role from localStorage to determine endpoint
      const role = localStorage.getItem("role") || ""
      
      // Use the same logic as choose-lab page
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
        const location = lab.location || item.location || ""
        const city = lab.city || item.city || ""
        const state = lab.state || item.state || ""
        const locationString = location || (city && state ? `${city}, ${state}` : city || state || "Location not specified")
        
        return {
          id: lab.id?.toString() || item.id?.toString() || "",
          name: lab.name || item.name || "",
          location: locationString,
          logo: lab.logo_url || lab.logo || item.logo || lab.image || item.image || "/images/office-default.png",
          email: lab.email || item.email || "",
          phone: lab.phone || item.phone || "",
          address: lab.address || item.address || locationString,
          isConnected: item.is_favorite || false,
          status: item.is_favorite ? "connected" as const : "available" as const
        }
      })

      setLabs(labsList)

      // Show toast if no results found and user was searching
      if (searchQuery.trim() && labsList.length === 0) {
        showCustomToast("No Results Found", `No labs found for "${searchQuery}"`, "destructive")
      }
    } catch (err: any) {
      console.error("Error searching labs:", err)
      const errorMessage = err.message || "Failed to fetch labs"
      setError(errorMessage)
      setLabs([])

      // Show toast error message
      showCustomToast("Search Error", errorMessage, "destructive")
    } finally {
      setIsLoading(false)
    }
  }, [setLabs, setIsLoading, setError, showCustomToast])

  // Send lab invitation with validation
  const sendLabInvitation = useCallback(async (inviteData: LabInviteInput) => {
    // Validate invitation data
    try {
      labInviteSchema.parse(inviteData)
    } catch (error) {
      if (error instanceof Error) {
        store.showCustomToast("Validation Error", error.message, "destructive")
        return false
      }
      return false
    }

    try {
      const userStr = localStorage.getItem("user")
      if (!userStr) {
        throw new Error("No user information found. Please log in again.")
      }

      const user = JSON.parse(userStr)
      const invitedBy = user.id.toString()

      const success = await sendInvitation({
        name: inviteData.name.trim(),
        email: inviteData.email.trim(),
        invited_by: invitedBy,
        type: "Lab"
      })

      if (success) {
        store.showCustomToast("Invitation Sent", `Invitation sent to ${inviteData.name}`)
        return true
      } else {
        store.showCustomToast("Failed to Send Invitation", "Please check the email address and try again", "destructive")
        return false
      }
    } catch (error: any) {
      console.error("Error sending invitation:", error)
      store.showCustomToast("Error", error.message || "Failed to send invitation. Please try again.", "destructive")
      return false
    }
  }, [store, sendInvitation])

  // Send connection request with validation
  const sendConnectionRequest = useCallback(async (connectionData: LabConnectionInput) => {
    // Validate connection data
    try {
      labConnectionSchema.parse(connectionData)
    } catch (error) {
      if (error instanceof Error) {
        store.showCustomToast("Validation Error", error.message, "destructive")
        return false
      }
      return false
    }

    try {
      const userStr = localStorage.getItem("user")
      if (!userStr) {
        throw new Error("No user information found. Please log in again.")
      }

      const user = JSON.parse(userStr)
      const invitedBy = user.id.toString()

      const success = await sendInvitation({
        name: connectionData.labName,
        email: connectionData.labEmail,
        invited_by: invitedBy,
        type: "Lab"
      })

      if (success) {
        store.showCustomToast("Connection Request Sent", `Connection request sent to ${connectionData.labName}`)

        // Update lab status to "requested"
        const updatedLabs = store.labs.map(lab =>
          lab.id === connectionData.labId
            ? { ...lab, status: "requested" as const }
            : lab
        )
        store.setLabs(updatedLabs)

        return true
      } else {
        store.showCustomToast("Failed to Send Request", "Unable to send connection request. Please try again.", "destructive")
        return false
      }
    } catch (error: any) {
      console.error("Error sending connection request:", error)
      store.showCustomToast("Error", error.message || "Failed to send connection request. Please try again.", "destructive")
      return false
    }
  }, [store, sendInvitation])

  // Handle invite form submission
  const handleInviteSubmit = useCallback(async (submitCase: boolean = false) => {
    const inviteData: LabInviteInput = {
      name: store.inviteLabName,
      email: store.inviteEmail
    }

    store.setShowInviteModal(false)
    store.setIsSendingRequest(true)

    const success = await sendLabInvitation(inviteData)

    if (success) {
      store.setIsSendingRequest(false)
      store.setRequestSent(true)
      setTimeout(() => {
        store.setRequestSent(false)
        store.setOpen(false)
      }, 2000)
    } else {
      store.setIsSendingRequest(false)
    }
  }, [store, sendLabInvitation])

  // Handle connection request
  const handleConnectionRequest = useCallback(async (sendAndSubmit: boolean = false) => {
    if (!store.selectedLabForConnection) return

    const connectionData: LabConnectionInput = {
      labId: store.selectedLabForConnection.id,
      labName: store.selectedLabForConnection.name,
      labEmail: store.selectedLabForConnection.email || ""
    }

    store.setIsSendingRequest(true)

    const success = await sendConnectionRequest(connectionData)

    if (success) {
      store.setIsSendingRequest(false)
      store.setRequestSent(true)
      setTimeout(() => {
        store.setShowConnectionModal(false)
        store.setRequestSent(false)
        store.setSelectedLabForConnection(null)
      }, 1500)
    } else {
      store.setIsSendingRequest(false)
    }
  }, [store, sendConnectionRequest])

  // Debounced search effect
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      if (store.isOpen) {
        searchLabs(store.searchTerm)
      }
    }, 300)

    return () => clearTimeout(timeoutId)
  }, [store.searchTerm, store.isOpen, searchLabs])

  // Show initial search when modal opens
  useEffect(() => {
    if (store.isOpen && !store.searchTerm) {
      searchLabs()
    }
  }, [store.isOpen, searchLabs])

  // Retry search function
  const retrySearch = useCallback(() => {
    store.setError(null)
    searchLabs(store.searchTerm)
  }, [store, searchLabs])

  return {
    // Store state
    ...store,

    // Computed values
    sortedLabs: store.getSortedLabs(),

    // Actions
    searchLabs,
    sendLabInvitation,
    sendConnectionRequest,
    handleInviteSubmit,
    handleConnectionRequest,
    retrySearch,

    // Loading states
    isInvitationLoading,
  }
}
