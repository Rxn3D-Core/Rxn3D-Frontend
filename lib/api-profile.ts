import type { ProfileData, ProfileStaffMember } from "@/components/profile-modal"
import { getUserProfileImageUrl } from "@/utils/avatar-utils"
import {
  DEFAULT_CLOSE_TIME_12,
  DEFAULT_DELIVERY_TIME_12,
  DEFAULT_OPEN_TIME_12,
  DEFAULT_PICKUP_TIME_12,
  parseBusinessHourTime,
  resolveDisplayTimezone,
} from "@/utils/time-utils"

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || ""

const LAB_ADMIN_ROLES = new Set(["lab_admin"])
const OFFICE_ADMIN_ROLES = new Set(["office_admin", "doctor_admin"])
const DOCTOR_ROLES = new Set(["doctor"])

type CustomerTypeParam = "office" | "lab" | "Office" | "Lab"

function normalizeCustomerType(type: string | null | undefined): "office" | "lab" {
  return String(type || "").toLowerCase() === "office" ? "office" : "lab"
}

function formatJoinDate(value?: string | null): string {
  if (!value) return ""
  const parsed = new Date(value)
  if (Number.isNaN(parsed.getTime())) return ""
  return parsed.toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" })
}

function fullName(first?: string | null, last?: string | null): string {
  return `${first || ""} ${last || ""}`.trim()
}

function formatAddress(parts: Array<string | null | undefined>): string {
  return parts.filter(Boolean).join(", ")
}

function roleName(user: any): string {
  return String(user?.role?.name || "").toLowerCase()
}

function mapStaffMember(user: any, fallbackRole: string): ProfileStaffMember {
  return {
    id: user.id,
    name: fullName(user.first_name, user.last_name) || user.email || "Unknown",
    email: user.email || "",
    phone: user.phone || user.work_number || "",
    status: user.status || "",
    role: user?.role?.name || fallbackRole,
    isPrimary: Boolean(user.is_primary),
    avatar: getUserProfileImageUrl({ image: user.image }) || undefined,
  }
}

function withAdminFallback(
  members: ProfileStaffMember[],
  defaultAdmin: any,
  fallbackRole: string
): ProfileStaffMember[] {
  if (members.length > 0) return members
  if (!defaultAdmin) return []
  return [
    mapStaffMember(
      { ...defaultAdmin, is_primary: defaultAdmin.is_primary ?? true, role: defaultAdmin.role || { name: fallbackRole } },
      fallbackRole
    ),
  ]
}

function mapHoursData(data: any) {
  const raw = data?.business_settings?.business_hours
  const hours = Array.isArray(raw) ? raw : raw ? Object.values(raw) : []
  return {
    workingDays: hours.map((hour: any) => ({
      day: hour?.day ? `${String(hour.day).charAt(0).toUpperCase()}${String(hour.day).slice(1)}` : "",
      enabled: !!hour?.is_open,
      startTime: parseBusinessHourTime(hour?.open_time, hour?.is_open ? DEFAULT_OPEN_TIME_12 : ""),
      endTime: parseBusinessHourTime(hour?.close_time, hour?.is_open ? DEFAULT_CLOSE_TIME_12 : ""),
    })),
    timezone: resolveDisplayTimezone(data?.state?.name),
    holidays: "All Federal Holidays",
  }
}

