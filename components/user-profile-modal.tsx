"use client"

import type React from "react"
import { useEffect, useState } from "react"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Skeleton } from "@/components/ui/skeleton"
import { InputOTP, InputOTPGroup, InputOTPSlot } from "@/components/ui/input-otp"
import {
  Briefcase,
  Building2,
  Calendar,
  Camera,
  CheckCircle,
  Mail,
  MapPin,
  Phone,
  Shield,
  UserRound,
  XCircle,
} from "lucide-react"
import type { UpdateMeProfileInput } from "@/lib/api/me"
import type { UserProfileData } from "@/services/user-profile-service"
import {
  confirmCurrentUserEmailChange,
  leaveCurrentUserCustomer,
  sendCurrentUserEmailChangeOtp,
} from "@/services/user-profile-service"
import { getUserAvatar, getUserProfileImageUrl } from "@/utils/avatar-utils"

const AVATAR_MAX_BYTES = 5 * 1024 * 1024
const AVATAR_ACCEPT = "image/jpeg,image/jpg,image/png"

interface UserProfileModalProps {
  isOpen: boolean
  onClose: () => void
  userData: UserProfileData | null
  isLoading: boolean
  onSave?: (input: UpdateMeProfileInput) => Promise<UserProfileData>
  onEmailUpdated?: (profile: UserProfileData) => void
  onLeftCustomer?: (profile: UserProfileData, customerId: number) => void
}

