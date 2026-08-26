"use client"

import { useState, useEffect, useCallback } from "react"
import { Button } from "@/components/ui/button"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Card, CardContent } from "@/components/ui/card"
import { Edit, Mail, MapPin, Phone, Search, Filter } from "lucide-react"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { OperatingHoursTab } from "@/components/lab-administrator/lab-profile-operating-hours"
import { PickupDeliveryTab } from "@/components/lab-administrator/lab-profile-pickup-delivery"
import {
  EditCustomerProfileModal,
  type EditCustomerProfileData,
} from "@/components/lab-office-management/edit-customer-profile-modal"
import { useAuth } from "@/contexts/auth-context"
import { resolveDisplayTimezone } from "@/utils/time-utils"

interface User {
  id: number
  name: string
  email: string
  phone: string
  userType: string
  joinDate: string
  status: string
  avatar?: string
  address?: string
  website?: string
  city?: string
  postal_code?: string
  stateName?: string
  stateId?: number | null
  countryName?: string
  countryId?: number | null
  labNumber?: string
  contactName?: string
  contactEmail?: string
  contactNumber?: string
  release_casepan?: string
  code?: string
  logo_url?: string | null
  dateOfBirth?: string
  payType?: string
  payRate?: string
}

interface Activity {
  id: number
  user: string
  action: string
  target: string
  details: string
  timestamp: string
}

interface StaffUserDetailProps {
  user: User
  onBack: () => void
  mode?: "default" | "lab" | "office"
  hideOtherNotes?: boolean
  allowEdit?: boolean
  onProfileUpdated?: (updated: Partial<EditCustomerProfileData> & { logo_url?: string }) => void
  customerId?: number
  customerType?: "lab" | "office"
  hoursData?: {
    workingDays: Array<{
      day: string
      enabled: boolean
      startTime: string
      endTime: string
    }>
    timezone: string
    holidays: string
  }
  pickupData?: {
    serviceArea: string
    pickupDays: string
    cutOffTime: string
    frequency: string
    window: string
  }
  deliveryData?: {
    serviceArea: string
    deliveryDays: string
    defaultTime: string
    window: string
  }
  rushSettings?: {
    enabled: boolean
    description: string
    rush_type?: "fixed" | "flexible"
    fixed_turnaround_days?: number
    fixed_rush_fee_percentage?: string
  }
  labAdmins?: Array<{
    id: number
    name: string
    email: string
    phone?: string
    status?: string
    role?: string
  }>
  officeAdmins?: Array<{
    id: number
    name: string
    email: string
    phone?: string
    status?: string
    role?: string
  }>
  doctors?: Array<{
    id: number
    name: string
    email: string
    phone?: string
    status?: string
    role?: string
  }>
}

