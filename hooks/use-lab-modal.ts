import { useCallback, useEffect } from 'react'
import { useLabModalStore, type Lab } from '@/stores/lab-modal-store'
import { useInvitation } from '@/contexts/invitation-context'
import {
  labInviteSchema,
  labConnectionSchema,
  type LabInviteInput,
  type LabConnectionInput,
} from '@/lib/validations/lab-modal'

function isLabAdminContext(): boolean {
  const role = (localStorage.getItem("role") || "").toLowerCase()
  const customerType = (localStorage.getItem("customerType") || "").toLowerCase()
  return role === "lab_admin" || customerType === "lab"
}

function mapConnectionStatus(raw: unknown): Lab["status"] {
  // Customer account status ("Active") is NOT a connection status — only treat
  // explicit connection / invite states as connected or pending.
  if (raw == null) return "available"
  const value = String(raw).toLowerCase().trim()
  if (
    raw === 1 ||
    value === "1" ||
    value === "connected" ||
    value === "accepted" ||
    value === "active_connection"
  ) {
    return "connected"
  }
  if (
    raw === 3 ||
    value === "3" ||
    value === "pending" ||
    value === "requested" ||
    value === "invited"
  ) {
    return "requested"
  }
  return "available"
}

function resolveSearchHitConnectionStatus(item: any, connectedIds: Set<string>): Lab["status"] {
  const id = String(item.id ?? "")
  if (id && connectedIds.has(id)) return "connected"

  const connectionRaw =
    item.connection_status ??
    item.invitation_status ??
    item.invite_status ??
    item.connectionStatus ??
    null

  return mapConnectionStatus(connectionRaw)
}

function mapCustomerSearchHit(item: any, connectedIds: Set<string> = new Set()): Lab {
  const city = item.city || ""
  const state = item.state?.name || item.state || ""
  const location =
    item.address ||
    (city && state ? `${city}, ${state}` : city || state || "Location not specified")
  const status = resolveSearchHitConnectionStatus(item, connectedIds)

  return {
    id: String(item.id ?? ""),
    name: item.name || "",
    location,
    logo: item.logo_url || item.logo || item.image || "/images/office-default.png",
    email: item.email || "",
    phone: item.phone || "",
    address: item.address || location,
    isConnected: status === "connected",
    status,
  }
}

function mapConnectedHit(item: any): Lab {
  const lab = item.lab || item.office || item
  const location = lab.location || item.location || ""
  const city = lab.city || item.city || ""
  const state = lab.state || item.state || ""
  const locationString =
    location || (city && state ? `${city}, ${state}` : city || state || "Location not specified")

  return {
    id: lab.id?.toString() || item.id?.toString() || "",
    name: lab.name || item.name || "",
    location: locationString,
    logo: lab.logo_url || lab.logo || item.logo || lab.image || item.image || "/images/office-default.png",
    email: lab.email || item.email || "",
    phone: lab.phone || item.phone || "",
    address: lab.address || item.address || locationString,
    isConnected: true,
    status: "connected" as const,
  }
}

function getInvitedByCustomerId(): string {
  try {
    const selectedLocation = JSON.parse(localStorage.getItem("selectedLocation") || "null")
    if (selectedLocation?.id != null) return String(selectedLocation.id)
  } catch {
    // ignore parse errors
  }
  const customerId = localStorage.getItem("customerId")
  if (customerId) return customerId
  try {
    const user = JSON.parse(localStorage.getItem("user") || "null")
    return user?.id != null ? String(user.id) : ""
  } catch {
    return ""
  }
}

