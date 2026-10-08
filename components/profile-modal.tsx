"use client"

import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Building2, Clock, Globe, Mail, MapPin, Phone, UserRound, Users, X } from "lucide-react"

export interface BusinessHours {
  monday: string
  tuesday: string
  wednesday: string
  thursday: string
  friday: string
  saturday: string
  sunday: string
}

export interface ProfileStaffMember {
  id: number
  name: string
  email: string
  phone?: string
  status?: string
  role?: string
  isPrimary?: boolean
  avatar?: string
}

export interface ProfileHoursData {
  workingDays: Array<{
    day: string
    enabled: boolean
    startTime: string
    endTime: string
  }>
  timezone: string
  holidays: string
}

export interface ProfileData {
  id: number
  name: string
  type: "office" | "lab"
  address: string
  city: string
  state: { id: number; name: string }
  postal_code: string
  contact_person?: string
  position?: string
  contact_number?: string
  email: string
  logo_url?: string
  business_hours?: BusinessHours
  notes?: string
  website?: string | null
  status?: string | number
  unique_code?: string
  country?: { id: number; name: string }
  departments?: any[]
  users?: any[]
  created_at?: string
  updated_at?: string
  code?: string
  release_casepan?: string
  contact_email?: string
  lab_number?: string
  formatted_address?: string
  join_date?: string
  hoursData?: ProfileHoursData
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
  labAdmins?: ProfileStaffMember[]
  officeAdmins?: ProfileStaffMember[]
  doctors?: ProfileStaffMember[]
}

interface ProfileModalProps {
  isOpen: boolean
  onClose: () => void
  data: ProfileData | null
  isLoading: boolean
  onSave?: (data: ProfileData) => Promise<void>
}

const DAY_ORDER = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"]

function statusBadgeClass(status?: string | number) {
  const value = String(status || "").toLowerCase()
  if (value === "active" || value === "1") return "bg-[#c3f2cf] text-[#119933]"
  if (value === "inactive" || value === "3") return "bg-[#eeeeee] text-[#a19d9d]"
  if (value === "suspended") return "bg-[#fff3e1] text-[#ff9500]"
  if (value === "archived" || value === "offboarded") return "bg-[#f8dddd] text-[#eb0303]"
  if (value === "on hold" || value === "2") return "bg-[#fff3e1] text-[#ff9500]"
  return "bg-[#eeeeee] text-[#a19d9d]"
}

function statusLabel(status?: string | number) {
  if (status == null || status === "") return ""
  if (typeof status === "number") {
    if (status === 1) return "Active"
    if (status === 2) return "On Hold"
    if (status === 3) return "Inactive"
    return String(status)
  }
  return status
}

function initials(name?: string) {
  return (name || "?")
    .split(" ")
    .filter(Boolean)
    .map((word) => word[0])
    .slice(0, 2)
    .join("")
    .toUpperCase()
}

function prettyTime(value?: string) {
  if (!value) return ""
  return value
    .replace(/^0(\d)/, "$1")
    .replace(/\s*(am|pm)$/i, (_, period: string) => ` ${period.toUpperCase()}`)
}

function displayValue(value?: string | null) {
  const trimmed = String(value || "").trim()
  return trimmed || "—"
}

function Field({ label, value }: { label: string; value?: string | null }) {
  return (
    <div className="min-w-0">
      <p className="text-xs font-medium uppercase tracking-wide text-gray-500">{label}</p>
      <p className="mt-1 text-sm text-gray-900 break-words">{displayValue(value)}</p>
    </div>
  )
}

function StaffCard({ member }: { member: ProfileStaffMember }) {
  const photoLabel = member.name || member.email || "Admin"
  return (
    <div className="flex items-center gap-3 rounded-xl border border-gray-100 bg-white p-3">
      <Avatar className="h-11 w-11 shrink-0">
        <AvatarImage src={member.avatar || undefined} alt={photoLabel} />
        <AvatarFallback className="bg-[#e8f4fd] text-[#1162a8] text-sm font-semibold">
          {initials(member.name || member.email)}
        </AvatarFallback>
      </Avatar>
      <div className="min-w-0 flex-1">
        <p className="text-sm font-medium text-gray-900 truncate">{displayValue(member.name)}</p>
        <p className="text-sm text-gray-600 truncate">{displayValue(member.email)}</p>
      </div>
    </div>
  )
}

