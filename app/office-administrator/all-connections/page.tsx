"use client"

import { useState, useEffect, useRef } from "react"
import { Filter, Search } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { ConnectionTabs } from "@/components/lab-administrator/connections/connection-tabs"
import { ConnectionsTable } from "@/components/lab-administrator/connections/connections-table"
import { NewConnectionModal } from "@/components/lab-administrator/connections/new-connection-modal"
import { ProfileModal } from "@/components/lab-administrator/connections/profile-modal"
import { useConnection } from "@/contexts/connection-context"
import { useInvitation } from "@/contexts/invitation-context"
import { useAuth } from "@/contexts/auth-context"
import { useToast } from "@/components/ui/use-toast"
import { fetchProfileData } from "@/lib/api-profile"
import { Skeleton } from "@/components/ui/skeleton"

export default function AllConnections() {
  const { user } = useAuth()
  const { toast } = useToast()
  const { practices, labs, isLoading, error, fetchConnections } = useConnection()
  const { sent, received, fetchAllInvitations, resendInvitation, deleteInvitation, acceptInvitation, cancelInvitation } = useInvitation()
  
  const [activeTab, setActiveTab] = useState<"connected" | "sent" | "received">("connected")
  const [showNewConnectionModal, setShowNewConnectionModal] = useState(false)
  const [showProfileModal, setShowProfileModal] = useState(false)
  const [selectedProfile, setSelectedProfile] = useState<any>(null)
  const [searchTerm, setSearchTerm] = useState("")
  const [isLoadingProfile, setIsLoadingProfile] = useState(false)

  const selectedLocation = JSON.parse(localStorage.getItem("selectedLocation") || "null")
  const invitedBy = user?.roles?.includes("superadmin") ? 0 : selectedLocation?.id
  const hasFetchedRef = useRef(false)

  // Fetch connections and invitations when component mounts
  useEffect(() => {
    if (invitedBy && !hasFetchedRef.current) {
      fetchConnections()
      fetchAllInvitations(invitedBy)
      hasFetchedRef.current = true
    }
  }, [invitedBy, fetchConnections, fetchAllInvitations])

  const handleViewProfile = async (connection: any) => {
    setShowProfileModal(true)
    setIsLoadingProfile(true)
    setSelectedProfile(null)

    try {
      // Determine profile type based on connection type
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

  const handleNewConnection = (data: any) => {
    // Here you would typically send the data to your API
  }

  const handleAcceptConnection = async (id: string) => {
    try {
      await acceptInvitation(parseInt(id), "")
      await fetchAllInvitations(invitedBy)
      toast({
        title: "Success",
        description: "Connection request accepted successfully.",
      })
    } catch (error) {
      console.error("Error accepting connection:", error)
      toast({
        title: "Error",
        description: "Failed to accept connection. Please try again.",
        variant: "destructive",
      })
    }
  }

  const handleRejectConnection = async (id: string) => {
    try {
      await cancelInvitation(parseInt(id))
      await fetchAllInvitations(invitedBy)
      toast({
        title: "Success",
        description: "Connection request rejected successfully.",
      })
    } catch (error) {
      console.error("Error rejecting connection:", error)
      toast({
        title: "Error",
        description: "Failed to reject connection. Please try again.",
        variant: "destructive",
      })
    }
  }

  const handleDeleteConnection = async (id: string) => {
    try {
      await deleteInvitation(parseInt(id))
      await fetchAllInvitations(invitedBy)
      toast({
        title: "Success",
        description: "Connection deleted successfully.",
      })
    } catch (error) {
      console.error("Error deleting connection:", error)
      toast({
        title: "Error",
        description: "Failed to delete connection. Please try again.",
        variant: "destructive",
      })
    }
  }

  const handleResendInvitation = async (id: string, email: string) => {
    try {
      await resendInvitation(parseInt(id), email)
      toast({
        title: "Success",
        description: "Invitation resent successfully.",
      })
    } catch (error) {
      console.error("Error resending invitation:", error)
      toast({
        title: "Error",
        description: "Failed to resend invitation. Please try again.",
        variant: "destructive",
      })
    }
  }

  const getCurrentConnections = () => {
    let connections: any[] = []

    if (activeTab === "connected") {
      // Combine practices and labs for connected tab
      const connectedPractices = practices
        .filter((p) => p.status?.toLowerCase() === "active")
        .map((p) => ({
          id: p.id.toString(),
          name: p.name,
          address: p.address || "Address not available",
          type: "Practice" as const,
          phoneNumber: p.phone || "N/A",
          emailAddress: p.email,
          date: new Date(p.created_at || new Date()).toISOString().split('T')[0],
          status: "Connected" as const,
        }))

      const connectedLabs = labs
        .filter((l) => l.status?.toLowerCase() === "active")
        .map((l) => ({
          id: l.id.toString(),
          name: ('partner' in l) ? l.partner.name : l.name || "Lab Name",
          address: ('partner' in l) ? `${l.partner.city || ''}, ${l.partner.state || ''}` : "Address not available",
          type: "Lab" as const,
          phoneNumber: "N/A",
          emailAddress: ('partner' in l) ? l.partner.email || "N/A" : l.email || "N/A",
          date: new Date(l.created_at || new Date()).toISOString().split('T')[0],
          status: "Connected" as const,
        }))

      connections = [...connectedPractices, ...connectedLabs]
    } else if (activeTab === "sent") {
      connections = (sent?.data || []).map((item: any) => ({
        id: item.id.toString(),
        name: item.name,
        address: item.address || "Address not available",
        type: item.type === "Office" ? "Practice" as const : "Lab" as const,
        phoneNumber: item.phone || "N/A",
        emailAddress: item.email,
        date: new Date(item.created_at || new Date()).toISOString().split('T')[0],
        status: "Requested" as const,
      }))
    } else if (activeTab === "received") {
      connections = (received?.data || []).map((item: any) => ({
        id: item.id.toString(),
        name: item.invited_by?.name || "Unknown",
        address: item.invited_by?.address || "Address not available",
        type: item.type === "Office" ? "Practice" as const : "Lab" as const,
        phoneNumber: item.invited_by?.phone || "N/A",
        emailAddress: item.invited_by?.email || "N/A",
        date: new Date(item.created_at || new Date()).toISOString().split('T')[0],
        status: "Pending" as const,
      }))
    }

    // Apply search filter
    if (!searchTerm) return connections
    return connections.filter(
      (conn) =>
        conn.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        conn.emailAddress.toLowerCase().includes(searchTerm.toLowerCase()),
    )
  }

  return (
    <div className="flex-1 flex flex-col">
      {/* Header */}
      <div className="bg-white border-b px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="outline" size="sm">
            <Filter className="h-4 w-4" />
          </Button>
          <Button className="bg-blue-600 hover:bg-blue-700" onClick={() => setShowNewConnectionModal(true)}>
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

      {/* Tabs */}
      <ConnectionTabs activeTab={activeTab} onTabChange={setActiveTab} />

      {/* Table */}
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
          <div className="text-center py-8 text-red-500">
            Failed to load connections: {error}
          </div>
        ) : getCurrentConnections().length === 0 ? (
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
          <ConnectionsTable
            connections={getCurrentConnections()}
            type={activeTab}
            onViewProfile={handleViewProfile}
            onAcceptConnection={handleAcceptConnection}
            onRejectConnection={handleRejectConnection}
            onDeleteConnection={handleDeleteConnection}
            onResendInvitation={handleResendInvitation}
          />
        )}
      </div>

      {/* Modals */}
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