export const useLabModal = () => {
  const store = useLabModalStore()
  const { sendInvitation, isLoading: isInvitationLoading } = useInvitation()

  // Destructure needed values from store to stabilize dependencies
  const {
    setLabs,
    setIsLoading,
    setError,
    showCustomToast
  } = store

  /**
   * Empty query → connected labs/offices (partners already linked for slip creation).
   * Typed query → platform customer search so existing + pending-invite labs appear
   * and can receive a connection invitation.
   */
  const searchLabs = useCallback(async (searchQuery: string = "") => {
    setIsLoading(true)
    setError(null)

    try {
      const token = localStorage.getItem("token")
      if (!token) {
        throw new Error("No authentication token found")
      }

      const searchingOffices = isLabAdminContext()
      const trimmed = searchQuery.trim()

      let labsList: Lab[] = []

      if (trimmed) {
        // Same URL shape as dashboard customer-context handleSearch / CustomerSearchBox.
        // Do not use `new URL("/customers/...", base)` — that drops `/v1` from the API base.
        const entityType = searchingOffices ? "Office" : "Lab"
        const apiBase = (process.env.NEXT_PUBLIC_API_BASE_URL || "").replace(/\/$/, "")
        const searchUrl =
          `${apiBase}/customers/search` +
          `?q=${encodeURIComponent(trimmed)}` +
          `&type=${encodeURIComponent(entityType)}` +
          `&per_page=25`

        // Load real connections so we don't treat customer "Active" as Connected.
        const connectedEndpoint = searchingOffices
          ? "/v1/slip/connected-offices"
          : "/v1/slip/connected-labs"
        const connectedUrl = new URL(connectedEndpoint, process.env.NEXT_PUBLIC_API_BASE_URL || "")

        const [searchResponse, connectedResponse] = await Promise.all([
          fetch(searchUrl, {
            method: "GET",
            headers: {
              Authorization: `Bearer ${token}`,
              "Content-Type": "application/json",
            },
          }),
          fetch(connectedUrl.toString(), {
            method: "GET",
            headers: {
              Authorization: `Bearer ${token}`,
              "Content-Type": "application/json",
            },
          }),
        ])

        if (searchResponse.status === 401 || connectedResponse.status === 401) {
          window.location.href = "/login"
          throw new Error("Unauthorized")
        }

        if (!searchResponse.ok) {
          throw new Error(`Failed to search ${entityType.toLowerCase()}s: ${searchResponse.status}`)
        }

        const searchData = await searchResponse.json()
        const connectedIds = new Set<string>()
        if (connectedResponse.ok) {
          const connectedData = await connectedResponse.json()
          for (const item of connectedData.data || []) {
            const entity = item.lab || item.office || item
            const id = entity?.id ?? item.id
            if (id != null) connectedIds.add(String(id))
          }
        }

        labsList = (searchData.data || []).map((item: any) =>
          mapCustomerSearchHit(item, connectedIds),
        )
      } else {
        // Same connected partners fetch as choose-lab / prior modal behavior.
        const endpoint = searchingOffices
          ? "/v1/slip/connected-offices"
          : "/v1/slip/connected-labs"
        const apiBase = process.env.NEXT_PUBLIC_API_BASE_URL || ""
        const url = new URL(endpoint, apiBase)

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
        labsList = (data.data || []).map(mapConnectedHit)
      }

      setLabs(labsList)
      // Empty typed search is fine — the Invite option remains available in the UI.
    } catch (err: any) {
      console.error("Error searching labs:", err)
      const errorMessage = err.message || "Failed to fetch labs"
      setError(errorMessage)
      setLabs([])
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
      const invitedBy = getInvitedByCustomerId()
      if (invitedBy === "" || invitedBy == null) {
        throw new Error("No customer selected. Please select a location first.")
      }

      const success = await sendInvitation({
        name: inviteData.name.trim(),
        email: inviteData.email.trim(),
        invited_by: invitedBy,
        type: isLabAdminContext() ? "Office" : "Lab"
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
      const invitedBy = getInvitedByCustomerId()
      if (invitedBy === "" || invitedBy == null) {
        throw new Error("No customer selected. Please select a location first.")
      }

      const success = await sendInvitation({
        name: connectionData.labName,
        email: connectionData.labEmail,
        invited_by: invitedBy,
        type: isLabAdminContext() ? "Office" : "Lab"
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
  const handleInviteSubmit = useCallback(async (_submitCase: boolean = false) => {
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

  // Handle connection request (send request only; closes the modal after success).
  const handleConnectionRequest = useCallback(async () => {
    const lab = store.selectedLabForConnection
    if (!lab) return

    const connectionData: LabConnectionInput = {
      labId: lab.id,
      labName: lab.name,
      labEmail: lab.email || ""
    }

    store.setIsSendingRequest(true)

    const success = await sendConnectionRequest(connectionData)

    if (success) {
      store.setIsSendingRequest(false)
      store.setRequestSent(true)
      store.setShowConnectionModal(false)
      setTimeout(() => {
        store.setRequestSent(false)
        store.setSelectedLabForConnection(null)
        store.setOpen(false)
      }, 1500)
      return
    }

    store.setIsSendingRequest(false)
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
