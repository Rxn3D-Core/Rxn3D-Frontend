"use client"

import { useState, useEffect, useRef, useMemo } from "react"
import { KpiCard } from "./kpi-card"
import { PlanCard } from "./plan-card"
import { Search, X, Eye, MoreHorizontal, Plus, Mail, Trash2, CirclePause, EllipsisVertical, CircleOff, Menu} from 'lucide-react'
import { Button } from "@/components/ui/button"
import { useAuth } from "@/contexts/auth-context"
import { Input } from "@/components/ui/input"
import { useToast } from "@/components/ui/use-toast"
import { useConnections } from "@/hooks/use-connections"
import { useInvitations, useSendInvitation, useAcceptInvitation, useDeleteInvitation, useResendInvitation } from "@/hooks/use-invitations"
import { Skeleton } from "@/components/ui/skeleton"
import { InvitationForm } from "@/components/invitation-form"
import { useCustomer } from "@/contexts/customer-context"
import { CustomerSearchBox } from "@/components/CustomerSearchBox"
import { ProfileModal, type ProfileData } from "@/components/profile-modal"
import { fetchProfileData, saveProfileData } from "@/lib/api-profile"
import { useFetchUsersQuery } from "@/hooks/use-users"
import { useFetchUserInvitations } from "@/hooks/use-user-invitations"
import { useDashboardSettings } from "@/hooks/use-dashboard-settings"
import { WIDGET_IDS } from "@/lib/dashboard-widgets"

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

