"use client"

import type React from "react"
import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Skeleton } from "@/components/ui/skeleton"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { Mail, Calendar, Building2, Shield, CheckCircle, XCircle } from "lucide-react"
import { getUserAvatar, getUserProfileImageUrl } from "@/utils/avatar-utils"
import type { UserProfileData } from "@/services/user-profile-service"
import type { UpdateMeProfileInput } from "@/lib/api/me"

const AVATAR_MAX_BYTES = 5 * 1024 * 1024
const AVATAR_ACCEPT = "image/jpeg,image/jpg,image/png"

interface UserProfileModalProps {
  isOpen: boolean
  onClose: () => void
  userData: UserProfileData | null
  isLoading: boolean
  onSave?: (input: UpdateMeProfileInput) => Promise<UserProfileData>
}

export function UserProfileModal({
  isOpen,
  onClose,
  userData,
  isLoading,
  onSave,
}: UserProfileModalProps) {
  const [firstName, setFirstName] = useState("")
  const [lastName, setLastName] = useState("")
  const [phone, setPhone] = useState("")
  const [workNumber, setWorkNumber] = useState("")
  const [avatarFile, setAvatarFile] = useState<File | null>(null)
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null)
  const [isSaving, setIsSaving] = useState(false)
  const [avatarError, setAvatarError] = useState<string | null>(null)

  useEffect(() => {
    if (!userData) return
    setFirstName(userData.first_name || "")
    setLastName(userData.last_name || "")
    setPhone(userData.phone ?? userData.mobile ?? "")
    setWorkNumber(userData.work_number ?? "")
    setAvatarFile(null)
    setAvatarPreview(userData.avatar ?? userData.image ?? null)
    setAvatarError(null)
  }, [userData])

  const getInitials = (first?: string, last?: string) => {
    if (!first) return "U"
    const firstInitial = first.charAt(0).toUpperCase()
    const lastInitial = last ? last.charAt(0).toUpperCase() : ""
    return firstInitial + lastInitial
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

  const getRoleDisplay = (roles?: UserProfileData["roles"]) => {
    if (!roles || roles.length === 0) return "No role assigned"
    return roles
      .map((role) => {
        const roleString =
          typeof role === "string" ? role : role?.name || role?.role || String(role)
        return roleString.replace(/_/g, " ").replace(/\b\w/g, (l) => l.toUpperCase())
      })
      .join(", ")
  }

  const handleAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    const allowedTypes = ["image/jpeg", "image/jpg", "image/png"]
    if (!allowedTypes.includes(file.type)) {
      setAvatarError("Avatar must be a JPG or PNG image.")
      return
    }
    if (file.size > AVATAR_MAX_BYTES) {
      setAvatarError("Avatar must be 5 MB or smaller.")
      return
    }

    setAvatarError(null)
    setAvatarFile(file)
    setAvatarPreview(URL.createObjectURL(file))
  }

  const handleSave = async () => {
    if (!onSave || !userData) return

    setIsSaving(true)
    try {
      const payload: UpdateMeProfileInput = {
        first_name: firstName.trim(),
        last_name: lastName.trim(),
        phone: phone.trim(),
        work_number: workNumber.trim(),
      }
      if (avatarFile) {
        payload.avatar = avatarFile
      }

      await onSave(payload)
      onClose()
    } catch {
      // Parent shows toast on failure
    } finally {
      setIsSaving(false)
    }
  }

  const displayAvatar =
    avatarPreview ??
    getUserAvatar(getUserProfileImageUrl(userData) || null)

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent
        showCloseButton
        className="flex flex-col gap-0 p-0 w-[calc(100vw-2rem)] max-w-[700px] max-h-[min(90dvh,900px)] overflow-hidden"
      >
        <DialogHeader className="shrink-0 px-4 py-4 sm:px-6 sm:py-5 border-b bg-gray-50 pr-12">
          <DialogTitle className="text-xl sm:text-2xl font-bold text-gray-800">My Profile</DialogTitle>
        </DialogHeader>

        {isLoading ? (
          <div className="flex-1 min-h-0 overflow-y-auto p-4 sm:p-6 space-y-4">
            <Skeleton className="h-[150px] w-full" />
            <Skeleton className="h-8 w-full" />
            <Skeleton className="h-8 w-full" />
            <Skeleton className="h-8 w-full" />
            <Skeleton className="h-20 w-full" />
          </div>
        ) : userData ? (
          <div className="flex-1 min-h-0 overflow-y-auto overflow-x-hidden p-4 sm:p-6 space-y-5 sm:space-y-6">
            <div className="flex flex-col md:flex-row gap-5 sm:gap-6">
              <div className="flex flex-col items-center gap-3 shrink-0 md:w-36">
                <Avatar className="h-24 w-24 ring-4 ring-gray-200">
                  <AvatarImage
                    src={displayAvatar}
                    alt={`${firstName} ${lastName}`}
                  />
                  <AvatarFallback className="bg-[#1162a8] text-white text-2xl font-medium">
                    {getInitials(firstName, lastName)}
                  </AvatarFallback>
                </Avatar>
                <label className="text-sm font-medium text-[#1162a8] cursor-pointer hover:underline">
                  Change photo
                  <input
                    type="file"
                    accept={AVATAR_ACCEPT}
                    className="sr-only"
                    onChange={handleAvatarChange}
                  />
                </label>
                {avatarError && (
                  <p className="text-xs text-red-600 text-center max-w-[200px]">{avatarError}</p>
                )}
                <p className="text-xs text-gray-500 text-center">JPG or PNG, max 5 MB</p>
              </div>

              <div className="flex-1 min-w-0 w-full space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="profile-first-name">First name</Label>
                    <Input
                      id="profile-first-name"
                      value={firstName}
                      onChange={(e) => setFirstName(e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="profile-last-name">Last name</Label>
                    <Input
                      id="profile-last-name"
                      value={lastName}
                      onChange={(e) => setLastName(e.target.value)}
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="profile-phone">Phone</Label>
                  <Input
                    id="profile-phone"
                    type="tel"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="profile-work-number">Work number</Label>
                  <Input
                    id="profile-work-number"
                    type="tel"
                    value={workNumber}
                    onChange={(e) => setWorkNumber(e.target.value)}
                    placeholder="Optional"
                  />
                </div>

                <div className="rounded-lg border border-gray-100 bg-gray-50 p-3 sm:p-4 space-y-2">
                  <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">
                    Managed by your administrator
                  </p>
                  <div className="flex items-start gap-2 text-sm text-gray-700 min-w-0">
                    <Mail className="w-4 h-4 shrink-0 mt-0.5" />
                    <span className="break-all">{userData.email}</span>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {userData.roles && userData.roles.length > 0 && (
                      <Badge variant="outline" className="flex items-center gap-1">
                        <Shield className="w-3 h-3" />
                        {getRoleDisplay(userData.roles)}
                      </Badge>
                    )}
                    {userData.status && (
                      <Badge variant={userData.status === "active" ? "default" : "secondary"}>
                        {userData.status}
                      </Badge>
                    )}
                  </div>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
              <div className="bg-gray-50 p-4 sm:p-5 rounded-lg border border-gray-100 min-w-0">
                <h3 className="text-lg font-semibold mb-4 text-gray-700 flex items-center gap-2">
                  <Shield className="w-5 h-5" />
                  Account
                </h3>
                <div className="space-y-3 text-sm">
                  <div>
                    <p className="text-gray-500 mb-1">User ID</p>
                    <p className="font-mono text-gray-800">{userData.id}</p>
                  </div>
                  {userData.customer_id && (
                    <div>
                      <p className="text-gray-500 mb-1 flex items-center gap-2">
                        <Building2 className="w-4 h-4" />
                        Customer ID
                      </p>
                      <p className="text-gray-800">{userData.customer_id}</p>
                    </div>
                  )}
                  <div>
                    <p className="text-gray-500 mb-1 flex items-center gap-2">
                      <Calendar className="w-4 h-4" />
                      Member since
                    </p>
                    <p className="text-gray-800">{formatDate(userData.created_at)}</p>
                  </div>
                  {userData.is_email_verified !== undefined && (
                    <Badge
                      variant={userData.is_email_verified ? "default" : "secondary"}
                      className={
                        userData.is_email_verified
                          ? "bg-[#1162a8] text-white hover:bg-[#0d4f8c]"
                          : ""
                      }
                    >
                      {userData.is_email_verified ? (
                        <>
                          <CheckCircle className="w-3 h-3 mr-1" />
                          Email verified
                        </>
                      ) : (
                        <>
                          <XCircle className="w-3 h-3 mr-1" />
                          Email not verified
                        </>
                      )}
                    </Badge>
                  )}
                </div>
              </div>

              {userData.customers && userData.customers.length > 0 && (
                <div className="bg-gray-50 p-4 sm:p-5 rounded-lg border border-gray-100 min-w-0">
                  <h3 className="text-lg font-semibold mb-3 text-gray-700 flex items-center gap-2">
                    <Building2 className="w-5 h-5 shrink-0" />
                    Locations
                  </h3>
                  <div className="space-y-2">
                    {userData.customers.map((customer) => (
                      <div
                        key={customer.id}
                        className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between p-3 bg-white rounded border border-gray-200 min-w-0"
                      >
                        <div className="min-w-0">
                          <p className="font-medium text-gray-800 break-words">{customer.name}</p>
                          <p className="text-sm text-gray-500 capitalize">{customer.type}</p>
                        </div>
                        {customer.is_primary && (
                          <Badge variant="default" className="w-fit shrink-0">
                            Primary
                          </Badge>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        ) : (
          <div className="flex-1 py-8 text-center text-gray-500 px-4">No profile data available</div>
        )}

        <div className="shrink-0 flex flex-col sm:flex-row sm:justify-end gap-2 sm:gap-4 p-4 border-t bg-gray-50">
          <Button
            variant="outline"
            onClick={onClose}
            disabled={isSaving}
            className="w-full sm:w-auto px-6 py-2 border-gray-300 text-gray-700 hover:bg-gray-100"
          >
            Cancel
          </Button>
          {onSave && userData && (
            <Button
              onClick={handleSave}
              disabled={isLoading || isSaving || !firstName.trim() || !lastName.trim()}
              className="w-full sm:w-auto px-6 py-2 hover:bg-[#0d4f8c] h-10 bg-[#1162a8] text-white"
            >
              {isSaving ? "Saving…" : "Save changes"}
            </Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}