function ProfileSkeleton() {
  return (
    <div className="p-6 space-y-5">
      <div className="flex gap-5">
        <Skeleton className="h-28 w-28 rounded-2xl shrink-0" />
        <div className="flex-1 space-y-3">
          <Skeleton className="h-7 w-64" />
          <Skeleton className="h-4 w-40" />
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-2/3" />
        </div>
      </div>
      <div className="grid md:grid-cols-3 gap-4">
        <Skeleton className="h-48 w-full rounded-xl" />
        <Skeleton className="h-48 w-full rounded-xl md:col-span-2" />
      </div>
      <Skeleton className="h-32 w-full rounded-xl" />
    </div>
  )
}

export function ProfileModal({ isOpen, onClose, data, isLoading }: ProfileModalProps) {
  const isLab = String(data?.type || "").toLowerCase() === "lab"
  const entityLabel = isLab ? "Lab" : "Practice"
  const typeLabel = isLab ? "Laboratory" : "Dental Practice"
  const statusText = statusLabel(data?.status)
  const admins = isLab ? data?.labAdmins || [] : data?.officeAdmins || []
  const hours = [...(data?.hoursData?.workingDays || [])].sort(
    (a, b) => DAY_ORDER.indexOf(a.day) - DAY_ORDER.indexOf(b.day)
  )

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent
        showCloseButton={false}
        className="max-w-[95vw] w-[980px] p-0 overflow-hidden flex flex-col gap-0 max-h-[90vh]"
      >
        <div className="shrink-0 border-b bg-white px-5 py-3.5 flex items-center justify-between gap-3">
          <div className="min-w-0">
            <DialogTitle className="text-lg font-semibold text-gray-900">
              {entityLabel} Profile
            </DialogTitle>
            {data?.unique_code || data?.code ? (
              <p className="text-xs text-gray-500 mt-0.5">
                {[data.unique_code, data.code ? `Code ${data.code}` : null].filter(Boolean).join(" · ")}
              </p>
            ) : null}
          </div>
          <div className="flex items-center gap-2 shrink-0">
            {statusText ? (
              <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${statusBadgeClass(data?.status)}`}>
                {statusText}
              </span>
            ) : null}
            <Button
              type="button"
              variant="ghost"
              size="icon"
              onClick={onClose}
              className="h-8 w-8"
              aria-label="Close profile"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        </div>

        <div className="flex-1 min-h-0 overflow-y-auto bg-[#f7f9fc]">
          {isLoading ? (
            <ProfileSkeleton />
          ) : data ? (
            <div className="p-5 space-y-5">
              <div className="rounded-2xl border border-gray-100 bg-white p-5">
                <div className="flex flex-col sm:flex-row gap-5">
                  <div className="h-28 w-28 shrink-0 rounded-2xl border border-gray-100 bg-[#f8fafc] overflow-hidden flex items-center justify-center">
                    {data.logo_url ? (
                      <img src={data.logo_url} alt={`${data.name} logo`} className="h-full w-full object-contain p-2" />
                    ) : (
                      <span className="text-2xl font-semibold text-[#1162a8]">{initials(data.name)}</span>
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <h2 className="text-xl font-semibold text-gray-900 truncate">{data.name || "—"}</h2>
                        <p className="text-sm text-gray-500 mt-0.5">{typeLabel}</p>
                      </div>
                      <span className="inline-flex items-center gap-1.5 rounded-full bg-[#e8f4fd] text-[#1162a8] px-2.5 py-1 text-xs font-medium shrink-0">
                        {isLab ? <Building2 className="h-3.5 w-3.5" /> : <UserRound className="h-3.5 w-3.5" />}
                        {entityLabel}
                      </span>
                    </div>
                    <div className="mt-4 grid sm:grid-cols-2 gap-3 text-sm text-gray-700">
                      <div className="flex items-start gap-2 min-w-0">
                        <MapPin className="h-4 w-4 text-gray-400 mt-0.5 shrink-0" />
                        <span className="break-words">{displayValue(data.formatted_address || data.address)}</span>
                      </div>
                      <div className="flex items-start gap-2 min-w-0">
                        <Mail className="h-4 w-4 text-gray-400 mt-0.5 shrink-0" />
                        <span className="break-all">{displayValue(data.email)}</span>
                      </div>
                      <div className="flex items-start gap-2 min-w-0">
                        <Phone className="h-4 w-4 text-gray-400 mt-0.5 shrink-0" />
                        <span>{displayValue(data.contact_number || data.lab_number)}</span>
                      </div>
                      <div className="flex items-start gap-2 min-w-0">
                        <Globe className="h-4 w-4 text-gray-400 mt-0.5 shrink-0" />
                        <span className="break-all">{displayValue(data.website)}</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <div className="grid lg:grid-cols-3 gap-5">
                <div className="lg:col-span-2 rounded-2xl border border-gray-100 bg-white p-5">
                  <h3 className="text-sm font-semibold text-gray-900 mb-4">Details</h3>
                  <div className="grid sm:grid-cols-2 gap-x-8 gap-y-4">
                    <Field label="Contact person" value={data.contact_person} />
                    <Field label="Position" value={data.position} />
                    <Field label="Contact email" value={data.contact_email || data.email} />
                    <Field label="Contact number" value={data.contact_number || data.lab_number} />
                    <Field label="City" value={data.city} />
                    <Field label="State" value={data.state?.name} />
                    <Field label="Postal code" value={data.postal_code} />
                    <Field label="Country" value={data.country?.name} />
                    {data.join_date ? <Field label="Joined" value={data.join_date} /> : null}
                    {isLab && data.release_casepan ? <Field label="Release casepan" value={data.release_casepan} /> : null}
                  </div>
                </div>

                <div className="rounded-2xl border border-gray-100 bg-white p-5">
                  <div className="flex items-center gap-2 mb-4">
                    <Clock className="h-4 w-4 text-[#1162a8]" />
                    <h3 className="text-sm font-semibold text-gray-900">Business Hours</h3>
                  </div>
                  {hours.length > 0 ? (
                    <div className="space-y-2">
                      {hours.map((hour) => (
                        <div key={hour.day} className="flex items-center justify-between gap-3 text-sm">
                          <span className="font-medium text-gray-700">{hour.day}</span>
                          <span className={hour.enabled ? "text-gray-900" : "text-gray-400"}>
                            {hour.enabled
                              ? `${prettyTime(hour.startTime)} – ${prettyTime(hour.endTime)}`
                              : "Closed"}
                          </span>
                        </div>
                      ))}
                      {data.hoursData?.timezone ? (
                        <p className="text-xs text-gray-400 pt-2 border-t border-gray-100">
                          {data.hoursData.timezone}
                        </p>
                      ) : null}
                    </div>
                  ) : (
                    <p className="text-sm text-gray-500">No business hours specified</p>
                  )}
                </div>
              </div>

              <div className="rounded-2xl border border-gray-100 bg-white p-5">
                <div className="flex items-center gap-2 mb-4">
                  <Users className="h-4 w-4 text-[#1162a8]" />
                  <h3 className="text-sm font-semibold text-gray-900">
                    {isLab ? "Lab Admins" : "Office Admins"}
                  </h3>
                  <span className="text-xs text-gray-400">{admins.length}</span>
                </div>
                {admins.length > 0 ? (
                  <div className="grid sm:grid-cols-2 gap-3">
                    {admins.map((admin) => (
                      <StaffCard key={admin.id} member={admin} />
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-gray-500">No {isLab ? "lab" : "office"} admins attached.</p>
                )}
              </div>
            </div>
          ) : (
            <div className="py-16 text-center text-gray-500">No profile data available</div>
          )}
        </div>

        <div className="shrink-0 border-t bg-white px-5 py-3 flex justify-end">
          <Button type="button" variant="outline" onClick={onClose}>
            Close
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
