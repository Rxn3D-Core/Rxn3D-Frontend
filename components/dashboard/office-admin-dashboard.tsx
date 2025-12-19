"use client"

import React from "react"

import { useState, useEffect, useRef, useMemo } from "react"
import { Search, Info, Eye, MoreHorizontal, Plus, Mail, Trash2, CirclePause, EllipsisVertical, CircleOff } from 'lucide-react'
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent } from "@/components/ui/card"
import { useToast } from "@/components/ui/use-toast"
import { useAuth } from "@/contexts/auth-context"
import { useConnection } from "@/contexts/connection-context"
import { Skeleton } from "@/components/ui/skeleton"
import { InvitationForm } from "@/components/invitation-form"
import { CustomerSearchBox } from "@/components/CustomerSearchBox"
import { KpiCard } from "@/components/dashboard/kpi-card"
import { useInvitation } from "@/contexts/invitation-context"
import { ProfileModal, type ProfileData } from "@/components/profile-modal"
import { fetchProfileData, saveProfileData } from "@/lib/api-profile"
import { useFetchUsersQuery } from "@/hooks/use-users"
import { useFetchUserInvitations } from "@/hooks/use-user-invitations"
import { useQueryClient } from "@tanstack/react-query"
import { useDashboardSettings } from "@/hooks/use-dashboard-settings"
import { WIDGET_IDS, getCustomerId } from "@/lib/dashboard-widgets"
interface StatusCardProps {
  title: string
  count: number
  color: string
}

