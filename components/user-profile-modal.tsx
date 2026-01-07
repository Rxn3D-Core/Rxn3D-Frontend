"use client"

import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { User, Mail, Phone, Calendar, Building2, Shield, CheckCircle, XCircle } from "lucide-react"
import { getUserAvatar } from "@/utils/avatar-utils"
import type { UserProfileData } from "@/services/user-profile-service"

interface UserProfileModalProps {
  isOpen: boolean
  onClose: () => void
  userData: UserProfileData | null
  isLoading: boolean
}

export function UserProfileModal({ isOpen, onClose, userData, isLoading }: UserProfileModalProps) {
  const getInitials = (firstName?: string, lastName?: string) => {
    if (!firstName) return "U"
    const first = firstName.charAt(0).toUpperCase()
    const last = lastName ? lastName.charAt(0).toUpperCase() : ""
    return first + last
  }

  const formatDate = (dateString?: string) => {
    if (!dateString) return "N/A"
    try {
      return new Date(dateString).toLocaleDateString("en-US", {
        year: "numeric",
        month: "long",
        day: "numeric",
      })
    } catch {
      return dateString
    }
  }

  const getRoleDisplay = (roles?: string[] | any[]) => {
    if (!roles || roles.length === 0) return "No role assigned"
    return roles
      .map(role => {
        // Handle both string and object roles
        const roleString = typeof role === 'string' ? role : (role?.name || role?.role || String(role))
        return roleString.replace(/_/g, " ").replace(/\b\w/g, l => l.toUpperCase())
      })
      .join(", ")
  }

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-[700px] p-0 overflow-hidden max-h-[90vh]">
        <DialogHeader className="px-6 py-5 border-b bg-gray-50">
          <DialogTitle className="text-2xl font-bold text-gray-800">User Profile</DialogTitle>
        </DialogHeader>

        {isLoading ? (
          <div className="p-6 space-y-4">
            <Skeleton className="h-[150px] w-full" />
            <Skeleton className="h-8 w-full" />
            <Skeleton className="h-8 w-full" />
            <Skeleton className="h-8 w-full" />
            <Skeleton className="h-20 w-full" />
          </div>
        ) : userData ? (
          <div className="p-6 overflow-y-auto">
            {/* Profile Header */}
            <div className="flex flex-col md:flex-row gap-6 mb-6">
              <div className="flex-shrink-0">
                <Avatar className="h-24 w-24 md:h-32 md:w-32 ring-4 ring-gray-200">
                  <AvatarImage
                    src={getUserAvatar(userData.image, userData.email || userData.id || userData.first_name)}
                    alt={`${userData.first_name} ${userData.last_name}`}
                  />
                  <AvatarFallback className="bg-[#1162a8] text-white text-2xl font-medium">
                    {getInitials(userData.first_name, userData.last_name)}
                  </AvatarFallback>
                </Avatar>
              </div>
              
              <div className="flex-1">
                <div className="flex items-start justify-between mb-2">
                  <div>
                    <h2 className="text-2xl font-bold text-gray-800 mb-1">
                      {userData.first_name} {userData.last_name}
                    </h2>
                    <p className="text-gray-600 mb-3">{userData.email}</p>
                  </div>
                  <Badge 
                    variant={userData.status === "active" ? "default" : "secondary"}
                    className="ml-2"
                  >
                    {userData.status || "Unknown"}
                  </Badge>
                </div>
                
                <div className="flex flex-wrap gap-2 mb-4">
                  {userData.roles && userData.roles.length > 0 && (
                    <Badge variant="outline" className="flex items-center gap-1">
                      <Shield className="w-3 h-3" />
                      {getRoleDisplay(userData.roles)}
                    </Badge>
                  )}
                  {userData.is_email_verified !== undefined && (
                    <Badge 
                      variant={userData.is_email_verified ? "default" : "secondary"} 
                      className={`flex items-center gap-1 ${userData.is_email_verified ? "bg-[#1162a8] text-white hover:bg-[#0d4f8c]" : ""}`}
                    >
                      {userData.is_email_verified ? (
                        <>
                          <CheckCircle className="w-3 h-3" />
                          Verified
                        </>
                      ) : (
                        <>
                          <XCircle className="w-3 h-3" />
                          Unverified
                        </>
                      )}
                    </Badge>
                  )}
                </div>
              </div>
            </div>

            {/* Profile Details */}
            <div className="grid md:grid-cols-2 gap-6">
              {/* Personal Information */}
              <div className="bg-gray-50 p-5 rounded-lg border border-gray-100">
                <h3 className="text-lg font-semibold mb-4 text-gray-700 flex items-center gap-2">
                  <User className="w-5 h-5" />
                  Personal Information
                </h3>
                <div className="space-y-3">
                  <div>
                    <p className="text-sm font-medium text-gray-500 mb-1">Full Name</p>
                    <p className="text-base text-gray-800">
                      {userData.first_name} {userData.last_name}
                    </p>
                  </div>
                  
                  <div>
                    <p className="text-sm font-medium text-gray-500 mb-1 flex items-center gap-2">
                      <Mail className="w-4 h-4" />
                      Email
                    </p>
                    <p className="text-base text-gray-800">{userData.email}</p>
                  </div>
                  
                  {userData.mobile && (
                    <div>
                      <p className="text-sm font-medium text-gray-500 mb-1 flex items-center gap-2">
                        <Phone className="w-4 h-4" />
                        Mobile
                      </p>
                      <p className="text-base text-gray-800">{userData.mobile}</p>
                    </div>
                  )}
                  
                  {userData.username && (
                    <div>
                      <p className="text-sm font-medium text-gray-500 mb-1">Username</p>
                      <p className="text-base text-gray-800">{userData.username}</p>
                    </div>
                  )}
                </div>
              </div>

              {/* Account Information */}
              <div className="bg-gray-50 p-5 rounded-lg border border-gray-100">
                <h3 className="text-lg font-semibold mb-4 text-gray-700 flex items-center gap-2">
                  <Shield className="w-5 h-5" />
                  Account Information
                </h3>
                <div className="space-y-3">
                  <div>
                    <p className="text-sm font-medium text-gray-500 mb-1">User ID</p>
                    <p className="text-base text-gray-800 font-mono text-sm">{userData.id}</p>
                  </div>
                  
                  {userData.customer_id && (
                    <div>
                      <p className="text-sm font-medium text-gray-500 mb-1 flex items-center gap-2">
                        <Building2 className="w-4 h-4" />
                        Customer ID
                      </p>
                      <p className="text-base text-gray-800">{userData.customer_id}</p>
                    </div>
                  )}
                  
                  <div>
                    <p className="text-sm font-medium text-gray-500 mb-1 flex items-center gap-2">
                      <Calendar className="w-4 h-4" />
                      Created At
                    </p>
                    <p className="text-base text-gray-800">{formatDate(userData.created_at)}</p>
                  </div>
                  
                  {userData.updated_at && (
                    <div>
                      <p className="text-sm font-medium text-gray-500 mb-1 flex items-center gap-2">
                        <Calendar className="w-4 h-4" />
                        Last Updated
                      </p>
                      <p className="text-base text-gray-800">{formatDate(userData.updated_at)}</p>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Additional Information */}
            {userData.description && (
              <div className="mt-6 bg-gray-50 p-5 rounded-lg border border-gray-100">
                <h3 className="text-lg font-semibold mb-3 text-gray-700">Description</h3>
                <p className="text-base text-gray-800">{userData.description}</p>
              </div>
            )}

            {/* Associated Customers */}
            {userData.customers && userData.customers.length > 0 && (
              <div className="mt-6 bg-gray-50 p-5 rounded-lg border border-gray-100">
                <h3 className="text-lg font-semibold mb-3 text-gray-700 flex items-center gap-2">
                  <Building2 className="w-5 h-5" />
                  Associated Locations
                </h3>
                <div className="space-y-2">
                  {userData.customers.map((customer) => (
                    <div key={customer.id} className="flex items-center justify-between p-3 bg-white rounded border border-gray-200">
                      <div>
                        <p className="font-medium text-gray-800">{customer.name}</p>
                        <p className="text-sm text-gray-500 capitalize">{customer.type}</p>
                      </div>
                      {customer.is_primary && (
                        <Badge variant="default">Primary</Badge>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        ) : (
          <div className="py-8 text-center text-gray-500">No profile data available</div>
        )}

        <div className="flex justify-end gap-4 p-4 border-t bg-gray-50">
          <Button variant="outline" onClick={onClose} className="px-6 py-2 border-gray-300 text-gray-700 hover:bg-gray-100">
            Close
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}

