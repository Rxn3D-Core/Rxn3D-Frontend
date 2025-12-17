import { useCallback, useEffect } from 'react'
import { useLabModalStore } from '@/stores/lab-modal-store'
import { useInvitation } from '@/contexts/invitation-context'
import {
  labSearchSchema,
  labInviteSchema,
  labConnectionSchema,
  type LabSearchInput,
  type LabInviteInput,
  type LabConnectionInput,
  type LabApiResponse,
  type LabsApiResponse
} from '@/lib/validations/lab-modal'

const API_BASE_URL = "http://localhost:3000/api"

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

  // Search labs with validation
  const searchLabs = useCallback(async (searchQuery: string = "") => {
    // Validate search input
    const searchInput: LabSearchInput = {
      searchTerm: searchQuery,
      sortBy: sortBy as "location" | "name-az" | "name-za"
    }

    try {
      labSearchSchema.parse(searchInput)
    } catch (error) {
      setError("Invalid search parameters")
      return
    }

    setIsLoading(true)
    setError(null)

    try {
      const token = localStorage.getItem("token")
      if (!token) {
        throw new Error("No authentication token found")
      }

      const userStr = localStorage.getItem("user")
      if (!userStr) {
        throw new Error("No user information found")
      }

      const user = JSON.parse(userStr)
      const customerId = user.customers?.[0]?.id

      if (!customerId) {
        throw new Error("No customer ID found")
      }

      // Build query parameters - search for lab_admin users
      const params = new URLSearchParams({
        customer_id: customerId.toString(),
        role: "lab_admin",
        status: "Active",
        per_page: "50"
      })

      if (searchQuery.trim()) {
        params.append("q", searchQuery.trim())
      }

      const response = await fetch(`${API_BASE_URL}/users?${params}`, {
        method: "GET",
        headers: {
          "Authorization": `Bearer ${token}`,
          "Content-Type": "application/json",
        },
      })

      if (!response.ok) {
        throw new Error(`Failed to search labs: ${response.status}`)
      }

      const data: LabsApiResponse = await response.json()

      // Transform the API response to match our Lab interface
      const labs = data.data?.map((user: LabApiResponse) => ({
        id: user.id.toString(),
        name: user.full_name || `${user.first_name || ""} ${user.last_name || ""}`.trim(),
        location: user.customers?.[0]?.address || "Location not specified",
        logo: user.profile_image || "/images/office-default.png",
        email: user.email,
        phone: user.phone,
        address: user.customers?.[0]?.address,
        status: "available" as const
      })) || []

      setLabs(labs)

      // Show toast if no results found and user was searching
      if (searchQuery.trim() && labs.length === 0) {
        showCustomToast("No Results Found", `No labs found for "${searchQuery}"`, "destructive")
      }
    } catch (err: any) {
      console.error("Error searching labs:", err)
      const errorMessage = err.message || "Failed to search labs"
      setError(errorMessage)
      setLabs([])

      // Show toast error message
      showCustomToast("Search Error", errorMessage, "destructive")
    } finally {
      setIsLoading(false)
    }
  }, [sortBy, setLabs, setIsLoading, setError, showCustomToast])

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