function StatusCard({ title, count, color }: StatusCardProps) {
  return (
    <Card className="shadow-sm">
      <CardContent className="p-4">
        <div className="flex flex-col items-center justify-center">
          <div className={`text-sm font-medium mb-2 ${color}`}>{title}</div>
          <div className="text-2xl font-bold">{count}</div>
          <div className="mt-2">
            <Eye className="h-4 w-4 text-[#a19d9d]" />
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

export function OfficeAdminDashboard() {
  const { user } = useAuth()
  const { toast } = useToast()
  const { labs, isLoading, error, fetchConnections } = useConnection()
  const userRole = user?.roles?.[0] || "office_admin"
  const userId = user?.id
  const dashboardCustomerId = getCustomerId(user)
  const { isEnabled, enabledWidgets } = useDashboardSettings(userRole, userId, dashboardCustomerId)
  const { sent, received, fetchAllInvitations, deleteInvitation, resendInvitation, acceptInvitation, cancelInvitation } = useInvitation()
  const queryClient = useQueryClient()

  const [labsTab, setLabsTab] = useState("connected")
  const [usersTab, setUsersTab] = useState("connected")
  const [showLabForm, setShowLabForm] = useState(false)
  const [isLabSearching, setIsLabSearching] = useState(false)
  const [isOfficeSearching, setIsOfficeSearching] = useState(false)
  const [labSearchQuery, setLabSearchQuery] = useState("")
  const [officeSearchQuery, setOfficeSearchQuery] = useState("")
  const [userFormData, setUserFormData] = useState({ name: "", email: "", role: "user" })
  const [isSearchingLabs, setIsSearchingLabs] = useState(false)
  const selectedLocation = JSON.parse(localStorage.getItem("selectedLocation") || "null")
  const invitedBy = user?.roles?.includes("superadmin") ? 0 : selectedLocation?.id
  const [userSearchQuery, setUserSearchQuery] = useState("")
  const [activeTabUsers, setActiveTabUsers] = useState("connected")
  const [activeTabPractices, setActiveTabPractices] = useState("connected")
  const [activeTabLabs, setActiveTabLabs] = useState("connected")
  const [showUserForm, setShowUserForm] = useState(false)

  // Fetch real user data
  const { data: usersData, isLoading: isLoadingUsers, error: usersError, refetch: refetchUsers } = useFetchUsersQuery()
  
  // Fetch user invitations for pending tab
  const customerId = selectedLocation?.id || null
  const { data: userInvitationsRaw, isLoading: isLoadingInvitations, refetch: refetchInvitations } = useFetchUserInvitations(customerId)
  
  // Ensure userInvitations is always an array to prevent rendering errors
  const userInvitations = useMemo(() => {
    if (Array.isArray(userInvitationsRaw)) {
      return userInvitationsRaw
    }
    // If it's an object with a data property, extract it
    if (userInvitationsRaw && typeof userInvitationsRaw === 'object' && 'data' in userInvitationsRaw) {
      return Array.isArray(userInvitationsRaw.data) ? userInvitationsRaw.data : []
    }
    return []
  }, [userInvitationsRaw])

  // Fetch invitations when component mounts
  const hasFetchedRef = useRef(false)

  useEffect(() => {
    if (invitedBy && !hasFetchedRef.current) {
      fetchConnections()
      fetchAllInvitations(invitedBy)
      hasFetchedRef.current = true
    }
  }, [invitedBy, fetchConnections, fetchAllInvitations])

  // Note: We don't need a query cache subscription here since we're already
  // invalidating queries in the onSuccess callback of the invitation form

  // Profile modal states
  const [profileModalOpen, setProfileModalOpen] = useState(false)
  const [selectedProfile, setSelectedProfile] = useState<ProfileData | null>(null)
  const [isLoadingProfile, setIsLoadingProfile] = useState(false)
  const [practicesTab, setPracticesTab] = useState("connected")

  // Filter labs based on tab
  const filteredLabs =
    labsTab === "connected"
      ? labs.filter((l) => l.status?.toLowerCase() === "active")
      : labsTab === "sent"
        ? (sent?.data || []).filter((l) => l.type === "Lab")
        : received?.data || [];

  const getStatusBadgeClass = (status: string) => {
    const statusLower = status?.toLowerCase() || ""
    switch (statusLower) {
      case "accepted":
        return "bg-[#c3f2cf] text-[#119933]"
      case "connected":
      case "active":
        return "bg-[#c3f2cf] text-[#119933]"
      case "on-hold":
      case "on hold":
        return "bg-[#fff3e1] text-[#ff9500]"
      case "requested":
        return "bg-[#fff3e1] text-[#ff9500]"
      case "pending":
        return "bg-[#fff3e1] text-[#ff9500]"
      case "rejected":
      case "declined":
        return "bg-[#f8dddd] text-[#eb0303]"
      default:
        return "bg-[#eeeeee] text-[#a19d9d]"
    }
  }

  const getStatusLabel = (status: string) => {
    const statusLower = status?.toLowerCase() || ""
    switch (statusLower) {
      case "accepted":
        return "Accepted"
      case "connected":
      case "active":
        return "Connected"
      case "on-hold":
      case "on hold":
        return "On Hold"
      case "pending":
        return "Requested"
      case "rejected":
      case "declined":
        return "Reconnect"
      case "requested":
        return "Requested"
      default:
        return status || "Unknown"
    }
  }

  // Transform API user data to match UI format
  const transformUsers = (): Array<{ id: number; name: string; role: string; status: string; email: string }> => {
    if (!usersData || typeof usersData !== 'object' || !('data' in usersData) || !Array.isArray(usersData.data)) {
      return []
    }

    return usersData.data.map((apiUser: any) => {
      // Get the primary customer or first customer to determine role
      const primaryCustomer = apiUser.customers?.find((c: any) => c.is_primary === 1) || apiUser.customers?.[0]
      
      // Safely extract role name - handle both object and string formats
      let roleName = "N/A"
      const roleObj = primaryCustomer?.role || primaryCustomer?.pivot?.role
      if (roleObj) {
        roleName = typeof roleObj === "string" ? roleObj : (roleObj?.name || "N/A")
      } else if (apiUser.role) {
        roleName = typeof apiUser.role === "string" ? apiUser.role : (apiUser.role?.name || "N/A")
      }
      
      // Format role name for display (replace underscores with spaces and capitalize)
      const formattedRole = roleName
        .split('_')
        .map((word: string) => word.charAt(0).toUpperCase() + word.slice(1))
        .join(' ')

      // Map status - API might return "Active" but UI expects "connected"
      const status = apiUser.status?.toLowerCase() === "active" ? "connected" : apiUser.status?.toLowerCase() || "connected"

      return {
        id: apiUser.id,
        name: `${apiUser.first_name || ""} ${apiUser.last_name || ""}`.trim() || apiUser.email,
        role: formattedRole,
        status: status,
        email: apiUser.email,
      }
    })
  }

  // Transform user invitations to match UI format
  const transformInvitations = () => {
    if (!Array.isArray(userInvitations)) {
      return []
    }

    return userInvitations
      .filter((inv: any) => inv.status === "Pending")
      .map((inv: any) => {
        // Format role name for display
        const formattedRole = inv.role
          ?.split('_')
          .map((word: string) => word.charAt(0).toUpperCase() + word.slice(1))
          .join(' ') || "N/A"

        return {
          id: inv.token, // Use token as ID for invitations
          name: inv.name,
          role: formattedRole,
          status: "pending",
          email: inv.email,
          isInvitation: true,
          invitationData: inv,
        }
      })
  }

  const users = transformUsers()
  const invitations = transformInvitations()

  // Combine users and invitations based on active tab
  const getDisplayItems = (): Array<{ id: number | string; name: string; role: string; status: string; email?: string; isInvitation?: boolean; invitationData?: any }> => {
    if (activeTabUsers === "connected") {
      return users.filter((u: { id: number; name: string; role: string; status: string; email: string }) => u.status.toLowerCase() === "connected")
    } else {
      // Pending tab - show invitations
      return invitations
    }
  }

  const displayItems = getDisplayItems()

  const filteredUsers = displayItems.filter(
    (item: { id: number | string; name: string; role: string; status: string; email?: string }) =>
      item.name.toLowerCase().includes(userSearchQuery.toLowerCase()) ||
      item.role.toLowerCase().includes(userSearchQuery.toLowerCase()) ||
      item.email?.toLowerCase().includes(userSearchQuery.toLowerCase()),
  )

  const handleOpenProfile = async (id: number, type: "office" | "lab") => {
    setProfileModalOpen(true)
    setIsLoadingProfile(true)
    setSelectedProfile(null)

    try {
      const profileData = await fetchProfileData(id, type)
      setSelectedProfile({ ...profileData, type: type })
    } catch (error) {
      console.error(`Error fetching ${type} profile:`, error)
      toast({
        title: "Error",
        description: `Failed to load ${type} profile. Please try again.`,
        variant: "destructive",
      })
    } finally {
      setIsLoadingProfile(false)
    }
  }

  const handleTabClick = (tab: string, section: "practices" | "labs" | "users") => {
    if (section === "practices") {
      setActiveTabPractices(tab)
      setPracticesTab(tab)
    } else if (section === "labs") {
      setActiveTabLabs(tab)
      setLabsTab(tab)
    } else if (section === "users") {
      setActiveTabUsers(tab)
    }
  }

  // Handle saving profile changes
  const handleSaveProfile = async (data: ProfileData) => {
    try {
      await saveProfileData(data)
      toast({
        title: "Success",
        description: `${data.type === "office" ? "Practice" : "Lab"} profile updated successfully.`,
      })
    } catch (error) {
      console.error("Error saving profile:", error)
      toast({
        title: "Error",
        description: "Failed to save profile changes. Please try again.",
        variant: "destructive",
      })
    }
  }

  return (
    <div className="p-3 sm:p-4 md:p-6 lg:p-8 xl:p-12 bg-white min-h-screen">
      <div className="space-y-4 sm:space-y-6 lg:space-y-8">
        {/* Header Section */}
        <div className="mb-4 sm:mb-6">
          <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold text-gray-900 mb-2">Office Dashboard</h1>
          <p className="text-sm sm:text-base text-gray-600">Manage your practice operations and lab connections</p>
        </div>

        {/* KPI Cards */}
        {isEnabled(WIDGET_IDS.KPI_CARDS) && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 lg:gap-6 mb-4 sm:mb-6">
          <KpiCard title="Total Case Spend" value="$64,587.70" change="40.3%" isPositive={true} icon="dollar" />
          <KpiCard title="Outstanding Balance" value="$11,567.44" change="20.3%" isPositive={true} icon="document" />
          <KpiCard title="Total Cases" value="2657" change="2.3%" isPositive={false} icon="dollar" />
          <KpiCard title="Case approval rate" value="97.50%" change="40.3%" isPositive={true} icon="dollar" />
        </div>
        )}

        {/* Status Cards */}
        {isEnabled(WIDGET_IDS.STATUS_CARDS) && (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 sm:gap-4 lg:gap-6 mb-6 sm:mb-8">
          <StatusCard title="Rush Cases" count={15} color="text-red-500" />
          <StatusCard title="On Hold Cases" count={135} color="text-red-500" />
          <StatusCard title="Due Today" count={15} color="text-green-500" />
          <StatusCard title="New Stage notes" count={110} color="text-black" />
          <StatusCard title="Late Cases" count={10} color="text-black" />
        </div>
        )}

        {/* Main Content Grid */}
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-4 sm:gap-6 lg:gap-8">
          {/* My Lab Section */}
          {isEnabled(WIDGET_IDS.MY_LABS) && (
          <div className="bg-white rounded-xl shadow-sm border border-[#e4e6ef] overflow-hidden">
            <div className="p-3 sm:p-4 border-b border-[#e4e6ef] bg-[#1162a8]">
              <div className="flex justify-between items-center">
                <div>
                  <h2 className="text-base sm:text-lg font-semibold text-white mb-1">My Lab</h2>
                  <p className="text-blue-100 text-xs">Manage your laboratory partnerships</p>
                </div>
                <Button
                  className="bg-white text-[#1162a8] hover:bg-blue-50 shadow-md font-medium text-xs sm:text-sm px-2 sm:px-3 py-1 sm:py-2"
                  onClick={() => setShowLabForm(!showLabForm)}
                >
                  <Plus className="h-3 w-3 sm:h-4 sm:w-4 mr-1 sm:mr-2" />
                  <span className="hidden sm:inline">New Lab</span>
                  <span className="sm:hidden">New</span>
                </Button>
              </div>
            </div>

            <div className="p-3 sm:p-4 lg:p-6 border-b border-[#e4e6ef]">
              <div className="relative mb-4 sm:mb-6">
                <CustomerSearchBox
                  type="Lab"
                  placeholder="Search labs..."
                  onSelect={(customer) => {
                    setLabSearchQuery("")
                    handleOpenProfile(customer.id, "lab")
                  }}
                  isLoading={isSearchingLabs}
                  searchState={{
                    query: labSearchQuery,
                    setQuery: setLabSearchQuery,
                  }}
                />
              </div>

              {showLabForm && (
                <div className="p-3 sm:p-4 bg-slate-50 rounded-lg border border-[#e4e6ef] mb-4 sm:mb-6">
                  <InvitationForm
                    type="Lab"
                    onSuccess={() => setShowLabForm(false)}
                  />
                </div>
              )}

              <div className="flex flex-col sm:flex-row border-b border-[#e4e6ef]">
                <button
                  className={`flex-1 text-center py-2 sm:py-3 px-2 sm:px-4 font-medium transition-all text-sm sm:text-base ${
                    labsTab === "connected" 
                      ? "border-b-2 sm:border-b-2 border-[#1162a8] text-[#1162a8] bg-blue-50" 
                      : "text-gray-500 hover:text-[#1162a8] hover:bg-gray-50"
                  }`}
                  onClick={() => setLabsTab("connected")}
                >
                  <span className="hidden sm:inline">Connected Labs</span>
                  <span className="sm:hidden">Connected</span>
                  <span className="block sm:inline">({labs.filter(l => l.status?.toLowerCase() === "active").length})</span>
                </button>
                <button
                  className={`flex-1 text-center py-2 sm:py-3 px-2 sm:px-4 font-medium transition-all text-sm sm:text-base ${
                    labsTab === "sent" 
                      ? "border-b-2 sm:border-b-2 border-[#1162a8] text-[#1162a8] bg-blue-50" 
                      : "text-gray-500 hover:text-[#1162a8] hover:bg-gray-50"
                  }`}
                  onClick={() => setLabsTab("sent")}
                >
                  <span className="hidden sm:inline">Request Sent</span>
                  <span className="sm:hidden">Sent</span>
                  <span className="block sm:inline">({(sent?.data || []).filter(l => l.type === "Lab").length})</span>
                </button>
                <button
                  className={`flex-1 text-center py-2 sm:py-3 px-2 sm:px-4 font-medium transition-all text-sm sm:text-base ${
                    labsTab === "received" 
                      ? "border-b-2 sm:border-b-2 border-[#1162a8] text-[#1162a8] bg-blue-50" 
                      : "text-gray-500 hover:text-[#1162a8] hover:bg-gray-50"
                  }`}
                  onClick={() => setLabsTab("received")}
                >
                  <span className="hidden sm:inline">Request Received</span>
                  <span className="sm:hidden">Received</span>
                  <span className="block sm:inline">({received?.data?.length || 0})</span>
                </button>
              </div>
            </div>

            <div className="max-h-80 sm:max-h-96 overflow-y-auto">
              {isLoading ? (
                <div className="space-y-3 sm:space-y-4 p-3 sm:p-6">
                  {Array.from({ length: 3 }).map((_, index) => (
                    <div key={index} className="flex justify-between items-center p-3 sm:p-4 bg-slate-50 rounded-lg">
                      <div className="space-y-2">
                        <Skeleton className="h-4 sm:h-5 w-32 sm:w-40" />
                        <Skeleton className="h-3 sm:h-4 w-40 sm:w-60" />
                      </div>
                      <div className="flex items-center gap-2 sm:gap-3">
                        <Skeleton className="h-6 sm:h-7 w-16 sm:w-24 rounded-full" />
                        <div className="flex gap-1 sm:gap-2">
                          <Skeleton className="h-6 sm:h-8 w-6 sm:w-8 rounded-full" />
                          <Skeleton className="h-6 sm:h-8 w-6 sm:w-8 rounded-full" />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : error ? (
                <div className="p-6 sm:p-8 text-center">
                  <div className="text-red-500 font-medium mb-2">Failed to load labs</div>
                  <p className="text-sm text-gray-600">{error}</p>
                </div>
              ) : filteredLabs.length > 0 ? (
                <div className="divide-y divide-[#e4e6ef]">
                  {filteredLabs.map((lab) => {
                    if (labsTab === "connected") {
                      return (
                        <div
                          key={lab.id}
                          className="flex flex-col sm:flex-row sm:justify-between sm:items-center p-3 sm:p-6 hover:bg-[#f5f5f5] cursor-pointer transition-all duration-200 group space-y-2 sm:space-y-0"
                        >
                          <div className="flex-1">
                            <div className="text-[#1162a8] font-semibold text-base sm:text-lg group-hover:text-blue-700 transition-colors">
                              {'partner' in lab ? lab.partner.name : lab.name}
                            </div>
                            <div className="text-xs sm:text-sm text-[#a19d9d] mt-1">
                              {'partner' in lab ? `${lab.partner.city}, ${lab.partner.state}` : lab.email}
                            </div>
                          </div>
                          <div className="flex items-center justify-between sm:justify-end gap-2 sm:gap-4">
                            <span className={`px-2 sm:px-3 py-1 sm:py-1.5 rounded-full text-xs font-medium ${getStatusBadgeClass(lab.status || '')}`}>
                              {getStatusLabel(lab.status || '')}
                            </span>
                            <div className="flex items-center gap-1 sm:gap-2">
                              <button className="p-1.5 sm:p-2 text-[#a19d9d] hover:text-orange-500 hover:bg-orange-50 rounded-full transition-all">
                                <CirclePause className="h-3 w-3 sm:h-4 sm:w-4" />
                              </button>
                              <button className="p-1.5 sm:p-2 text-[#a19d9d] hover:text-red-500 hover:bg-red-50 rounded-full transition-all">
                                <CircleOff className="h-3 w-3 sm:h-4 sm:w-4" />
                              </button>
                              <button className="p-1.5 sm:p-2 text-[#a19d9d] hover:text-gray-600 hover:bg-gray-100 rounded-full transition-all">
                                <EllipsisVertical className="h-3 w-3 sm:h-4 sm:w-4" />
                              </button>
                            </div>
                          </div>
                        </div>
                      );
                    } else if (labsTab === "sent") {
                      return (
                        <div key={lab.id} className="p-3 sm:p-6 hover:bg-[#f5f5f5] flex flex-col sm:flex-row sm:justify-between sm:items-center group space-y-2 sm:space-y-0">
                          <div className="flex-1">
                            <div className="text-[#1162a8] font-semibold text-base sm:text-lg group-hover:text-blue-700 transition-colors">{lab.name}</div>
                            <div className="text-xs sm:text-sm text-[#a19d9d] mt-1">{lab.email}</div>
                          </div>
                          <div className="flex items-center justify-between sm:justify-end gap-2 sm:gap-4">
                            <span className={`px-2 sm:px-3 py-1 sm:py-1.5 rounded-full text-xs font-medium ${getStatusBadgeClass(lab.status || '')}`}>
                              {getStatusLabel(lab.status || '')}
                            </span>
                            {lab.status === 'Pending' && (
                              <>
                                <button
                                  className="p-1.5 sm:p-2 text-[#a19d9d] hover:text-blue-500 hover:bg-blue-50 rounded-full transition-all"
                                  onClick={async () => {
                                    await resendInvitation(lab.id, lab.email);
                                  }}
                                  aria-label={`Resend invitation for ${lab.name}`}
                                  title="Resend Invitation"
                                >
                                  <Mail className="h-3 w-3 sm:h-4 sm:w-4" />
                                </button>
                                <button
                                  className="p-1.5 sm:p-2 text-[#a19d9d] hover:text-red-500 hover:bg-red-50 rounded-full transition-all"
                                  onClick={async () => {
                                    await deleteInvitation(lab.id);
                                    await fetchAllInvitations(invitedBy);
                                  }}
                                  aria-label={`Delete invitation for ${lab.name}`}
                                  title="Delete Invitation"
                                >
                                  <Trash2 className="h-3 w-3 sm:h-4 sm:w-4" />
                                </button>
                              </>
                            )}
                            <button className="p-1.5 sm:p-2 text-[#a19d9d] hover:text-gray-600 hover:bg-gray-100 rounded-full transition-all">
                              <MoreHorizontal className="h-3 w-3 sm:h-4 sm:w-4" />
                            </button>
                          </div>
                        </div>
                      );
                    } else {
                      // Request Received tab
                      const receivedLab = lab as any
                      return (
                        <div key={receivedLab.invited_by?.id || receivedLab.id} className="p-3 sm:p-6 hover:bg-[#f5f5f5] flex flex-col sm:flex-row sm:justify-between sm:items-center group space-y-2 sm:space-y-0">
                          <div className="flex-1">
                            <div className="text-[#1162a8] font-semibold text-base sm:text-lg group-hover:text-blue-700 transition-colors">
                              {receivedLab?.invited_by?.name || receivedLab.name}
                            </div>
                            <div className="text-xs sm:text-sm text-[#a19d9d] mt-1">{receivedLab?.invited_by?.email || receivedLab.email}</div>
                          </div>
                          <div className="flex items-center justify-between sm:justify-end gap-2 sm:gap-4">
                            <span className={`px-2 sm:px-3 py-1 sm:py-1.5 rounded-full text-xs font-medium ${getStatusBadgeClass(receivedLab.status || '')}`}>
                              {getStatusLabel(receivedLab.status || '')}
                            </span>
                            {receivedLab.status === 'Pending' && (
                              <>
                                <button className="p-1.5 sm:p-2 text-[#a19d9d] hover:text-green-500 hover:bg-green-50 rounded-full transition-all"
                                  onClick={async () => {
                                    await acceptInvitation(receivedLab.id, receivedLab.email);
                                    await fetchAllInvitations(invitedBy);
                                  }}
                                  aria-label={`Accept invitation for ${receivedLab.name}`}
                                  title="Accept Invitation"
                                >
                                  <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" className="sm:w-4 sm:h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20 6 9 17l-5-5"/></svg>
                                </button>
                                <button className="p-1.5 sm:p-2 text-[#a19d9d] hover:text-red-500 hover:bg-red-50 rounded-full transition-all"
                                  onClick={async () => {
                                    await cancelInvitation(receivedLab.id);
                                    await fetchAllInvitations(invitedBy);
                                  }}
                                  aria-label={`Cancel invitation for ${receivedLab.name}`}
                                  title="Cancel Invitation"
                                >
                                  <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" className="sm:w-4 sm:h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg>
                                </button>
                                <button
                                  className="p-1.5 sm:p-2 text-[#a19d9d] hover:text-red-500 hover:bg-red-50 rounded-full transition-all"
                                  onClick={async () => {
                                    await deleteInvitation(receivedLab.id);
                                    await fetchAllInvitations(invitedBy);
                                  }}
                                  aria-label={`Delete invitation for ${receivedLab.name}`}
                                  title="Delete Invitation"
                                >
                                  <Trash2 className="h-3 w-3 sm:h-4 sm:w-4" />
                                </button>
                              </>
                            )}
                            <button className="p-1.5 sm:p-2 text-[#a19d9d] hover:text-gray-600 hover:bg-gray-100 rounded-full transition-all">
                              <MoreHorizontal className="h-3 w-3 sm:h-4 sm:w-4" />
                            </button>
                          </div>
                        </div>
                      );
                    }
                  })}
                </div>
              ) : (
                <div className="p-8 sm:p-12 text-center">
                  <div className="w-12 h-12 sm:w-16 sm:h-16 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-4">
                    <Plus className="h-6 w-6 sm:h-8 sm:w-8 text-slate-400" />
                  </div>
                  <h3 className="font-semibold text-gray-900 mb-2 text-sm sm:text-base">No labs found</h3>
                  <p className="text-gray-600 text-xs sm:text-sm">Connect with labs to start managing cases together.</p>
                </div>
              )}
            </div>
          </div>
          )}

          {/* My Users Section */}
          {isEnabled(WIDGET_IDS.MY_USERS_OFFICE) && (
          <div className="bg-white rounded-xl shadow-sm border border-[#d9d9d9] overflow-hidden">
            <div className="p-3 sm:p-4 border-b border-[#d9d9d9] bg-[#1162a8]">
              <div className="flex justify-between items-center">
                <div>
                  <h2 className="text-base sm:text-lg font-semibold text-white mb-1">My Users</h2>
                  <p className="text-blue-100 text-xs">Manage team access and permissions</p>
                </div>
                <Button
                  className="bg-white text-[#1162a8] hover:bg-blue-50 shadow-md font-medium text-xs sm:text-sm px-2 sm:px-3 py-1 sm:py-2"
                  onClick={() => setShowUserForm(!showUserForm)}
                >
                  <Plus className="h-3 w-3 sm:h-4 sm:w-4 mr-1 sm:mr-2" />
                  <span className="hidden sm:inline">New User</span>
                  <span className="sm:hidden">New</span>
                </Button>
              </div>
            </div>

            <div className="p-3 sm:p-4 lg:p-6 border-b border-[#d9d9d9]">
              <div className="relative mb-4 sm:mb-6">
                <Input
                  type="text"
                  className="pl-8 sm:pl-10 pr-4 py-2 sm:py-3 border-[#d9d9d9] rounded-lg focus:ring-2 focus:ring-[#1162a8] focus:border-[#1162a8] text-sm sm:text-base"
                  placeholder="Search users..."
                  value={userSearchQuery}
                  onChange={(e) => setUserSearchQuery(e.target.value)}
                />
                <Search className="absolute left-2 sm:left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 sm:h-5 sm:w-5 text-[#a19d9d]" />
              </div>

              {showUserForm && (
                <div className="p-3 sm:p-4 bg-slate-50 rounded-lg border border-[#d9d9d9] mb-4 sm:mb-6">
                  <InvitationForm
                    type="User"
                    onSuccess={() => {
                      setShowUserForm(false)
                      // Refetch users and invitations after successful invitation
                      if (refetchUsers) {
                        refetchUsers().catch(console.error)
                      }
                      if (refetchInvitations) {
                        refetchInvitations().catch(console.error)
                      }
                      queryClient.invalidateQueries({ queryKey: ["user-invitations"] })
                      queryClient.invalidateQueries({ queryKey: ["users"] })
                    }}
                  />
                </div>
              )}

              <div className="flex flex-col sm:flex-row border-b border-[#d9d9d9]">
                <button
                  className={`flex-1 text-center py-2 sm:py-3 px-2 sm:px-4 font-medium transition-all text-sm sm:text-base ${
                    activeTabUsers === "connected"
                      ? "border-b-2 sm:border-b-2 border-[#1162a8] text-[#1162a8] bg-blue-50"
                      : "text-[#a19d9d] hover:text-[#1162a8] hover:bg-gray-50"
                  }`}
                  onClick={() => handleTabClick("connected", "users")}
                >
                  <span className="hidden sm:inline">Connected Users</span>
                  <span className="sm:hidden">Connected</span>
                  <span className="block sm:inline">({users.filter((u: { id: number; name: string; role: string; status: string; email: string }) => u.status.toLowerCase() === "connected").length})</span>
                </button>
                <button
                  className={`flex-1 text-center py-2 sm:py-3 px-2 sm:px-4 font-medium transition-all text-sm sm:text-base ${
                    activeTabUsers === "request"
                      ? "border-b-2 sm:border-b-2 border-[#1162a8] text-[#1162a8] bg-blue-50"
                      : "text-[#a19d9d] hover:text-[#1162a8] hover:bg-gray-50"
                  }`}
                  onClick={() => handleTabClick("request", "users")}
                >
                  <span className="hidden sm:inline">Pending</span>
                  <span className="sm:hidden">Pending</span>
                  <span className="block sm:inline">({invitations.length})</span>
                </button>
              </div>
            </div>

            <div className="max-h-80 sm:max-h-96 overflow-y-auto">
              {isLoadingUsers || isLoadingInvitations ? (
                <div className="space-y-3 sm:space-y-4 p-3 sm:p-6">
                  {Array.from({ length: 3 }).map((_, index) => (
                    <div key={index} className="flex justify-between items-center p-3 sm:p-4 bg-slate-50 rounded-lg">
                      <div className="space-y-2">
                        <Skeleton className="h-4 sm:h-5 w-32 sm:w-40" />
                        <Skeleton className="h-3 sm:h-4 w-40 sm:w-60" />
                      </div>
                      <div className="flex items-center gap-2 sm:gap-3">
                        <Skeleton className="h-6 sm:h-7 w-16 sm:w-24 rounded-full" />
                        <div className="flex gap-1 sm:gap-2">
                          <Skeleton className="h-6 sm:h-8 w-6 sm:w-8 rounded-full" />
                          <Skeleton className="h-6 sm:h-8 w-6 sm:w-8 rounded-full" />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : usersError ? (
                <div className="p-6 sm:p-8 text-center">
                  <div className="text-red-500 font-medium mb-2">Failed to load users</div>
                  <p className="text-sm text-gray-600">{usersError instanceof Error ? usersError.message : "Unknown error"}</p>
                </div>
              ) : filteredUsers.length > 0 ? (
                <div className="divide-y divide-[#d9d9d9]">
                  {filteredUsers.map((user) => {
                    const isInvitation = (user as any).isInvitation
                    const invitationData = (user as any).invitationData

                    return (
                      <div
                        key={user.id}
                        className="flex flex-col sm:flex-row sm:justify-between sm:items-center p-3 sm:p-6 hover:bg-[#f5f5f5] cursor-pointer transition-all duration-200 group space-y-2 sm:space-y-0"
                      >
                        <div className="flex-1">
                          <div className="text-[#1162a8] font-semibold text-base sm:text-lg group-hover:text-emerald-600 transition-colors">
                            {user.name}
                          </div>
                          <div className="text-xs sm:text-sm text-[#a19d9d] mt-1">
                            {user.role}
                            {isInvitation && (
                              <span className="ml-2 text-xs text-orange-600">• Invitation sent</span>
                            )}
                          </div>
                        </div>
                        <div className="flex items-center justify-between sm:justify-end gap-2 sm:gap-4">
                          <span className={`px-2 sm:px-3 py-1 sm:py-1.5 rounded-full text-xs font-medium ${getStatusBadgeClass(user.status)}`}>
                            {getStatusLabel(user.status)}
                          </span>
                          <div className="flex items-center gap-1 sm:gap-2">
                            {isInvitation && invitationData && (
                              <>
                                <button
                                  className="p-1.5 sm:p-2 text-[#a19d9d] hover:text-blue-500 hover:bg-blue-50 rounded-full transition-all"
                                  onClick={async (e) => {
                                    e.stopPropagation()
                                    // Resend invitation logic would go here
                                    toast({
                                      title: "Info",
                                      description: "Resend functionality coming soon",
                                      variant: "default",
                                    })
                                  }}
                                  aria-label={`Resend invitation for ${user.name}`}
                                  title="Resend Invitation"
                                >
                                  <Mail className="h-3 w-3 sm:h-4 sm:w-4" />
                                </button>
                                <button
                                  className="p-1.5 sm:p-2 text-[#a19d9d] hover:text-red-500 hover:bg-red-50 rounded-full transition-all"
                                  onClick={async (e) => {
                                    e.stopPropagation()
                                    // Cancel invitation logic would go here
                                    toast({
                                      title: "Info",
                                      description: "Cancel invitation functionality coming soon",
                                      variant: "default",
                                    })
                                  }}
                                  aria-label={`Cancel invitation for ${user.name}`}
                                  title="Cancel Invitation"
                                >
                                  <Trash2 className="h-3 w-3 sm:h-4 sm:w-4" />
                                </button>
                              </>
                            )}
                            {!isInvitation && (
                              <>
                                <button className="p-1.5 sm:p-2 text-[#a19d9d] hover:text-orange-500 hover:bg-orange-50 rounded-full transition-all">
                                  <CirclePause className="h-3 w-3 sm:h-4 sm:w-4" />
                                </button>
                                <button className="p-1.5 sm:p-2 text-[#a19d9d] hover:text-red-500 hover:bg-red-50 rounded-full transition-all">
                                  <CircleOff className="h-3 w-3 sm:h-4 sm:w-4" />
                                </button>
                              </>
                            )}
                            <button className="p-1.5 sm:p-2 text-[#a19d9d] hover:text-gray-600 hover:bg-gray-100 rounded-full transition-all">
                              <EllipsisVertical className="h-3 w-3 sm:h-4 sm:w-4" />
                            </button>
                          </div>
                        </div>
                      </div>
                    )
                  })}
                </div>
              ) : (
                <div className="p-8 sm:p-12 text-center">
                  <div className="w-12 h-12 sm:w-16 sm:h-16 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-4">
                    <Plus className="h-6 w-6 sm:h-8 sm:w-8 text-slate-400" />
                  </div>
                  <h3 className="font-semibold text-gray-900 mb-2 text-sm sm:text-base">
                    {activeTabUsers === "connected" ? "No users found" : "No pending invitations"}
                  </h3>
                  <p className="text-gray-600 text-xs sm:text-sm">
                    {activeTabUsers === "connected" 
                      ? "No connected users yet. Invite users to get started." 
                      : "No pending invitations at this time."}
                  </p>
                </div>
              )}
            </div>

            {/* Enhanced Pagination */}
            <div className="p-3 sm:p-4 lg:p-6 bg-slate-50 border-t border-[#d9d9d9] flex flex-col sm:flex-row sm:justify-between sm:items-center space-y-2 sm:space-y-0">
              <span className="text-xs sm:text-sm text-[#a19d9d] text-center sm:text-left">Showing {filteredUsers.length} users</span>
              <div className="flex items-center justify-center sm:justify-end space-x-1">
                <button
                  className="h-5 w-5 sm:h-6 sm:w-6 rounded-full flex items-center justify-center text-xs bg-[#f0f0f0] text-[#a19d9d]"
                  disabled={true}
                >
                  «
                </button>
                {Array.from({ length: Math.min(5, Math.ceil(filteredUsers.length / 5) || 1) }, (_, i) => {
                  const pageNum = i + 1
                  return (
                    <button
                      key={pageNum}
                      className={`h-5 w-5 sm:h-6 sm:w-6 rounded-full flex items-center justify-center text-xs ${
                        pageNum === 1 ? "bg-[#1162a8] text-white" : "bg-[#f0f0f0] text-[#a19d9d]"
                      }`}
                    >
                      {pageNum}
                    </button>
                  )
                })}
                <button
                  className="h-5 w-5 sm:h-6 sm:w-6 rounded-full flex items-center justify-center text-xs bg-[#f0f0f0] text-[#a19d9d]"
                  disabled={filteredUsers.length <= 5}
                >
                  »
                </button>
              </div>
            </div>
          </div>
          )}
        </div>

        {/* More Features Coming Soon */}
        {isEnabled(WIDGET_IDS.COMING_SOON) && (
        <div className="bg-gradient-to-br from-emerald-50 via-teal-50 to-cyan-50 rounded-xl border border-emerald-200 p-6 sm:p-8 lg:p-12 text-center shadow-lg relative overflow-hidden">
          {/* Background decorative elements */}
          <div className="absolute top-0 left-0 w-16 h-16 sm:w-32 sm:h-32 bg-emerald-200 rounded-full opacity-20 -translate-x-8 sm:-translate-x-16 -translate-y-8 sm:-translate-y-16"></div>
          <div className="absolute bottom-0 right-0 w-20 h-20 sm:w-40 sm:h-40 bg-cyan-200 rounded-full opacity-20 translate-x-10 sm:translate-x-20 translate-y-10 sm:translate-y-20"></div>
          <div className="absolute top-1/2 left-1/4 w-3 h-3 sm:w-6 sm:h-6 bg-teal-300 rounded-full opacity-30"></div>
          <div className="absolute top-1/4 right-1/3 w-2 h-2 sm:w-4 sm:h-4 bg-emerald-300 rounded-full opacity-40"></div>
          <div className="absolute bottom-1/3 left-2/3 w-4 h-4 sm:w-8 sm:h-8 bg-cyan-300 rounded-full opacity-25"></div>
          
          <div className="max-w-lg mx-auto relative z-10">
            <div className="w-16 h-16 sm:w-24 sm:h-24 bg-gradient-to-br from-[#1162a8] to-emerald-600 rounded-2xl flex items-center justify-center mx-auto mb-6 sm:mb-8 shadow-xl transform -rotate-3 hover:-rotate-6 transition-transform duration-300">
              <div className="w-10 h-10 sm:w-16 sm:h-16 bg-white rounded-xl flex items-center justify-center">
                <Plus className="h-5 w-5 sm:h-8 sm:w-8 text-[#1162a8]" />
              </div>
            </div>
            <div className="space-y-3 sm:space-y-4">
              <h3 className="text-xl sm:text-2xl lg:text-3xl font-bold bg-gradient-to-r from-[#1162a8] to-emerald-600 bg-clip-text text-transparent">
                More Features Coming Soon
              </h3>
              <p className="text-sm sm:text-base lg:text-lg text-gray-600 leading-relaxed">
                Exciting new features to enhance your practice management experience
              </p>
              <div className="flex items-center justify-center space-x-2 mt-4 sm:mt-6">
                <div className="w-1.5 h-1.5 sm:w-2 sm:h-2 bg-[#1162a8] rounded-full animate-bounce"></div>
                <div className="w-1.5 h-1.5 sm:w-2 sm:h-2 bg-emerald-500 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
                <div className="w-1.5 h-1.5 sm:w-2 sm:h-2 bg-teal-500 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
              </div>
              <div className="mt-6 sm:mt-8 flex flex-wrap justify-center gap-2 sm:gap-3">
                <span className="px-3 py-1.5 sm:px-4 sm:py-2 bg-white rounded-full text-xs sm:text-sm font-medium text-[#1162a8] shadow-md border border-emerald-200">
                  Smart Scheduling
                </span>
                <span className="px-3 py-1.5 sm:px-4 sm:py-2 bg-white rounded-full text-xs sm:text-sm font-medium text-[#1162a8] shadow-md border border-emerald-200">
                  Advanced Analytics
                </span>
                <span className="px-3 py-1.5 sm:px-4 sm:py-2 bg-white rounded-full text-xs sm:text-sm font-medium text-[#1162a8] shadow-md border border-emerald-200">
                  Case Tracking
                </span>
              </div>
            </div>
          </div>
        </div>
        )}

      {/* Empty State - When all widgets are disabled */}
      {enabledWidgets.length === 0 && (
        <div className="flex flex-col items-center justify-center py-16 sm:py-24 px-4">
          <div className="w-16 h-16 sm:w-20 sm:h-20 bg-gray-100 rounded-full flex items-center justify-center mb-4 sm:mb-6">
            <Eye className="h-8 w-8 sm:h-10 sm:w-10 text-gray-400" />
          </div>
          <h3 className="text-lg sm:text-xl font-semibold text-gray-900 mb-2 text-center">
            Dashboard is Empty
          </h3>
          <p className="text-sm sm:text-base text-gray-600 text-center max-w-md mb-6">
            All widgets are currently hidden. Enable widgets from Dashboard Settings to customize your dashboard.
          </p>
          <Button
            onClick={() => window.location.href = "/dashboard/settings"}
            className="bg-[#1162a8] hover:bg-[#0f5497] text-white"
          >
            Go to Dashboard Settings
          </Button>
        </div>
      )}

      </div>

      <ProfileModal
        isOpen={profileModalOpen}
        onClose={() => setProfileModalOpen(false)}
        data={selectedProfile}
        isLoading={isLoadingProfile}
        onSave={handleSaveProfile}
      />
    </div>
  )
}