export function LabAdminDashboard() {
  const { user } = useAuth()
  const { toast } = useToast()
  const userRole = user?.roles?.[0] || "lab_admin"
  const userId = user?.id
  const { isEnabled } = useDashboardSettings(userRole, userId)

  // Use cached hooks - automatic fetching with cache!
  const { data: connectionsData, isLoading: isLoadingConnections, error: connectionsError } = useConnections(user?.id)
  const practices = connectionsData?.practices || []
  const labs = connectionsData?.labs || []

  const selectedLocation = JSON.parse(localStorage.getItem("selectedLocation") || "null")
  const invitedBy = user?.roles?.includes("superadmin") ? 0 : selectedLocation?.id

  // Use cached invitations hook
  const { data: invitationsData, isLoading: isLoadingInvitations } = useInvitations(invitedBy)
  const sent = invitationsData?.sent || []
  const received = invitationsData?.received || []

  // Mutation hooks for invitations
  const { mutate: sendInvite } = useSendInvitation()
  const { mutate: acceptInvite } = useAcceptInvitation()
  const { mutate: deleteInvite } = useDeleteInvitation()
  const { mutate: resendInvite } = useResendInvitation()

  const { isLoading: isSearching, customers, isCustomersLoading, customersError } = useCustomer()
  const [activeTabLabs, setActiveTabLabs] = useState("connected")

  const [practiceSearchQuery, setPracticeSearchQuery] = useState("")
  const [practicesTab, setPracticesTab] = useState("connected")
  const [labsTab, setLabsTab] = useState("connected")
  const [showPracticeForm, setShowPracticeForm] = useState(false)
  const [showLabForm, setShowLabForm] = useState(false)
  const [isSearchingPractices, setIsSearchingPractices] = useState(false)

  // Profile modal states
  const [profileModalOpen, setProfileModalOpen] = useState(false)
  const [selectedProfile, setSelectedProfile] = useState<ProfileData | null>(null)
  const [isLoadingProfile, setIsLoadingProfile] = useState(false)
  const [activeTabUsers, setActiveTabUsers] = useState("connected")
  const [activeTabPractices, setActiveTabPractices] = useState("connected")
  const [userSearchQuery, setUserSearchQuery] = useState("")
  const [debouncedUserSearchQuery, setDebouncedUserSearchQuery] = useState("")
  const [showUserForm, setShowUserForm] = useState(false)

  // Debounce user search query
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedUserSearchQuery(userSearchQuery)
    }, 300)

    return () => clearTimeout(timer)
  }, [userSearchQuery])

  // Loading state combines both queries
  const isLoading = isLoadingConnections || isLoadingInvitations
  const error = connectionsError

  // Filter practices based on tab
  const filteredPractices =
    practicesTab === "connected"
      ? practices.filter((p) => p.status?.toLowerCase() === "active")
      : practicesTab === "sent"
        ? (sent?.data || []).filter((p) => p.type === "Office")
        : (received?.data)

  // Filter labs based on tab
  const filteredLabs =
    labsTab === "connected"
      ? labs.filter((l) => l.status?.toLowerCase() === "active")
      : labsTab === "sent"
        ? (sent?.data || []).filter((l) => l.type === "Lab")
        : (received?.data)


  // Mock data for KPIs
  const kpiData = {
    totalRevenue: "$64,587.70",
    revenueChange: "+40.3%",
    outstandingBalance: "$11,567.44",
    balanceChange: "+20.3%",
    totalCases: "2657",
    casesChange: "-2.3%",
    deliveryRate: "97.50%",
    deliveryChange: "+40.3%",
  }

  const handleOpenProfile = async (id: number, type: "Office" | "Lab") => {
    setProfileModalOpen(true)
    setIsLoadingProfile(true)
    setSelectedProfile(null)

    try {
      const profileData = await fetchProfileData(id, type === "Office" ? "office" : "lab")
      setSelectedProfile({ ...profileData, type: type === "Office" ? "office" : "lab" })
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

  // Fetch real users data
  const { data: usersData, isLoading: isLoadingUsers, refetch: refetchUsers } = useFetchUsersQuery({
    status: "Active",
  })

  // Fetch pending user invitations
  const { data: pendingInvitationsRaw, isLoading: isLoadingUserInvitations } = useFetchUserInvitations(invitedBy)
  
  // Ensure pendingInvitations is always an array to prevent rendering errors
  const pendingInvitations = useMemo(() => {
    if (Array.isArray(pendingInvitationsRaw)) {
      return pendingInvitationsRaw
    }
    // If it's an object with a data property, extract it
    if (pendingInvitationsRaw && typeof pendingInvitationsRaw === 'object' && 'data' in pendingInvitationsRaw) {
      return Array.isArray(pendingInvitationsRaw.data) ? pendingInvitationsRaw.data : []
    }
    return []
  }, [pendingInvitationsRaw])

  // Transform users data for display
  const users = ((usersData as any)?.data || []).map((user: any) => {
    // Safely extract role name - handle both object and string formats
    let roleName = "User"
    const roleObj = user.customer_users?.[0]?.role
    if (roleObj) {
      // If role is an object, extract the name property
      roleName = typeof roleObj === "string" ? roleObj : (roleObj?.name || "User")
    } else if (user.roles?.[0]) {
      // If roles array exists, get first role
      const firstRole = user.roles[0]
      roleName = typeof firstRole === "string" ? firstRole : (firstRole?.name || "User")
    }
    
    return {
      id: user.id,
      name: `${user.first_name || ""} ${user.last_name || ""}`.trim() || user.email,
      role: roleName,
      status: user.status?.toLowerCase() === "active" ? "connected" : user.status?.toLowerCase() || "unknown",
      email: user.email,
    }
  })

  // Transform pending invitations for display
  const pendingInvitationUsers = (Array.isArray(pendingInvitations) ? pendingInvitations : [])
    .filter((inv: any) => inv.status === "Pending")
    .map((inv: any) => ({
      id: `inv-${inv.token}`,
      name: inv.name,
      role: inv.role,
      status: "pending",
      email: inv.email,
      token: inv.token,
    }))

  // Filter users based on active tab
  const allUsers = activeTabUsers === "connected" 
    ? users.filter((u: any) => u.status === "connected")
    : pendingInvitationUsers

  const filteredUsers = allUsers.filter(
    (user: any) =>
      user.name.toLowerCase().includes(debouncedUserSearchQuery.toLowerCase()) ||
      user.role.toLowerCase().includes(debouncedUserSearchQuery.toLowerCase()) ||
      user.email?.toLowerCase().includes(debouncedUserSearchQuery.toLowerCase()),
  )

  return (
    <div className="sm:p-4 md:p-6 lg:p-8 xl:p-12 bg-white min-h-screen">
      <div className="space-y-4 sm:space-y-6 lg:space-y-8">
        {/* Header Section */}
        <div className="mb-4 sm:mb-6">
          <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold text-gray-900 mb-2">Lab Dashboard</h1>
          <p className="text-sm sm:text-base text-gray-600">Monitor your lab operations and manage connections</p>
        </div>

        {/* KPI Cards */}
        {isEnabled(WIDGET_IDS.KPI_CARDS) && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 lg:gap-6 mb-4 sm:mb-6">
          <KpiCard
            title="Total Revenue"
            value={kpiData.totalRevenue}
            change={kpiData.revenueChange}
            isPositive={true}
            icon="dollar"
          />
          <KpiCard
            title="Outstanding Balance"
            value={kpiData.outstandingBalance}
            change={kpiData.balanceChange}
            isPositive={true}
            icon="document"
          />
          <KpiCard
            title="Total Cases"
            value={kpiData.totalCases}
            change={kpiData.casesChange}
            isPositive={false}
            icon="dollar"
          />
          <KpiCard
            title="On-time Delivery Rate"
            value={kpiData.deliveryRate}
            change={kpiData.deliveryChange}
            isPositive={true}
            icon="dollar"
          />
        </div>
        )}

        {/* Plan Statistics */}
        {isEnabled(WIDGET_IDS.STATUS_CARDS) && (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 sm:gap-4 lg:gap-6 mb-6 sm:mb-8">
          <PlanCard title="Rush Cases" count={15} color="text-red-500" />
          <PlanCard title="On Hold Cases" count={135} color="text-red-500" />
          <PlanCard title="Due Today" count={15} color="text-green-500" />
          <PlanCard title="New Stage notes" count={110} color="text-black" />
          <PlanCard title="Late Cases" count={10} color="text-black" />
        </div>
        )}

        {/* Main content grid */}
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-4 sm:gap-6 lg:gap-8">
          {/* My Practices Section */}
          {isEnabled(WIDGET_IDS.MY_PRACTICES) && (
          <div className="bg-white rounded-xl shadow-sm border border-[#e4e6ef] overflow-hidden">
            <div className="p-3 sm:p-4 border-b border-[#e4e6ef] bg-[#1162a8]">
              <div className="flex justify-between items-center">
                <div>
                  <h2 className="text-base sm:text-lg font-semibold text-white mb-1">My Practice</h2>
                  <p className="text-blue-100 text-xs">Manage your practice connections</p>
                </div>
                <Button 
                  className="bg-white text-[#1162a8] hover:bg-blue-50 shadow-md font-medium text-xs sm:text-sm px-2 sm:px-3 py-1 sm:py-2"
                  onClick={() => setShowPracticeForm(!showPracticeForm)}
                  hidden
                >
                  <Plus className="h-3 w-3 sm:h-4 sm:w-4 mr-1 sm:mr-2" />
                  <span className="hidden sm:inline">New Practice</span>
                  <span className="sm:hidden">New</span>
                </Button>
              </div>
            </div>

            <div className="p-3 sm:p-4 lg:p-6 border-b border-[#e4e6ef]">
              <div className="relative mb-4 sm:mb-6">
                <CustomerSearchBox
                  type="Office"
                  placeholder="Search practices..."
                  onSelect={(customer) => {
                    handleOpenProfile(customer.id, "Office")
                  }}
                  isLoading={isSearchingPractices}
                  searchState={{
                    query: practiceSearchQuery,
                    setQuery: setPracticeSearchQuery,
                  }}
                />
              </div>
              
              {showPracticeForm && (
                <div className="p-3 sm:p-4 bg-slate-50 rounded-lg border border-[#e4e6ef] mb-4 sm:mb-6">
                  <InvitationForm 
                    type="Practice" 
                    onSuccess={() => setShowPracticeForm(false)}
                  />
                </div>
              )}

              {/* Responsive tabs */}
              <div className="flex flex-col sm:flex-row border-b border-[#e4e6ef]">
                <button
                  className={`flex-1 text-center py-2 sm:py-3 px-2 sm:px-4 font-medium transition-all text-sm sm:text-base ${
                    practicesTab === "connected" 
                      ? "border-b-2 sm:border-b-2 border-[#1162a8] text-[#1162a8] bg-blue-50" 
                      : "text-gray-500 hover:text-[#1162a8] hover:bg-gray-50"
                  }`}
                  onClick={() => setPracticesTab("connected")}
                >
                  <span className="hidden sm:inline">Connected Practices</span>
                  <span className="sm:hidden">Connected</span>
                  <span className="block sm:inline">({practices.filter(p => p.status?.toLowerCase() === "active").length})</span>
                </button>
                <button
                  className={`flex-1 text-center py-2 sm:py-3 px-2 sm:px-4 font-medium transition-all text-sm sm:text-base ${
                    practicesTab === "sent" 
                      ? "border-b-2 sm:border-b-2 border-[#1162a8] text-[#1162a8] bg-blue-50" 
                      : "text-gray-500 hover:text-[#1162a8] hover:bg-gray-50"
                  }`}
                  onClick={() => setPracticesTab("sent")}
                >
                  <span className="hidden sm:inline">Request Sent</span>
                  <span className="sm:hidden">Sent</span>
                  <span className="block sm:inline">({(sent?.data || []).filter(p => p.type === "Office").length})</span>
                </button>
                <button
                  className={`flex-1 text-center py-2 sm:py-3 px-2 sm:px-4 font-medium transition-all text-sm sm:text-base ${
                    practicesTab === "received" 
                      ? "border-b-2 sm:border-b-2 border-[#1162a8] text-[#1162a8] bg-blue-50" 
                      : "text-gray-500 hover:text-[#1162a8] hover:bg-gray-50"
                  }`}
                  onClick={() => setPracticesTab("received")}
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
                        <Skeleton className="h-4 sm:h-5 w-24 sm:w-40" />
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
                  <div className="text-red-500 font-medium mb-2">Failed to load practices</div>
                  <p className="text-sm text-gray-600">{error}</p>
                </div>
              ) : filteredPractices.length > 0 ? (
                <div className="divide-y divide-[#e4e6ef]">
                  {filteredPractices.map((practice) => {
                    if (practicesTab === "connected") {
                      return (
                        <div
                          key={practice.id}
                          className="flex flex-col sm:flex-row sm:justify-between sm:items-center p-3 sm:p-6 hover:bg-[#f5f5f5] cursor-pointer transition-all duration-200 group space-y-2 sm:space-y-0"
                        >
                          <div className="flex-1">
                            <div className="text-[#1162a8] font-semibold text-base sm:text-lg group-hover:text-blue-700 transition-colors">
                              {practice.name}
                            </div>
                            <div className="text-xs sm:text-sm text-[#a19d9d] mt-1">{practice.email}</div>
                          </div>
                          <div className="flex items-center justify-between sm:justify-end gap-2 sm:gap-4">
                            <span className={`px-2 sm:px-3 py-1 sm:py-1.5 rounded-full text-xs font-medium ${getStatusBadgeClass(practice.status || '')}`}>
                              {getStatusLabel(practice.status || '')}
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
                    } else if (practicesTab === "sent") {
                      return (
                        <div key={practice.id} className="p-3 sm:p-6 hover:bg-[#f5f5f5] flex flex-col sm:flex-row sm:justify-between sm:items-center group space-y-2 sm:space-y-0">
                          <div className="flex-1">
                            <div className="text-[#1162a8] font-semibold text-base sm:text-lg group-hover:text-blue-700 transition-colors">{practice.name}</div>
                            <div className="text-xs sm:text-sm text-[#a19d9d] mt-1">{practice.email}</div>
                          </div>
                          <div className="flex items-center justify-between sm:justify-end gap-2 sm:gap-4">
                            <span className={`px-2 sm:px-3 py-1 sm:py-1.5 rounded-full text-xs font-medium ${getStatusBadgeClass(practice.status || '')}`}>
                              {getStatusLabel(practice.status || '')}
                            </span>
                            {practice.status === 'Pending' && (
                              <>
                                <button
                                  className="p-1.5 sm:p-2 text-[#a19d9d] hover:text-blue-500 hover:bg-blue-50 rounded-full transition-all"
                                  onClick={() => {
                                    resendInvite(practice.id, {
                                      onSuccess: () => {
                                        toast({ title: "Invitation resent successfully" })
                                      },
                                      onError: () => {
                                        toast({ title: "Failed to resend invitation", variant: "destructive" })
                                      }
                                    })
                                  }}
                                  aria-label={`Resend invitation for ${practice.name}`}
                                  title="Resend Invitation"
                                >
                                  <Mail className="h-3 w-3 sm:h-4 sm:w-4" />
                                </button>
                                <button
                                  className="p-1.5 sm:p-2 text-[#a19d9d] hover:text-red-500 hover:bg-red-50 rounded-full transition-all"
                                  onClick={() => {
                                    deleteInvite(practice.id, {
                                      onSuccess: () => {
                                        toast({ title: "Invitation deleted" })
                                      },
                                      onError: () => {
                                        toast({ title: "Failed to delete invitation", variant: "destructive" })
                                      }
                                    })
                                  }}
                                  aria-label={`Delete invitation for ${practice.name}`}
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
                      return (
                        <div key={practice.invited_by?.id} className="p-3 sm:p-6 hover:bg-[#f5f5f5] flex flex-col sm:flex-row sm:justify-between sm:items-center group space-y-2 sm:space-y-0">
                          <div className="flex-1">
                            <div className="text-[#1162a8] font-semibold text-base sm:text-lg group-hover:text-blue-700 transition-colors">{practice?.invited_by?.name}</div>
                            <div className="text-xs sm:text-sm text-[#a19d9d] mt-1">{practice?.invited_by?.email}</div>
                          </div>
                          <div className="flex items-center justify-between sm:justify-end gap-2 sm:gap-4">
                            <span className={`px-2 sm:px-3 py-1 sm:py-1.5 rounded-full text-xs font-medium ${getStatusBadgeClass(practice.status || '')}`}>
                              {getStatusLabel(practice.status || '')}
                            </span>
                            {practice.status === 'Pending' && (
                              <>
                                <button className="p-1.5 sm:p-2 text-[#a19d9d] hover:text-green-500 hover:bg-green-50 rounded-full transition-all"
                                  onClick={() => {
                                    acceptInvite(practice.id, {
                                      onSuccess: () => {
                                        toast({ title: "Invitation accepted successfully" })
                                      },
                                      onError: () => {
                                        toast({ title: "Failed to accept invitation", variant: "destructive" })
                                      }
                                    })
                                  }}
                                  aria-label={`Accept invitation for ${practice?.invited_by?.name || 'Unknown'}`}
                                  title="Accept Invitation"
                                >
                                  <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" className="sm:w-4 sm:h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20 6 9 17l-5-5"/></svg>
                                </button>
                                <button className="p-1.5 sm:p-2 text-[#a19d9d] hover:text-red-500 hover:bg-red-50 rounded-full transition-all"
                                  onClick={() => {
                                    deleteInvite(practice.id, {
                                      onSuccess: () => {
                                        toast({ title: "Invitation cancelled" })
                                      },
                                      onError: () => {
                                        toast({ title: "Failed to cancel invitation", variant: "destructive" })
                                      }
                                    })
                                  }}
                                  aria-label={`Cancel invitation for ${practice?.invited_by?.name || 'Unknown'}`}
                                  title="Cancel Invitation"
                                >
                                  <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" className="sm:w-4 sm:h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg>
                                </button>
                                <button
                                  className="p-1.5 sm:p-2 text-[#a19d9d] hover:text-red-500 hover:bg-red-50 rounded-full transition-all"
                                  onClick={() => {
                                    deleteInvite(practice.id, {
                                      onSuccess: () => {
                                        toast({ title: "Invitation deleted" })
                                      },
                                      onError: () => {
                                        toast({ title: "Failed to delete invitation", variant: "destructive" })
                                      }
                                    })
                                  }}
                                  aria-label={`Delete invitation for ${practice.name}`}
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
                  <h3 className="font-semibold text-gray-900 mb-2 text-sm sm:text-base">No practices found</h3>
                  <p className="text-gray-600 text-xs sm:text-sm">Add a new practice to get started with connections.</p>
                </div>
              )}
            </div>
          </div>
          )}

          {/* My Users Section */}
          {isEnabled(WIDGET_IDS.MY_USERS_LAB) && (
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
                      refetchUsers()
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
                  <span className="hidden sm:inline">Connected User</span>
                  <span className="sm:hidden">Connected</span>
                  <span className="block sm:inline">({filteredUsers.filter(u => u.status.toLowerCase() === "connected").length})</span>
                </button>
                <button
                  className={`flex-1 text-center py-2 sm:py-3 px-2 sm:px-4 font-medium transition-all text-sm sm:text-base ${
                    activeTabUsers === "request"
                      ? "border-b-2 sm:border-b-2 border-[#1162a8] text-[#1162a8] bg-blue-50"
                      : "text-[#a19d9d] hover:text-[#1162a8] hover:bg-gray-50"
                  }`}
                  onClick={() => handleTabClick("request", "users")}
                >
                  <span className="hidden sm:inline">Request Sent</span>
                  <span className="sm:hidden">Sent</span>
                  <span className="block sm:inline">({pendingInvitationUsers.length})</span>
                </button>
              </div>
            </div>

            <div className="max-h-80 sm:max-h-96 overflow-y-auto">
              {isLoadingUsers || isLoadingUserInvitations ? (
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
              ) : filteredUsers.length > 0 ? (
                <div className="divide-y divide-[#d9d9d9]">
                  {filteredUsers.map((user: any) => (
                    <div
                      key={user.id}
                      className="flex flex-col sm:flex-row sm:justify-between sm:items-center p-3 sm:p-6 hover:bg-[#f5f5f5] cursor-pointer transition-all duration-200 group space-y-2 sm:space-y-0"
                    >
                      <div className="flex-1">
                        <div className="text-[#1162a8] font-semibold text-base sm:text-lg group-hover:text-emerald-600 transition-colors">
                          {user.name}
                        </div>
                        <div className="text-xs sm:text-sm text-[#a19d9d] mt-1">
                          {user.role} {user.email && `• ${user.email}`}
                        </div>
                      </div>
                      <div className="flex items-center justify-between sm:justify-end gap-2 sm:gap-4">
                        <span className={`px-2 sm:px-3 py-1 sm:py-1.5 rounded-full text-xs font-medium ${getStatusBadgeClass(user.status)}`}>
                          {getStatusLabel(user.status)}
                        </span>
                        {user.status === "pending" && user.token ? (
                          <div className="flex items-center gap-1 sm:gap-2">
                            <button
                              className="p-1.5 sm:p-2 text-[#a19d9d] hover:text-blue-500 hover:bg-blue-50 rounded-full transition-all"
                              onClick={async () => {
                                // Resend invitation logic can be added here
                                toast({
                                  title: "Info",
                                  description: "Resend functionality coming soon",
                                })
                              }}
                              aria-label={`Resend invitation for ${user.name}`}
                              title="Resend Invitation"
                            >
                              <Mail className="h-3 w-3 sm:h-4 sm:w-4" />
                            </button>
                            <button
                              className="p-1.5 sm:p-2 text-[#a19d9d] hover:text-red-500 hover:bg-red-50 rounded-full transition-all"
                              onClick={async () => {
                                // Delete invitation logic can be added here
                                toast({
                                  title: "Info",
                                  description: "Delete functionality coming soon",
                                })
                              }}
                              aria-label={`Delete invitation for ${user.name}`}
                              title="Delete Invitation"
                            >
                              <Trash2 className="h-3 w-3 sm:h-4 sm:w-4" />
                            </button>
                          </div>
                        ) : (
                          <div className="flex items-center gap-1 sm:gap-2">
                            <button className="p-1.5 sm:p-2 text-[#a19d9d] hover:text-orange-500 hover:bg-orange-50 rounded-full transition-all">
                              <CirclePause className="h-3 w-3 sm:h-4 sm:w-4" />
                            </button>
                            <button className="p-1.5 sm:p-2 text-[#a19d9d] hover:text-red-500 hover:bg-red-50 rounded-full transition-all">
                              {user.status === "declined" ? (
                                <CircleOff className="h-3 w-3 sm:h-4 sm:w-4 text-[#eb0303]" />
                              ) : (
                                <CircleOff className="h-3 w-3 sm:h-4 sm:w-4" />
                              )}
                            </button>
                            <button className="p-1.5 sm:p-2 text-[#a19d9d] hover:text-gray-600 hover:bg-gray-100 rounded-full transition-all">
                              <EllipsisVertical className="h-3 w-3 sm:h-4 sm:w-4" />
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="p-8 sm:p-12 text-center">
                  <div className="w-12 h-12 sm:w-16 sm:h-16 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-4">
                    <Plus className="h-6 w-6 sm:h-8 sm:w-8 text-slate-400" />
                  </div>
                  <h3 className="font-semibold text-gray-900 mb-2 text-sm sm:text-base">No users found</h3>
                  <p className="text-gray-600 text-xs sm:text-sm">
                    {activeTabUsers === "connected" 
                      ? "No connected users yet. Invite users to get started." 
                      : "No pending invitations."}
                  </p>
                </div>
              )}
            </div>

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
        <div className="bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 rounded-xl border border-blue-200 p-6 sm:p-8 lg:p-12 text-center shadow-lg relative overflow-hidden">
          {/* Background decorative elements */}
          <div className="absolute top-0 left-0 w-16 h-16 sm:w-32 sm:h-32 bg-blue-200 rounded-full opacity-20 -translate-x-8 sm:-translate-x-16 -translate-y-8 sm:-translate-y-16"></div>
          <div className="absolute bottom-0 right-0 w-20 h-20 sm:w-40 sm:h-40 bg-purple-200 rounded-full opacity-20 translate-x-10 sm:translate-x-20 translate-y-10 sm:translate-y-20"></div>
          <div className="absolute top-1/2 left-1/4 w-3 h-3 sm:w-6 sm:h-6 bg-indigo-300 rounded-full opacity-30"></div>
          <div className="absolute top-1/4 right-1/3 w-2 h-2 sm:w-4 sm:h-4 bg-blue-300 rounded-full opacity-40"></div>
          <div className="absolute bottom-1/3 left-2/3 w-4 h-4 sm:w-8 sm:h-8 bg-purple-300 rounded-full opacity-25"></div>
          
          <div className="max-w-lg mx-auto relative z-10">
            <div className="w-16 h-16 sm:w-24 sm:h-24 bg-gradient-to-br from-[#1162a8] to-blue-600 rounded-2xl flex items-center justify-center mx-auto mb-6 sm:mb-8 shadow-xl transform rotate-3 hover:rotate-6 transition-transform duration-300">
              <div className="w-10 h-10 sm:w-16 sm:h-16 bg-white rounded-xl flex items-center justify-center">
                <Plus className="h-5 w-5 sm:h-8 sm:w-8 text-[#1162a8]" />
              </div>
            </div>
            <div className="space-y-3 sm:space-y-4">
              <h3 className="text-xl sm:text-2xl lg:text-3xl font-bold bg-gradient-to-r from-[#1162a8] to-purple-600 bg-clip-text text-transparent">
                More Features Coming Soon
              </h3>
              <p className="text-sm sm:text-base lg:text-lg text-gray-600 leading-relaxed">
                We're crafting innovative tools to revolutionize your lab management experience
              </p>
              <div className="flex items-center justify-center space-x-2 mt-4 sm:mt-6">
                <div className="w-1.5 h-1.5 sm:w-2 sm:h-2 bg-[#1162a8] rounded-full animate-bounce"></div>
                <div className="w-1.5 h-1.5 sm:w-2 sm:h-2 bg-blue-500 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
                <div className="w-1.5 h-1.5 sm:w-2 sm:h-2 bg-purple-500 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
              </div>
              <div className="mt-6 sm:mt-8 flex flex-wrap justify-center gap-2 sm:gap-3">
                <span className="px-3 py-1.5 sm:px-4 sm:py-2 bg-white rounded-full text-xs sm:text-sm font-medium text-[#1162a8] shadow-md border border-blue-200">
                  Advanced Analytics
                </span>
                <span className="px-3 py-1.5 sm:px-4 sm:py-2 bg-white rounded-full text-xs sm:text-sm font-medium text-[#1162a8] shadow-md border border-blue-200">
                  Detailed Insights
                </span>
                <span className="px-3 py-1.5 sm:px-4 sm:py-2 bg-white rounded-full text-xs sm:text-sm font-medium text-[#1162a8] shadow-md border border-blue-200">
                  Automation Tools
                </span>
              </div>
            </div>
          </div>
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
