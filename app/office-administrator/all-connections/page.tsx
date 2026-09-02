"use client"

import { useState, useEffect, useRef } from "react"
import { Filter, Search } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { ConnectionTabs } from "@/components/lab-administrator/connections/connection-tabs"
import { ConnectionsTable } from "@/components/lab-administrator/connections/connections-table"
import { NewConnectionModal } from "@/components/lab-administrator/connections/new-connection-modal"
import { ProfileModal } from "@/components/lab-administrator/connections/profile-modal"
import { useInvitation } from "@/contexts/invitation-context"
import { useAuth } from "@/contexts/auth-context"
import { useToast } from "@/components/ui/use-toast"
import { fetchProfileData } from "@/lib/api-profile"
import { Skeleton } from "@/components/ui/skeleton"
import { getPrimaryRole } from "@/lib/get-primary-role"
import { useConnections } from "@/hooks/use-connections"
import { DEFAULT_CONNECTIONS_PER_PAGE } from "@/lib/connection-api"
import { ConnectionListPagination } from "@/components/dashboard/connection-list-pagination"
import {
  getConnectionPartnerEmail,
  getConnectionPartnerId,
  getConnectionPartnerLocation,
  getConnectionPartnerName,
} from "@/lib/connection-utils"

export default function AllConnections() {
  const { user } = useAuth()
  const { toast } = useToast()
  const { sent, received, fetchAllInvitations, resendInvitation, deleteInvitation, acceptInvitation, cancelInvitation } = useInvitation()

  const [activeTab, setActiveTab] = useState<"connected" | "sent" | "received">("connected")
  const [showNewConnectionModal, setShowNewConnectionModal] = useState(false)
  const [showProfileModal, setShowProfileModal] = useState(false)
  const [selectedProfile, setSelectedProfile] = useState<any>(null)
  const [searchTerm, setSearchTerm] = useState("")
  const [debouncedSearch, setDebouncedSearch] = useState("")
  const [connectedPage, setConnectedPage] = useState(1)
  const [isLoadingProfile, setIsLoadingProfile] = useState(false)

  const selectedLocation = JSON.parse(localStorage.getItem("selectedLocation") || "null")
  const invitedBy = user?.roles?.includes("superadmin") ? 0 : selectedLocation?.id
  const hasFetchedRef = useRef(false)
  const role = getPrimaryRole(user)
  const isLabSide = role === "lab_admin" || role === "lab_user" || role === "superadmin"

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(searchTerm), 300)
    return () => clearTimeout(timer)
  }, [searchTerm])

  useEffect(() => {
    setConnectedPage(1)
  }, [debouncedSearch, activeTab])

  const {
    data: connectionsData,
    isLoading: isLoadingConnections,
    error: connectionsError,
  } = useConnections(user?.id, {
    page: connectedPage,
    perPage: DEFAULT_CONNECTIONS_PER_PAGE,
    search: debouncedSearch,
    enabled: activeTab === "connected",
  })

  useEffect(() => {
    if (invitedBy !== undefined && invitedBy !== null && !hasFetchedRef.current) {
      fetchAllInvitations(invitedBy)
      hasFetchedRef.current = true
    }
  }, [invitedBy, fetchAllInvitations])

  const practices = connectionsData?.practices || []
  const labs = connectionsData?.labs || []
  const connectionsPagination = connectionsData?.pagination

  const handleViewProfile = async (connection: any) => {
    setShowProfileModal(true)
    setIsLoadingProfile(true)
    setSelectedProfile(null)

    try {
      let profileType: "Office" | "Lab" = "Office"
      if (connection.type === "Lab") profileType = "Lab"

      const profileData = await fetchProfileData(connection.id, profileType)
      setSelectedProfile({ ...profileData, type: profileType === "Office" ? "Office" : "Lab" })
    } catch (error) {
      console.error("Error fetching profile:", error)
      toast({
        title: "Error",
        description: "Failed to load profile. Please try again.",
        variant: "destructive",
      })
    } finally {
      setIsLoadingProfile(false)
    }
  }

  const handleNewConnection = (_data: any) => {}

  const handleAcceptConnection = async (id: string) => {
    try {
      await acceptInvitation(parseInt(id), "")
      await fetchAllInvitations(invitedBy)
      toast({ title: "Success", description: "Connection request accepted successfully." })
    } catch (error) {
      console.error("Error accepting connection:", error)
      toast({ title: "Error", description: "Failed to accept connection. Please try again.", variant: "destructive" })
    }
  }

  const handleRejectConnection = async (id: string) => {
    try {
      await cancelInvitation(parseInt(id))
      await fetchAllInvitations(invitedBy)
      toast({ title: "Success", description: "Connection request rejected successfully." })
    } catch (error) {
      console.error("Error rejecting connection:", error)
      toast({ title: "Error", description: "Failed to reject connection. Please try again.", variant: "destructive" })
    }
  }

  const handleDeleteConnection = async (id: string) => {
    try {
      await deleteInvitation(parseInt(id))
      await fetchAllInvitations(invitedBy)
      toast({ title: "Success", description: "Connection deleted successfully." })
    } catch (error) {
      console.error("Error deleting connection:", error)
      toast({ title: "Error", description: "Failed to delete connection. Please try again.", variant: "destructive" })
    }
  }

  const handleResendInvitation = async (id: string, email: string) => {
    try {
      await resendInvitation(parseInt(id), email)
      toast({ title: "Success", description: "Invitation resent successfully." })
    } catch (error) {
      console.error("Error resending invitation:", error)
      toast({ title: "Error", description: "Failed to resend invitation. Please try again.", variant: "destructive" })
    }
  }

  const getCurrentConnections = () => {
    if (activeTab === "connected") {
      const activeConnections = isLabSide ? practices : labs

      return activeConnections.map((connection) => ({
        id: getConnectionPartnerId(connection).toString(),
        name: getConnectionPartnerName(connection),
        address: getConnectionPartnerLocation(connection) || "Address not available",
        type: isLabSide ? ("Practice" as const) : ("Lab" as const),
        phoneNumber: "N/A",
        emailAddress: getConnectionPartnerEmail(connection),
        date: new Date(connection.connected_since || connection.created_at || new Date())
          .toISOString()
          .split("T")[0],
        status: "Connected" as const,
      }))
    }

    if (activeTab === "sent") {
      return (sent?.data || []).map((item: any) => ({
        id: item.id.toString(),
        name: item.name,
        address: item.address || "Address not available",
        type: item.type === "Office" ? ("Practice" as const) : ("Lab" as const),
        phoneNumber: item.phone || "N/A",
        emailAddress: item.email,
        date: new Date(item.created_at || new Date()).toISOString().split("T")[0],
        status: "Requested" as const,
      }))
    }

    return (received?.data || []).map((item: any) => ({
      id: item.id.toString(),
      name: item.invited_by?.name || "Unknown",
      address: item.invited_by?.address || "Address not available",
      type: item.type === "Office" ? ("Practice" as const) : ("Lab" as const),
      phoneNumber: item.invited_by?.phone || "N/A",
      emailAddress: item.invited_by?.email || "N/A",
      date: new Date(item.created_at || new Date()).toISOString().split("T")[0],
      status: "Pending" as const,
    }))
  }

  const filteredInvitationConnections =
    activeTab === "connected"
      ? getCurrentConnections()
      : getCurrentConnections().filter(
          (conn) =>
            conn.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
            conn.emailAddress.toLowerCase().includes(searchTerm.toLowerCase()),
        )

  const displayConnections = activeTab === "connected" ? getCurrentConnections() : filteredInvitationConnections
  const isLoading = activeTab === "connected" ? isLoadingConnections : false
  const error =
    activeTab === "connected" && connectionsError
      ? connectionsError instanceof Error
        ? connectionsError.message
        : String(connectionsError)
      : null

  return (
    <div className="flex-1 flex flex-col">
      <div className="bg-white border-b px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="outline" size="sm">
            <Filter className="h-4 w-4" />
          </Button>
          <Button
            className="bg-[linear-gradient(256.66deg,#2AA6DE_0%,#82298D_50%,#C9539F_100%)] hover:brightness-110"
            onClick={() => setShowNewConnectionModal(true)}
          >
            Add Connection
          </Button>
        </div>

        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
          <Input
            placeholder="Search"
            className="pl-10 w-64"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
      </div>

      <ConnectionTabs activeTab={activeTab} onTabChange={setActiveTab} />

      <div className="flex-1 p-6">
        {isLoading ? (
          <div className="space-y-4">
            {Array.from({ length: 5 }).map((_, index) => (
              <div key={index} className="flex justify-between items-center p-4 border rounded">
                <div className="space-y-2">
                  <Skeleton className="h-4 w-48" />
                  <Skeleton className="h-3 w-64" />
                </div>
                <div className="flex items-center gap-2">
                  <Skeleton className="h-6 w-20 rounded-full" />
                  <Skeleton className="h-8 w-8 rounded" />
                </div>
              </div>
            ))}
          </div>
        ) : error ? (
          <div className="text-center py-8 text-red-500">Failed to load connections: {error}</div>
        ) : displayConnections.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            <div className="text-lg font-medium mb-2">No connections found</div>
            <div className="text-sm">
              {activeTab === "connected"
                ? "You don't have any connected practices or labs yet."
                : activeTab === "sent"
                  ? "You haven't sent any connection requests yet."
                  : "You don't have any pending connection requests."}
            </div>
          </div>
        ) : (
          <>
            <ConnectionsTable
              connections={displayConnections}
              type={activeTab}
              onViewProfile={handleViewProfile}
              onAcceptConnection={handleAcceptConnection}
              onRejectConnection={handleRejectConnection}
              onDeleteConnection={handleDeleteConnection}
              onResendInvitation={handleResendInvitation}
            />
            {activeTab === "connected" && connectionsPagination && connectionsPagination.total > 0 && (
              <div className="mt-6 bg-white rounded-lg border">
                <ConnectionListPagination
                  pagination={connectionsPagination}
                  onPageChange={setConnectedPage}
                  itemLabel={isLabSide ? "practices" : "labs"}
                />
              </div>
            )}
          </>
        )}
      </div>

      <NewConnectionModal
        open={showNewConnectionModal}
        onOpenChange={setShowNewConnectionModal}
        onSubmit={handleNewConnection}
      />

      <ProfileModal
        open={showProfileModal}
        onOpenChange={setShowProfileModal}
        profile={selectedProfile}
        isLoading={isLoadingProfile}
      />
    </div>
  )
}