export function UserProfileModal({
  isOpen,
  onClose,
  userData,
  isLoading,
  onSave,
  onEmailUpdated,
  onLeftCustomer,
}: UserProfileModalProps) {
  const [firstName, setFirstName] = useState("")
  const [lastName, setLastName] = useState("")
  const [phone, setPhone] = useState("")
  const [workNumber, setWorkNumber] = useState("")
  const [email, setEmail] = useState("")
  const [otp, setOtp] = useState("")
  const [codeSent, setCodeSent] = useState(false)
  const [isSendingOtp, setIsSendingOtp] = useState(false)
  const [isConfirmingEmail, setIsConfirmingEmail] = useState(false)
  const [emailError, setEmailError] = useState<string | null>(null)
  const [leavingCustomerId, setLeavingCustomerId] = useState<number | null>(null)
  const [leaveError, setLeaveError] = useState<string | null>(null)
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
    setEmail(userData.email || "")
    setOtp("")
    setCodeSent(false)
    setEmailError(null)
    setLeaveError(null)
    setLeavingCustomerId(null)
    setAvatarFile(null)
    setAvatarPreview(userData.avatar ?? userData.image ?? null)
    setAvatarError(null)
  }, [userData])

  useEffect(() => {
    return () => {
      if (avatarPreview?.startsWith("blob:")) {
        URL.revokeObjectURL(avatarPreview)
      }
    }
  }, [avatarPreview])

  const getInitials = (first?: string, last?: string) => {
    if (!first) return "U"
    const firstInitial = first.charAt(0).toUpperCase()
    const lastInitial = last ? last.charAt(0).toUpperCase() : ""
    return `${firstInitial}${lastInitial}`
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
        return roleString.replace(/_/g, " ").replace(/\b\w/g, (letter) => letter.toUpperCase())
      })
      .join(", ")
  }

  const handleAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    if (avatarPreview?.startsWith("blob:")) {
      URL.revokeObjectURL(avatarPreview)
    }

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

  const normalizedEmail = email.trim().toLowerCase()
  const currentEmail = (userData?.email || "").trim().toLowerCase()
  const emailChanged = Boolean(userData && normalizedEmail && normalizedEmail !== currentEmail)

  const handleEmailInputChange = (value: string) => {
    setEmail(value)
    setEmailError(null)
    if (codeSent) {
      setCodeSent(false)
      setOtp("")
    }
  }

  const handleSendEmailOtp = async () => {
    if (!emailChanged) return

    setIsSendingOtp(true)
    setEmailError(null)
    try {
      await sendCurrentUserEmailChangeOtp(normalizedEmail)
      setCodeSent(true)
      setOtp("")
    } catch (error) {
      setEmailError(error instanceof Error ? error.message : "Failed to send verification code.")
    } finally {
      setIsSendingOtp(false)
    }
  }

  const handleConfirmEmailChange = async () => {
    if (!emailChanged || otp.length !== 6) {
      setEmailError("Enter the 6-digit verification code sent to your new email.")
      return
    }

    setIsConfirmingEmail(true)
    setEmailError(null)
    try {
      const updated = await confirmCurrentUserEmailChange(normalizedEmail, otp)
      setCodeSent(false)
      setOtp("")
      onEmailUpdated?.(updated)
    } catch (error) {
      setEmailError(error instanceof Error ? error.message : "Failed to update email.")
    } finally {
      setIsConfirmingEmail(false)
    }
  }

  const handleLeaveCustomer = async (customerId: number, customerName: string) => {
    const confirmed = window.confirm(
      `Leave ${customerName}? You will be marked Offboarded for this organization. Your profile and history stay intact.`,
    )
    if (!confirmed) return

    setLeavingCustomerId(customerId)
    setLeaveError(null)
    try {
      const updated = await leaveCurrentUserCustomer(customerId)
      onLeftCustomer?.(updated, customerId)
    } catch (error) {
      setLeaveError(error instanceof Error ? error.message : "Failed to leave organization.")
    } finally {
      setLeavingCustomerId(null)
    }
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

  const statusLabel = userData?.status
    ? userData.status.replace(/_/g, " ").replace(/\b\w/g, (letter) => letter.toUpperCase())
    : null
  const primaryLocation =
    userData?.customers?.find((customer) => customer.is_primary) ?? userData?.customers?.[0] ?? null
  const hasChanges = Boolean(
    userData &&
      (
        firstName.trim() !== (userData.first_name || "") ||
        lastName.trim() !== (userData.last_name || "") ||
        phone.trim() !== (userData.phone ?? userData.mobile ?? "") ||
        workNumber.trim() !== (userData.work_number ?? "") ||
        avatarFile
      ),
  )
  const isSaveDisabled =
    !onSave || isLoading || isSaving || !firstName.trim() || !lastName.trim() || !hasChanges

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent
        showCloseButton
        className="flex max-h-[94dvh] w-[calc(100vw-1rem)] max-w-[1120px] flex-col gap-0 overflow-hidden rounded-[30px] border border-slate-200/70 bg-white p-0 shadow-[0_28px_80px_rgba(15,23,42,0.14)] sm:w-[calc(100vw-2.5rem)]"
      >
        <DialogHeader className="shrink-0 border-b border-slate-100 bg-[linear-gradient(180deg,#fcfdff_0%,#f6f9fc_100%)] px-5 py-5 pr-14 text-left sm:px-8 sm:py-7">
          <span className="text-[11px] font-semibold uppercase tracking-[0.24em] text-slate-400">
            Personal Settings
          </span>
          <DialogTitle className="mt-2 text-[30px] font-semibold tracking-[-0.04em] text-slate-900">
            My Profile
          </DialogTitle>
          <DialogDescription className="mt-2 max-w-2xl text-sm leading-6 text-slate-500">
            Update your personal details and review the account access information managed by your
            organization.
          </DialogDescription>
        </DialogHeader>

        {isLoading ? (
          <div className="flex-1 min-h-0 space-y-4 overflow-y-auto p-5 sm:p-7">
            <Skeleton className="h-[180px] w-full rounded-[24px]" />
            <Skeleton className="h-[260px] w-full rounded-[24px]" />
            <Skeleton className="h-[190px] w-full rounded-[24px]" />
          </div>
        ) : userData ? (
          <div className="flex-1 min-h-0 space-y-5 overflow-y-auto overflow-x-hidden bg-[linear-gradient(180deg,#f8fbfd_0%,#ffffff_34%)] p-4 sm:space-y-6 sm:p-6">
            <section className="rounded-[28px] border border-slate-200/70 bg-[linear-gradient(135deg,#fbfdff_0%,#f5f8fc_100%)] p-4 shadow-[0_12px_30px_rgba(15,23,42,0.04)] sm:p-6">
              <div className="flex flex-col gap-5">
                <div className="flex flex-col gap-4 sm:flex-row sm:items-start">
                  <div className="relative mx-auto sm:mx-0">
                    <Avatar className="h-24 w-24 border-4 border-white shadow-md">
                      <AvatarImage src={displayAvatar} alt={`${firstName} ${lastName}`} />
                      <AvatarFallback className="bg-[#1162a8]/20 text-2xl font-semibold text-[#1162a8]">
                        {getInitials(firstName, lastName)}
                      </AvatarFallback>
                    </Avatar>
                    <label
                      htmlFor="profile-avatar-upload"
                      className="absolute -bottom-1 -right-1 flex h-9 w-9 cursor-pointer items-center justify-center rounded-full bg-[#1162a8] text-white shadow-md transition hover:bg-[#0d4f8c]"
                    >
                      <Camera className="h-4 w-4" />
                      <input
                        id="profile-avatar-upload"
                        type="file"
                        accept={AVATAR_ACCEPT}
                        className="sr-only"
                        onChange={handleAvatarChange}
                      />
                    </label>
                    <p className="mt-3 text-center text-xs leading-5 text-slate-500 sm:text-left">
                      PNG or JPG up to 5 MB
                    </p>
                  </div>

                  <div className="min-w-0 flex-1 space-y-3">
                    <div className="grid gap-3 sm:grid-cols-2">
                      <div className="rounded-[22px] border border-slate-200/70 bg-white/85 p-4 sm:col-span-2">
                        <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-400">
                          Account email
                        </p>
                        <div className="mt-3 space-y-3">
                          <div className="relative">
                            <Mail className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                            <Input
                              type="email"
                              value={email}
                              onChange={(e) => handleEmailInputChange(e.target.value)}
                              className="h-12 rounded-[18px] border-slate-200 bg-slate-50/70 pl-11 text-[15px] shadow-none hover:shadow-none focus:bg-white"
                              autoComplete="email"
                            />
                          </div>

                          {emailChanged ? (
                            <div className="space-y-3 rounded-[18px] border border-sky-100 bg-sky-50/60 p-3">
                              <p className="text-sm leading-6 text-slate-600">
                                We will send a verification code to confirm ownership of this new
                                address.
                              </p>
                              <div className="flex flex-wrap gap-2">
                                <Button
                                  type="button"
                                  variant="outline"
                                  onClick={() => void handleSendEmailOtp()}
                                  disabled={isSendingOtp || !normalizedEmail}
                                  className="h-10 rounded-full border-slate-300 px-4"
                                >
                                  {isSendingOtp
                                    ? "Sending..."
                                    : codeSent
                                      ? "Resend code"
                                      : "Send verification code"}
                                </Button>
                              </div>

                              {codeSent ? (
                                <div className="space-y-3">
                                  <Label className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
                                    Verification code
                                  </Label>
                                  <InputOTP
                                    maxLength={6}
                                    value={otp}
                                    onChange={setOtp}
                                    disabled={isConfirmingEmail}
                                  >
                                    <InputOTPGroup className="gap-1.5">
                                      <InputOTPSlot index={0} />
                                      <InputOTPSlot index={1} />
                                      <InputOTPSlot index={2} />
                                      <InputOTPSlot index={3} />
                                      <InputOTPSlot index={4} />
                                      <InputOTPSlot index={5} />
                                    </InputOTPGroup>
                                  </InputOTP>
                                  <Button
                                    type="button"
                                    onClick={() => void handleConfirmEmailChange()}
                                    disabled={isConfirmingEmail || otp.length !== 6}
                                    className="h-10 rounded-full bg-[#1162a8] px-5 text-white hover:bg-[#0d4f8c]"
                                  >
                                    {isConfirmingEmail ? "Updating..." : "Confirm new email"}
                                  </Button>
                                </div>
                              ) : null}
                            </div>
                          ) : null}

                          {emailError ? (
                            <p className="text-xs leading-5 text-red-600">{emailError}</p>
                          ) : null}
                        </div>
                      </div>

                      <div className="rounded-[22px] border border-slate-200/70 bg-white/85 p-4">
                        <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-400">
                          Role
                        </p>
                        <div className="mt-3 flex items-start gap-3">
                          <Shield className="mt-0.5 h-4 w-4 shrink-0 text-[#1162a8]" />
                          <p className="text-sm font-semibold leading-6 text-slate-900">
                            {getRoleDisplay(userData.roles)}
                          </p>
                        </div>
                      </div>

                      <div className="rounded-[22px] border border-slate-200/70 bg-white/85 p-4">
                        <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-400">
                          Primary lab
                        </p>
                        <div className="mt-3 flex items-start gap-3">
                          <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-[#1162a8]" />
                          <p className="text-sm font-semibold leading-6 text-slate-900">
                            {primaryLocation?.name || "No location"}
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {avatarError ? (
                  <p className="text-xs leading-5 text-red-600">{avatarError}</p>
                ) : null}
              </div>
            </section>

            <section className="rounded-[28px] border border-slate-100 bg-white p-5 shadow-[0_12px_30px_rgba(15,23,42,0.04)] sm:p-7">
              <div className="flex flex-col gap-1">
                <h3 className="text-[24px] font-semibold tracking-[-0.03em] text-slate-900">
                  Personal details
                </h3>
                <p className="text-sm leading-6 text-slate-500">
                  Keep your contact information current so your team can reach you when needed.
                </p>
              </div>

              <div className="mt-5 grid gap-4">
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label
                      htmlFor="profile-first-name"
                      className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500"
                    >
                      First name
                    </Label>
                    <div className="relative">
                      <UserRound className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                      <Input
                        id="profile-first-name"
                        value={firstName}
                        onChange={(e) => setFirstName(e.target.value)}
                        className="h-14 rounded-[18px] border-slate-200 bg-slate-50/70 pl-11 text-[15px] shadow-none hover:shadow-none focus:bg-white"
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label
                      htmlFor="profile-last-name"
                      className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500"
                    >
                      Last name
                    </Label>
                    <div className="relative">
                      <UserRound className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                      <Input
                        id="profile-last-name"
                        value={lastName}
                        onChange={(e) => setLastName(e.target.value)}
                        className="h-14 rounded-[18px] border-slate-200 bg-slate-50/70 pl-11 text-[15px] shadow-none hover:shadow-none focus:bg-white"
                      />
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 gap-4">
                  <div className="space-y-2">
                    <Label
                      htmlFor="profile-phone"
                      className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500"
                    >
                      Phone
                    </Label>
                    <div className="relative">
                      <Phone className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                      <Input
                        id="profile-phone"
                        type="tel"
                        value={phone}
                        onChange={(e) => setPhone(e.target.value)}
                        className="h-14 rounded-[18px] border-slate-200 bg-slate-50/70 pl-11 text-[15px] shadow-none hover:shadow-none focus:bg-white"
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label
                      htmlFor="profile-work-number"
                      className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500"
                    >
                      Work number
                    </Label>
                    <div className="relative">
                      <Briefcase className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                      <Input
                        id="profile-work-number"
                        type="tel"
                        value={workNumber}
                        onChange={(e) => setWorkNumber(e.target.value)}
                        placeholder="Optional"
                        className="h-14 rounded-[18px] border-slate-200 bg-slate-50/70 pl-11 text-[15px] shadow-none hover:shadow-none focus:bg-white"
                      />
                    </div>
                  </div>
                </div>
              </div>
            </section>

            <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
              <div className="rounded-[22px] border border-slate-200/70 bg-slate-50/50 p-4">
                <div className="flex items-center gap-2 text-sm font-semibold text-slate-700">
                  <UserRound className="h-4 w-4 text-[#1162a8]" />
                  Account ID
                </div>
                <p className="mt-3 font-mono text-lg text-slate-900">{userData.id}</p>
              </div>

              <div className="rounded-[22px] border border-slate-200/70 bg-slate-50/50 p-4">
                <div className="flex items-center gap-2 text-sm font-semibold text-slate-700">
                  <Calendar className="h-4 w-4 text-[#1162a8]" />
                  Member since
                </div>
                <p className="mt-3 text-sm font-semibold leading-6 text-slate-900">
                  {formatDate(userData.created_at)}
                </p>
              </div>

              <div className="rounded-[22px] border border-slate-200/70 bg-slate-50/50 p-4">
                <div className="flex items-center gap-2 text-sm font-semibold text-slate-700">
                  <Building2 className="h-4 w-4 text-[#1162a8]" />
                  Customer ID
                </div>
                <p className="mt-3 text-sm font-semibold leading-6 text-slate-900">
                  {userData.customer_id || "N/A"}
                </p>
              </div>

              <div className="rounded-[22px] border border-slate-200/70 bg-slate-50/50 p-4 sm:col-span-2 xl:col-span-1">
                <div className="flex items-center gap-2 text-sm font-semibold text-slate-700">
                  <CheckCircle className="h-4 w-4 text-[#1162a8]" />
                  Status
                </div>
                <div className="mt-3 flex flex-wrap gap-2">
                  {statusLabel ? (
                    <Badge
                      className={
                        userData.status === "active"
                          ? "border-0 bg-emerald-100 px-3 py-1 text-xs font-semibold text-emerald-700 hover:bg-emerald-100"
                          : "border-0 bg-slate-200 px-3 py-1 text-xs font-semibold text-slate-700 hover:bg-slate-200"
                      }
                    >
                      {statusLabel}
                    </Badge>
                  ) : null}
                  <Badge
                    className={
                      userData.is_email_verified
                        ? "border-0 bg-sky-100 px-3 py-1 text-xs font-semibold text-sky-700 hover:bg-sky-100"
                        : "border-0 bg-amber-100 px-3 py-1 text-xs font-semibold text-amber-700 hover:bg-amber-100"
                    }
                  >
                    {userData.is_email_verified ? (
                      <>
                        <CheckCircle className="mr-1.5 h-3.5 w-3.5" />
                        Verified
                      </>
                    ) : (
                      <>
                        <XCircle className="mr-1.5 h-3.5 w-3.5" />
                        Not verified
                      </>
                    )}
                  </Badge>
                </div>
              </div>
            </section>

            {userData.customers && userData.customers.some((c) => (c.status ?? "Active") === "Active") ? (
              <section className="rounded-[28px] border border-slate-100 bg-white p-5 shadow-[0_12px_30px_rgba(15,23,42,0.04)] sm:p-7">
                <div className="flex flex-col gap-1">
                  <h3 className="text-[24px] font-semibold tracking-[-0.03em] text-slate-900">
                    Locations
                  </h3>
                  <p className="text-sm leading-6 text-slate-500">
                    Your associated labs and offices. You can leave an organization yourself at any
                    time.
                  </p>
                </div>

                <div className="mt-5 grid gap-3">
                  {userData.customers
                    .filter((customer) => (customer.status ?? "Active") === "Active")
                    .map((customer) => (
                    <div
                      key={customer.id}
                      className="flex flex-col gap-3 rounded-[22px] border border-slate-200/70 bg-slate-50/40 p-4 sm:flex-row sm:items-center sm:justify-between"
                    >
                      <div className="min-w-0">
                        <div className="flex items-center gap-2 text-base font-semibold text-slate-900">
                          <Building2 className="h-4 w-4 shrink-0 text-[#1162a8]" />
                          <span className="break-words">{customer.name}</span>
                        </div>
                        <p className="mt-1 text-sm capitalize text-slate-500">{customer.type}</p>
                      </div>
                      <div className="flex flex-wrap items-center gap-2">
                        {customer.is_primary ? (
                          <Badge className="w-fit border-0 bg-slate-900 px-3 py-1 text-xs font-semibold text-white hover:bg-slate-900">
                            Primary
                          </Badge>
                        ) : null}
                        <Button
                          type="button"
                          variant="outline"
                          disabled={leavingCustomerId === customer.id}
                          onClick={() => void handleLeaveCustomer(customer.id, customer.name)}
                          className="h-9 rounded-full border-red-200 px-4 text-red-700 hover:bg-red-50"
                        >
                          {leavingCustomerId === customer.id ? "Leaving…" : "Leave"}
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
                {leaveError ? (
                  <p className="mt-3 text-xs leading-5 text-red-600">{leaveError}</p>
                ) : null}
              </section>
            ) : null}
          </div>
        ) : (
          <div className="flex-1 px-4 py-10 text-center text-slate-500">No profile data available</div>
        )}

        <div className="shrink-0 flex flex-row items-center justify-end gap-3 border-t border-slate-100 bg-[linear-gradient(180deg,#ffffff_0%,#f8fafc_100%)] p-4 sm:px-8 sm:py-6">
          <Button
            variant="outline"
            onClick={onClose}
            disabled={isSaving || isConfirmingEmail}
            className="h-11 min-w-[132px] rounded-full border-slate-300 px-6 text-slate-700 hover:border-slate-400 hover:bg-white"
          >
            Cancel
          </Button>
          {userData ? (
            <Button
              onClick={handleSave}
              disabled={isSaveDisabled}
              style={
                isSaveDisabled
                  ? {
                      background:
                        "linear-gradient(#fff,#fff) padding-box, linear-gradient(256.66deg,#2AA6DE 0%,#82298D 50%,#C9539F 100%) border-box",
                    }
                  : undefined
              }
              className={`h-11 min-w-[160px] rounded-full px-6 transition ${
                isSaveDisabled
                  ? "border-2 border-transparent font-semibold text-[#82298D] disabled:opacity-100"
                  : "bg-[#1162a8] text-white hover:bg-[#0d4f8c]"
              }`}
            >
              {isSaving ? "Saving..." : "Save changes"}
            </Button>
          ) : null}
        </div>
      </DialogContent>
    </Dialog>
  )
}