export function StaffUserDetail({
  user,
  onBack,
  mode = "default",
  hideOtherNotes = false,
  allowEdit = false,
  onProfileUpdated,
  customerId,
  customerType = "lab",
  hoursData,
  pickupData,
  deliveryData,
  rushSettings,
  labAdmins = [],
  officeAdmins = [],
  doctors = [],
}: StaffUserDetailProps) {
  const { fetchUserActivity } = useAuth()
  const isLabMode = mode === "lab"
  const isOfficeMode = mode === "office"
  const [activeTab, setActiveTab] = useState<"details" | "activity" | "lab_admins" | "office_admins" | "doctors" | "operating_hours" | "pickup_delivery">("details")
  const [searchTerm, setSearchTerm] = useState("")
  const [entriesPerPage, setEntriesPerPage] = useState("10")
  const [activities, setActivities] = useState<Activity[]>([])
  const [isActivityLoading, setIsActivityLoading] = useState(false)
  const [isEditModalOpen, setIsEditModalOpen] = useState(false)
  const [displayUser, setDisplayUser] = useState(user)
  const sidebarPhone = (isLabMode || isOfficeMode)
    ? displayUser.phone || displayUser.contactNumber || "-"
    : displayUser.phone || "-"

  useEffect(() => {
    setDisplayUser(user)
  }, [user])

  const canEditProfile = allowEdit && (isLabMode || isOfficeMode)

  const handleProfileSuccess = (updated: Partial<EditCustomerProfileData> & { logo_url?: string }) => {
    setDisplayUser((prev) => ({
      ...prev,
      name: updated.name ?? prev.name,
      website: updated.website ?? prev.website,
      address: updated.address
        ? [updated.address, updated.city, updated.stateName, updated.countryName, updated.postal_code]
            .filter(Boolean)
            .join(", ")
        : prev.address,
      city: updated.city ?? prev.city,
      postal_code: updated.postal_code ?? prev.postal_code,
      stateName: updated.stateName ?? prev.stateName,
      stateId: updated.stateId ?? prev.stateId,
      countryName: updated.countryName ?? prev.countryName,
      countryId: updated.countryId ?? prev.countryId,
      release_casepan: updated.release_casepan ?? prev.release_casepan,
      code: updated.code ?? prev.code,
      logo_url: updated.logo_url ?? prev.logo_url,
    }))
    onProfileUpdated?.(updated)
  }

  const loadActivity = useCallback(async () => {
    if (!user.id) return
    setIsActivityLoading(true)
    try {
      const response = await fetchUserActivity(user.id, { per_page: Number(entriesPerPage) })
      const items: Activity[] = (response?.data ?? []).map((item: any) => {
        const changeDetails = (item.changes ?? [])
          .map((c: any) => c.old != null ? `${c.field}: "${c.old}" → "${c.new}"` : `${c.field}: "${c.new}"`)
          .join(", ")
        return {
          id: item.id,
          user: item.user?.name ?? "System",
          action: item.event_label ?? item.event ?? "-",
          target: `${item.auditable?.type_label ?? "Record"} #${item.auditable?.id ?? ""}`,
          details: changeDetails || "-",
          timestamp: item.created_at
            ? new Date(item.created_at).toLocaleString("en-US", { dateStyle: "short", timeStyle: "short" })
            : "-",
        }
      })
      setActivities(items)
    } catch {
      setActivities([])
    } finally {
      setIsActivityLoading(false)
    }
  }, [user.id, entriesPerPage, fetchUserActivity])

  useEffect(() => {
    if (activeTab === "activity") {
      loadActivity()
    }
  }, [activeTab, loadActivity])

  const activeStaffList =
    isLabMode
      ? labAdmins
      : activeTab === "office_admins"
        ? officeAdmins
        : doctors

  const filteredStaff = activeStaffList.filter((admin) => {
    const query = searchTerm.toLowerCase()
    return (
      admin.name.toLowerCase().includes(query) ||
      admin.email.toLowerCase().includes(query) ||
      (admin.phone || "").toLowerCase().includes(query)
    )
  })

  return (
    <div className="flex flex-col lg:flex-row h-full overflow-auto">
      {/* Left sidebar with user info */}
      <div className="w-full lg:w-80 border-r bg-white p-6">
        <div className="flex flex-col items-center">
          <Avatar className="h-32 w-32 mb-4">
            <AvatarImage
              src={displayUser.logo_url || "/placeholder.svg?height=128&width=128&query=customer-logo"}
              alt={displayUser.name}
            />
            <AvatarFallback className="text-3xl bg-blue-100 text-blue-600">
              {(displayUser.name || "??")
                .split(" ")
                .map((word) => word[0])
                .slice(0, 2)
                .join("")
                .toUpperCase()}
            </AvatarFallback>
          </Avatar>
          <h2 className="text-xl font-bold mb-1">{displayUser.name}</h2>
          <p className="text-gray-500 mb-6">{displayUser.userType}</p>

          <div className="w-full space-y-4">
            <div className="flex items-start gap-3">
              <Mail className="h-5 w-5 text-gray-400 mt-0.5" />
              <div className="flex-1">
                <p className="text-sm">{displayUser.email}</p>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <MapPin className="h-5 w-5 text-gray-400 mt-0.5" />
              <div className="flex-1">
                <p className="text-sm">{displayUser.address || "-"}</p>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <Phone className="h-5 w-5 text-gray-400 mt-0.5" />
              <div className="flex-1">
                <p className="text-sm">{sidebarPhone}</p>
              </div>
            </div>
          </div>

          {canEditProfile && (
            <Button
              variant="outline"
              className="w-full mt-6"
              onClick={() => setIsEditModalOpen(true)}
            >
              <Edit className="h-4 w-4 mr-2" />
              Edit {isLabMode ? "Lab" : "Office"}
            </Button>
          )}

          {!isLabMode && !isOfficeMode && (
            <Button variant="outline" className="w-full mt-6">
              View as User
            </Button>
          )}
        </div>
      </div>

      {/* Main content area */}
      <div className="flex-1 bg-gray-50 overflow-y-auto">
        {/* Tab navigation */}
        <div className="bg-white border-b">
          <div className="flex">
            <button
              className={`px-8 py-4 font-medium ${
                activeTab === "details"
                  ? "bg-[#e8f4fd] text-[#1162a8] border-b-2 border-[#1162a8]"
                  : "text-gray-600 hover:text-gray-900"
              }`}
              onClick={() => setActiveTab("details")}
            >
              User Details
            </button>
            {isLabMode ? (
              <>
                <button
                  className={`px-8 py-4 font-medium ${
                    activeTab === "lab_admins"
                      ? "bg-[#e8f4fd] text-[#1162a8] border-b-2 border-[#1162a8]"
                      : "text-gray-600 hover:text-gray-900"
                  }`}
                  onClick={() => setActiveTab("lab_admins")}
                >
                  Lab Admins
                </button>
                <button
                  className={`px-8 py-4 font-medium ${
                    activeTab === "operating_hours"
                      ? "bg-[#e8f4fd] text-[#1162a8] border-b-2 border-[#1162a8]"
                      : "text-gray-600 hover:text-gray-900"
                  }`}
                  onClick={() => setActiveTab("operating_hours")}
                >
                  Operating Hours
                </button>
                <button
                  className={`px-8 py-4 font-medium ${
                    activeTab === "pickup_delivery"
                      ? "bg-[#e8f4fd] text-[#1162a8] border-b-2 border-[#1162a8]"
                      : "text-gray-600 hover:text-gray-900"
                  }`}
                  onClick={() => setActiveTab("pickup_delivery")}
                >
                  Pick up & Delivery
                </button>
              </>
            ) : isOfficeMode ? (
              <>
                <button
                  className={`px-8 py-4 font-medium ${
                    activeTab === "office_admins"
                      ? "bg-[#e8f4fd] text-[#1162a8] border-b-2 border-[#1162a8]"
                      : "text-gray-600 hover:text-gray-900"
                  }`}
                  onClick={() => setActiveTab("office_admins")}
                >
                  Office Admins
                </button>
                <button
                  className={`px-8 py-4 font-medium ${
                    activeTab === "doctors"
                      ? "bg-[#e8f4fd] text-[#1162a8] border-b-2 border-[#1162a8]"
                      : "text-gray-600 hover:text-gray-900"
                  }`}
                  onClick={() => setActiveTab("doctors")}
                >
                  Doctors
                </button>
              </>
            ) : (
              <button
                className={`px-8 py-4 font-medium ${
                  activeTab === "activity"
                    ? "bg-[#e8f4fd] text-[#1162a8] border-b-2 border-[#1162a8]"
                    : "text-gray-600 hover:text-gray-900"
                }`}
                onClick={() => setActiveTab("activity")}
              >
                Activity
              </button>
            )}
          </div>
        </div>

        {/* Tab content */}
        <div className={isLabMode && (activeTab === "operating_hours" || activeTab === "pickup_delivery") ? "" : "p-6"}>
          {activeTab === "details" ? (
            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between mb-6">
                  <h3 className="text-lg font-semibold flex items-center gap-2">
                    {isLabMode ? "Lab Info" : isOfficeMode ? "Office Info" : "Profile Details"}
                    {canEditProfile ? (
                      <button
                        type="button"
                        onClick={() => setIsEditModalOpen(true)}
                        className="text-gray-400 hover:text-gray-600 transition-colors"
                        title={`Edit ${isLabMode ? "Lab" : "Office"} Info`}
                      >
                        <Edit className="h-4 w-4" />
                      </button>
                    ) : (
                      <span className="text-gray-400"><svg width="25" height="26" viewBox="0 0 25 26" fill="none" xmlns="http://www.w3.org/2000/svg">
<path d="M2.08325 22.3794C2.0831 21.0317 2.40983 19.7041 3.03542 18.5103C3.661 17.3166 4.56678 16.2924 5.67508 15.5256C6.78338 14.7588 8.06113 14.2722 9.39875 14.1076C10.7364 13.943 12.094 14.1052 13.3551 14.5805" stroke="#B4B0B0" strokeLinecap="round" strokeLinejoin="round"/>
<path d="M22.2688 17.8231C22.6837 17.4082 22.9168 16.8454 22.9168 16.2586C22.9168 15.6717 22.6837 15.1089 22.2688 14.694C21.8538 14.279 21.291 14.0459 20.7042 14.0459C20.1174 14.0459 19.5546 14.279 19.1396 14.694L14.9625 18.8731C14.7149 19.1207 14.5336 19.4266 14.4354 19.7627L13.5636 22.7523C13.5374 22.8419 13.5358 22.937 13.559 23.0274C13.5822 23.1178 13.6293 23.2004 13.6953 23.2664C13.7613 23.3324 13.8438 23.3795 13.9343 23.4027C14.0247 23.4258 14.1198 23.4243 14.2094 23.3981L17.199 22.5263C17.5351 22.4281 17.841 22.2468 18.0886 21.9992L22.2688 17.8231Z" stroke="#B4B0B0" strokeLinecap="round" strokeLinejoin="round"/>
<path d="M10.4166 14.0461C13.2931 14.0461 15.6249 11.7142 15.6249 8.83773C15.6249 5.96124 13.2931 3.62939 10.4166 3.62939C7.5401 3.62939 5.20825 5.96124 5.20825 8.83773C5.20825 11.7142 7.5401 14.0461 10.4166 14.0461Z" stroke="#B4B0B0" strokeLinecap="round" strokeLinejoin="round"/>
</svg>
</span>
                    )}
                  </h3>
                </div>

                {isLabMode || isOfficeMode ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-y-4 gap-x-12">
                    <div><p className="text-sm text-gray-500 mb-1">{isLabMode ? "Lab Name:" : "Office Name:"}</p><p className="font-medium">{displayUser.name || "-"}</p></div>
                    <div><p className="text-sm text-gray-500 mb-1">{isLabMode ? "Lab ID:" : "Office ID:"}</p><p className="font-medium">{displayUser.id || "-"}</p></div>
                    <div><p className="text-sm text-gray-500 mb-1">{isLabMode ? "Lab Number:" : "Office Number:"}</p><p className="font-medium">{displayUser.labNumber || "-"}</p></div>
                    <div><p className="text-sm text-gray-500 mb-1">{isLabMode ? "Lab Email:" : "Office Email:"}</p><p className="font-medium">{displayUser.email || "-"}</p></div>
                    <div><p className="text-sm text-gray-500 mb-1">Address:</p><p className="font-medium">{displayUser.address || "-"}</p></div>
                    <div><p className="text-sm text-gray-500 mb-1">City:</p><p className="font-medium">{displayUser.city || "-"}</p></div>
                    <div><p className="text-sm text-gray-500 mb-1">State:</p><p className="font-medium">{displayUser.stateName || "-"}</p></div>
                    <div><p className="text-sm text-gray-500 mb-1">Country:</p><p className="font-medium">{displayUser.countryName || "-"}</p></div>
                    <div><p className="text-sm text-gray-500 mb-1">Postal Code:</p><p className="font-medium">{displayUser.postal_code || "-"}</p></div>
                    <div><p className="text-sm text-gray-500 mb-1">Website:</p><p className="font-medium">{displayUser.website || "-"}</p></div>
                    <div><p className="text-sm text-gray-500 mb-1">Contact Name:</p><p className="font-medium">{displayUser.contactName || "-"}</p></div>
                    <div><p className="text-sm text-gray-500 mb-1">Contact Email:</p><p className="font-medium">{displayUser.contactEmail || "-"}</p></div>
                    <div><p className="text-sm text-gray-500 mb-1">Contact Number:</p><p className="font-medium">{displayUser.contactNumber || "-"}</p></div>
                    <div><p className="text-sm text-gray-500 mb-1">Joining Date:</p><p className="font-medium">{displayUser.joinDate || "-"}</p></div>
                    <div><p className="text-sm text-gray-500 mb-1">{isLabMode ? "Lab Code:" : "Office Code:"}</p><p className="font-medium">{displayUser.code || "-"}</p></div>
                    {isLabMode && <div><p className="text-sm text-gray-500 mb-1">Release Casepan:</p><p className="font-medium">{displayUser.release_casepan || "-"}</p></div>}
                  </div>
                ) : (
                  <div className="grid grid-cols-2 gap-y-4 gap-x-12">
                    <div><p className="text-sm text-gray-500 mb-1">Full Name:</p><p className="font-medium">{displayUser.name}</p></div>
                    <div><p className="text-sm text-gray-500 mb-1">User Type:</p><p className="font-medium">{displayUser.userType}</p></div>
                    <div><p className="text-sm text-gray-500 mb-1">Email Address:</p><p className="font-medium">{displayUser.email}</p></div>
                    <div><p className="text-sm text-gray-500 mb-1">Mobile Number:</p><p className="font-medium">{displayUser.phone || "-"}</p></div>
                    <div><p className="text-sm text-gray-500 mb-1">Address:</p><p className="font-medium">{displayUser.address || "-"}</p></div>
                    <div><p className="text-sm text-gray-500 mb-1">Joining Date:</p><p className="font-medium">{displayUser.joinDate || "-"}</p></div>
                  </div>
                )}

                {!hideOtherNotes && (
                  <div className="mt-8">
                    <h4 className="font-semibold mb-3">Other Notes</h4>
                    <div className="min-h-[120px] rounded border border-gray-200 bg-white p-3 text-sm text-gray-500">
                      No notes available.
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          ) : ((isLabMode && activeTab === "lab_admins") || (isOfficeMode && (activeTab === "office_admins" || activeTab === "doctors"))) ? (
            <Card>
              <CardContent className="p-0">
                <div className="p-4 border-b flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="text-sm">Show</span>
                    <Select value={entriesPerPage} onValueChange={setEntriesPerPage}>
                      <SelectTrigger className="w-[70px] h-8">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="10">10</SelectItem>
                        <SelectItem value="20">20</SelectItem>
                        <SelectItem value="50">50</SelectItem>
                      </SelectContent>
                    </Select>
                    <span className="text-sm">entries</span>
                  </div>
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                    <Input
                      type="text"
                      placeholder={isLabMode ? "Search lab admins" : activeTab === "office_admins" ? "Search office admins" : "Search doctors"}
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="pl-10 pr-4 h-8 w-[220px]"
                    />
                  </div>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="text-left text-sm font-medium text-gray-700 border-b bg-gray-50">
                        <th className="px-6 py-3">Name</th>
                        <th className="px-6 py-3">Email</th>
                        <th className="px-6 py-3">Phone</th>
                        <th className="px-6 py-3">Role</th>
                        <th className="px-6 py-3">Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredStaff.length === 0 ? (
                        <tr>
                          <td colSpan={5} className="px-6 py-6 text-sm text-gray-500 text-center">
                            {isLabMode ? "No lab admins found." : activeTab === "office_admins" ? "No office admins found." : "No doctors found."}
                          </td>
                        </tr>
                      ) : (
                        filteredStaff.slice(0, Number(entriesPerPage)).map((admin) => (
                          <tr key={admin.id} className="border-b hover:bg-gray-50">
                            <td className="px-6 py-4 text-sm">{admin.name}</td>
                            <td className="px-6 py-4 text-sm">{admin.email}</td>
                            <td className="px-6 py-4 text-sm">{admin.phone || "-"}</td>
                            <td className="px-6 py-4 text-sm">{admin.role || (isLabMode ? "lab_admin" : activeTab === "office_admins" ? "office_admin" : "doctor")}</td>
                            <td className="px-6 py-4 text-sm">{admin.status || "-"}</td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          ) : isLabMode && activeTab === "operating_hours" ? (
            <OperatingHoursTab
              hoursData={
                hoursData || {
                  workingDays: [],
                  timezone: resolveDisplayTimezone(null),
                  holidays: "All Federal Holidays",
                }
              }
              customerId={customerId}
              customerType={customerType}
            />
          ) : isLabMode && activeTab === "pickup_delivery" ? (
            <PickupDeliveryTab
              pickupData={
                pickupData || {
                  serviceArea: "",
                  pickupDays: "",
                  cutOffTime: "",
                  frequency: "",
                  window: "",
                }
              }
              deliveryData={
                deliveryData || {
                  serviceArea: "",
                  deliveryDays: "",
                  defaultTime: "",
                  window: "",
                }
              }
              rushSettings={
                rushSettings || {
                  enabled: false,
                  description: "Allow users to request expedited processing.",
                }
              }
              customerId={customerId}
            />
          ) : !isLabMode && !isOfficeMode ? (
            <Card>
              <CardContent className="p-0">
                {/* Activity filters */}
                <div className="p-4 border-b flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="text-sm">Show</span>
                    <Select value={entriesPerPage} onValueChange={setEntriesPerPage}>
                      <SelectTrigger className="w-[70px] h-8">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="10">10</SelectItem>
                        <SelectItem value="20">20</SelectItem>
                        <SelectItem value="50">50</SelectItem>
                      </SelectContent>
                    </Select>
                    <span className="text-sm">entries</span>
                  </div>

                  <div className="flex items-center gap-4">
                    <Button variant="outline" size="sm" className="flex items-center gap-2">
                      <Filter className="h-4 w-4" />
                      Filter
                    </Button>
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                      <Input
                        type="text"
                        placeholder="Search"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="pl-10 pr-4 h-8 w-[200px]"
                      />
                    </div>
                  </div>
                </div>

                {/* Activity table */}
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="text-left text-sm font-medium text-gray-700 border-b bg-gray-50">
                        <th className="px-6 py-3">User</th>
                        <th className="px-6 py-3">Action</th>
                        <th className="px-6 py-3">Target</th>
                        <th className="px-6 py-3">Details</th>
                        <th className="px-6 py-3">Timestamp</th>
                        <th className="px-6 py-3"></th>
                      </tr>
                    </thead>
                    <tbody>
                      {isActivityLoading ? (
                        <tr>
                          <td colSpan={5} className="px-6 py-8 text-center text-sm text-gray-500">
                            Loading activity...
                          </td>
                        </tr>
                      ) : activities.length === 0 ? (
                        <tr>
                          <td colSpan={5} className="px-6 py-8 text-center text-sm text-gray-500">
                            No activity found.
                          </td>
                        </tr>
                      ) : (
                        activities.map((activity) => (
                          <tr key={activity.id} className="border-b hover:bg-gray-50">
                            <td className="px-6 py-4 text-sm">{activity.user}</td>
                            <td className="px-6 py-4 text-sm">{activity.action}</td>
                            <td className="px-6 py-4 text-sm">{activity.target}</td>
                            <td className="px-6 py-4 text-sm">{activity.details}</td>
                            <td className="px-6 py-4 text-sm">{activity.timestamp}</td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          ) : null}
        </div>
      </div>

      {canEditProfile && (
        <EditCustomerProfileModal
          open={isEditModalOpen}
          onOpenChange={setIsEditModalOpen}
          customerType={isLabMode ? "lab" : "office"}
          customer={{
            id: displayUser.id,
            name: displayUser.name,
            email: displayUser.email,
            website: displayUser.website,
            address: displayUser.address,
            city: displayUser.city,
            postal_code: displayUser.postal_code,
            stateName: displayUser.stateName,
            stateId: displayUser.stateId,
            countryName: displayUser.countryName,
            countryId: displayUser.countryId,
            release_casepan: displayUser.release_casepan,
            code: displayUser.code,
            logo_url: displayUser.logo_url,
          }}
          onSuccess={handleProfileSuccess}
        />
      )}
    </div>
  )
}
