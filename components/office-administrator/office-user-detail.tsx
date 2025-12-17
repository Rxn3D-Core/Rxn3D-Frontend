"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Card, CardContent } from "@/components/ui/card"
import { Textarea } from "@/components/ui/textarea"
import { Mail, MapPin, Phone, Eye, Search, Filter, UserPlus, User, Trash2, Upload, Image as ImageIcon } from "lucide-react"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Switch } from "@/components/ui/switch"
import { useAuth } from "@/contexts/auth-context"

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
  dateOfBirth?: string
  payType?: string
  payRate?: string
  username?: string
  licenseNumber?: string
  signature?: string
}

interface Activity {
  id: number
  user: string
  action: string
  target: string
  details: string
  timestamp: string
  hasAvatar?: boolean
}

interface OfficeUserDetailProps {
  user: User
  onBack: () => void
}

export function OfficeUserDetail({ user, onBack }: OfficeUserDetailProps) {
  const [activeTab, setActiveTab] = useState<"details" | "activity">("details")
  const [searchTerm, setSearchTerm] = useState("")
  const [entriesPerPage, setEntriesPerPage] = useState("10")
  const { impersonateUser } = useAuth()
  const [isImpersonating, setIsImpersonating] = useState(false)

  const handleViewAsUser = async () => {
    setIsImpersonating(true)
    await impersonateUser(user.id)
    setIsImpersonating(false)
  }

  // Mock activity data for office users
  const activities: Activity[] = [
    {
      id: 1,
      user: user.name,
      action: "Updated Profile",
      target: "Personal Information",
      details: "Changed phone number and address",
      timestamp: "2024-01-27, 11:42 AM",
    },
    {
      id: 2,
      user: user.name,
      action: "Changed Status",
      target: "Account Status",
      details: "Status changed to Active",
      timestamp: "2024-01-27, 10:26 AM",
    },
    {
      id: 3,
      user: "System",
      action: "Account Created",
      target: "User Account",
      details: "New office user account created",
      timestamp: "2024-01-26, 8:19 AM",
    },
    {
      id: 4,
      user: user.name,
      action: "Logged In",
      target: "Office Portal",
      details: "Successfully logged into office portal",
      timestamp: "2024-01-26, 6:08 PM",
    },
    {
      id: 5,
      user: user.name,
      action: "Updated Settings",
      target: "Notification Preferences",
      details: "Email notifications enabled",
      timestamp: "2024-01-25, 2:30 PM",
    },
  ]

  // Get user initials for avatar
  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map(word => word.charAt(0))
      .join('')
      .toUpperCase()
      .slice(0, 2)
  }

  return (
    <div className="flex h-full">
      {/* Left sidebar with user info */}
      <div className="w-80 border-r bg-white p-6">
        <div className="flex flex-col items-center">
          <Avatar className="h-32 w-32 mb-4">
            <AvatarImage src={user.avatar} alt={user.name} />
            <AvatarFallback className="text-3xl bg-blue-100 text-blue-600">
              {getInitials(user.name)}
            </AvatarFallback>
          </Avatar>
          
          <div className="flex items-center gap-3 mb-2">
            <h2 className="text-xl font-bold">{user.name}</h2>
            <Switch 
              defaultChecked={user.status === "Active"} 
              className="data-[state=checked]:bg-[#1162a8]"
            />
          </div>
          
          <div className="flex items-center gap-2 mb-6">
            <p className="text-gray-500">{user.userType}</p>
            <Button variant="ghost" size="sm" className="h-6 w-6 p-0">
              <User className="h-3 w-3" />
            </Button>
            <Button variant="ghost" size="sm" className="h-6 w-6 p-0 text-red-500">
              <Trash2 className="h-3 w-3" />
            </Button>
          </div>

          <div className="w-full space-y-4">
            <div className="flex items-start gap-3">
              <Mail className="h-5 w-5 text-gray-400 mt-0.5" />
              <div className="flex-1">
                <p className="text-sm">{user.email}</p>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <MapPin className="h-5 w-5 text-gray-400 mt-0.5" />
              <div className="flex-1">
                <p className="text-sm">{user.address || "123 Street address Ave, City, Country 1234"}</p>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <Phone className="h-5 w-5 text-gray-400 mt-0.5" />
              <div className="flex-1">
                <p className="text-sm">{user.phone}</p>
              </div>
            </div>
          </div>

          <Button
            variant="outline"
            className="w-full mt-6 bg-[#1162a8] text-white hover:bg-blue-700 hover:text-white"
            onClick={handleViewAsUser}
            disabled={isImpersonating}
          >
            {isImpersonating ? (
              <span className="flex items-center gap-2">
                <div className="h-4 w-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                Loading...
              </span>
            ) : (
              <span className="flex items-center gap-2">
                <Eye className="h-4 w-4" />
                View as User
              </span>
            )}
          </Button>
        </div>
      </div>

      {/* Main content area */}
      <div className="flex-1 bg-gray-50">
        {/* Header with back button */}
        <div className="bg-white border-b px-6 py-4">
          <Button variant="ghost" onClick={onBack} className="mb-2">
            ← Back to User Management
          </Button>
        </div>

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
          </div>
        </div>

        {/* Tab content */}
        <div className="p-6">
          {activeTab === "details" ? (
            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between mb-6">
                  <h3 className="text-lg font-semibold flex items-center gap-2">
                    Profile Details
                      <span className="text-gray-400"><svg width="25" height="26" viewBox="0 0 25 26" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <path d="M2.08325 22.3794C2.0831 21.0317 2.40983 19.7041 3.03542 18.5103C3.661 17.3166 4.56678 16.2924 5.67508 15.5256C6.78338 14.7588 8.06113 14.2722 9.39875 14.1076C10.7364 13.943 12.094 14.1052 13.3551 14.5805" stroke="#B4B0B0" strokeLinecap="round" strokeLinejoin="round"/>
                        <path d="M22.2688 17.8231C22.6837 17.4082 22.9168 16.8454 22.9168 16.2586C22.9168 15.6717 22.6837 15.1089 22.2688 14.694C21.8538 14.279 21.291 14.0459 20.7042 14.0459C20.1174 14.0459 19.5546 14.279 19.1396 14.694L14.9625 18.8731C14.7149 19.1207 14.5336 19.4266 14.4354 19.7627L13.5636 22.7523C13.5374 22.8419 13.5358 22.937 13.559 23.0274C13.5822 23.1178 13.6293 23.2004 13.6953 23.2664C13.7613 23.3324 13.8438 23.3795 13.9343 23.4027C14.0247 23.4258 14.1198 23.4243 14.2094 23.3981L17.199 22.5263C17.5351 22.4281 17.841 22.2468 18.0886 21.9992L22.2688 17.8231Z" stroke="#B4B0B0" strokeLinecap="round" strokeLinejoin="round"/>
                        <path d="M10.4166 14.0461C13.2931 14.0461 15.6249 11.7142 15.6249 8.83773C15.6249 5.96124 13.2931 3.62939 10.4166 3.62939C7.5401 3.62939 5.20825 5.96124 5.20825 8.83773C5.20825 11.7142 7.5401 14.0461 10.4166 14.0461Z" stroke="#B4B0B0" strokeLinecap="round" strokeLinejoin="round"/>
                        </svg>
                      </span>
                  </h3>
                </div>

                <div className="space-y-4">
                  <div className="flex items-center">
                    <span className="text-sm text-gray-500 w-32">Full Name:</span>
                    <span className="font-medium">{user.name}</span>
                  </div>

                  <div className="flex items-center">
                    <span className="text-sm text-gray-500 w-32">User Type:</span>
                    <span className="font-medium">{user.userType}</span>
                  </div>

                  <div className="flex items-center">
                    <span className="text-sm text-gray-500 w-32">Username:</span>
                    <span className="font-medium">{user.username || "cnyjms65"}</span>
                  </div>

                  <div className="flex items-center">
                    <span className="text-sm text-gray-500 w-32">Password:</span>
                    <div className="flex items-center gap-2">
                      <span className="font-medium">************</span>
                      <Button variant="outline" size="sm" className="h-6 px-2 text-xs">
                        Reset Password
                      </Button>
                    </div>
                  </div>

                  <div className="flex items-center">
                    <span className="text-sm text-gray-500 w-32">License Number:</span>
                    <span className="font-medium">{user.licenseNumber || "65789"}</span>
                  </div>

                  <div className="flex items-center">
                    <span className="text-sm text-gray-500 w-32">Email Address:</span>
                    <span className="font-medium">{user.email}</span>
                  </div>

                  <div className="flex items-center">
                    <span className="text-sm text-gray-500 w-32">Mobile:</span>
                    <span className="font-medium">{user.phone}</span>
                  </div>
                </div>

                {/* Signature Section */}
                <div className="mt-8">
                  <div className="flex items-start gap-4">
                    <div className="flex-1 max-w-md">
                      <label className="text-sm font-medium text-gray-700 mb-2 block">
                        Signature *
                      </label>
                      <Input 
                        placeholder="Enter signature" 
                        className="w-full"
                      />
                    </div>
                    <div className="flex flex-col items-center gap-2">
                      <div className="w-20 h-14 border border-gray-300 rounded bg-gray-50 flex items-center justify-center">
                        <ImageIcon className="h-5 w-5 text-gray-400" />
                      </div>
                      <p className="text-xs text-gray-500 text-center max-w-20 break-all">filenameamcnaesieuwoq.jpg</p>
                    </div>
                  </div>
                  <Button variant="outline" className="mt-3 flex items-center gap-2">
                    <Upload className="h-4 w-4" />
                    Upload Signature
                  </Button>
                </div>

                <div className="mt-8">
                  <h4 className="font-semibold mb-3">Other Notes</h4>
                  <Textarea
                    placeholder="Add notes about this user..."
                    className="min-h-[120px] resize-none"
                    defaultValue=""
                  />
                </div>
              </CardContent>
            </Card>
          ) : (
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
                      {activities.map((activity) => (
                        <tr key={activity.id} className="border-b hover:bg-gray-50">
                          <td className="px-6 py-4">
                            <div className="flex items-center gap-2">
                              <span className="text-sm">{activity.user}</span>
                            </div>
                          </td>
                          <td className="px-6 py-4 text-sm">{activity.action}</td>
                          <td className="px-6 py-4 text-sm">{activity.target}</td>
                          <td className="px-6 py-4 text-sm">{activity.details}</td>
                          <td className="px-6 py-4 text-sm">{activity.timestamp}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  )
}