export function mapCustomerApiToProfile(data: any, fallbackType: CustomerTypeParam = "lab"): ProfileData {
  const type = normalizeCustomerType(data?.type || fallbackType)
  const defaultAdmin = data?.default_admin
  const users: any[] = Array.isArray(data?.users) ? data.users : []

  const labAdmins = users
    .filter((user) => LAB_ADMIN_ROLES.has(roleName(user)))
    .map((user) => mapStaffMember(user, "lab_admin"))
    .sort((a, b) => Number(b.isPrimary) - Number(a.isPrimary))

  const officeAdmins = users
    .filter((user) => OFFICE_ADMIN_ROLES.has(roleName(user)))
    .map((user) => mapStaffMember(user, "office_admin"))
    .sort((a, b) => Number(b.isPrimary) - Number(a.isPrimary))

  const resolvedLabAdmins = type === "lab"
    ? withAdminFallback(labAdmins, defaultAdmin, "lab_admin")
    : labAdmins
  const resolvedOfficeAdmins = type === "office"
    ? withAdminFallback(officeAdmins, defaultAdmin, "office_admin")
    : officeAdmins

  const doctors = users
    .filter((user) => DOCTOR_ROLES.has(roleName(user)))
    .map((user) => mapStaffMember(user, "doctor"))

  const primaryAdmin = (type === "lab" ? resolvedLabAdmins : resolvedOfficeAdmins).find((member) => member.isPrimary)
    || (type === "lab" ? resolvedLabAdmins : resolvedOfficeAdmins)[0]
  const contactName = defaultAdmin
    ? fullName(defaultAdmin.first_name, defaultAdmin.last_name)
    : primaryAdmin?.name || ""
  const contactRole = defaultAdmin?.role?.name
    ? defaultAdmin.role.name.replace(/_/g, " ").replace(/\b\w/g, (char: string) => char.toUpperCase())
    : type === "lab" ? "Lab Admin" : "Office Admin"

  return {
    id: data.id,
    name: data.name || "",
    type,
    address: data.address || "",
    city: data.city || "",
    state: data.state || { id: 0, name: "" },
    postal_code: data.postal_code || "",
    contact_person: contactName,
    position: contactRole,
    contact_number: defaultAdmin?.phone || defaultAdmin?.work_number || primaryAdmin?.phone || "",
    email: data.email || defaultAdmin?.email || primaryAdmin?.email || "",
    logo_url: getUserProfileImageUrl({ image: data.logo_url }) || data.logo_url || "",
    website: data.website || null,
    status: data.status || "",
    unique_code: data.unique_code || "",
    country: data.country,
    departments: data.departments || [],
    users,
    created_at: data.created_at,
    updated_at: data.updated_at,
    code: data.code || "",
    release_casepan: data.release_casepan || "",
    contact_email: defaultAdmin?.email || primaryAdmin?.email || "",
    lab_number: defaultAdmin?.work_number || defaultAdmin?.phone || primaryAdmin?.phone || "",
    formatted_address: formatAddress([
      data.address,
      data.city,
      data.state?.name,
      data.country?.name,
      data.postal_code,
    ]),
    join_date: formatJoinDate(data.created_at),
    hoursData: mapHoursData(data),
    pickupData: {
      serviceArea:
        data?.business_settings?.pickup_area ||
        formatAddress([data?.city, data?.state?.name, data?.country?.name]),
      pickupDays: data?.business_settings?.pickup_days || "Lab hours",
      cutOffTime: parseBusinessHourTime(
        data?.business_settings?.case_schedule?.default_pickup_time,
        DEFAULT_PICKUP_TIME_12,
      ),
      frequency: data?.business_settings?.pickup_frequency || "Daily",
      window: data?.business_settings?.pickup_window || "10:00 am - 2:00 pm",
    },
    deliveryData: {
      serviceArea:
        data?.business_settings?.delivery_area ||
        formatAddress([data?.city, data?.state?.name, data?.country?.name]),
      deliveryDays: data?.business_settings?.delivery_days || "Lab hours",
      defaultTime: parseBusinessHourTime(
        data?.business_settings?.case_schedule?.default_delivery_time,
        DEFAULT_DELIVERY_TIME_12,
      ),
      window: data?.business_settings?.delivery_window || "3:00 pm - 6:00 pm",
    },
    rushSettings: {
      enabled: !!data?.business_settings?.case_schedule?.enable_rush_cases,
      description: "Allow users to request expedited processing.",
      rush_type: data?.business_settings?.case_schedule?.rush_type as "fixed" | "flexible" | undefined,
      fixed_turnaround_days: data?.business_settings?.case_schedule?.fixed_turnaround_days,
      fixed_rush_fee_percentage:
        data?.business_settings?.case_schedule?.fixed_rush_fee_percentage !== undefined
          ? String(data.business_settings.case_schedule.fixed_rush_fee_percentage)
          : undefined,
    },
    labAdmins: resolvedLabAdmins,
    officeAdmins: resolvedOfficeAdmins,
    doctors,
  }
}

/**
 * Fetch profile data for an office or lab
 */
export async function fetchProfileData(id: number, type: CustomerTypeParam): Promise<ProfileData> {
  try {
    const token = localStorage.getItem("token") || localStorage.getItem("library_token")
    if (!token) {
      throw new Error("Authentication token not found")
    }

    const response = await fetch(`${API_BASE_URL}/customers/${id}`, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    })

    if (!response.ok) {
      throw new Error(`Failed to fetch ${type} profile with status: ${response.status}`)
    }

    const responseData = await response.json()
    return mapCustomerApiToProfile(responseData.data, type)
  } catch (error) {
    console.error(`Error fetching ${type} profile:`, error)
    throw error
  }
}

/**
 * Save profile data for an office or lab
 */
export async function saveProfileData(data: ProfileData): Promise<ProfileData> {
  try {
    const token = localStorage.getItem("token") || localStorage.getItem("library_token")
    if (!token) {
      throw new Error("Authentication token not found")
    }

    const response = await fetch(`${API_BASE_URL}/customers/${data.id}`, {
      method: "PUT",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        name: data.name,
        address: data.address,
        city: data.city,
        state_id: data.state?.id,
        postal_code: data.postal_code,
        website: data.website,
        code: data.code,
      }),
    })

    if (!response.ok) {
      throw new Error(`Failed to save ${data.type} profile with status: ${response.status}`)
    }

    const responseData = await response.json()
    return mapCustomerApiToProfile(responseData.data, data.type)
  } catch (error) {
    console.error(`Error saving ${data.type} profile:`, error)
    throw error
  }
}
