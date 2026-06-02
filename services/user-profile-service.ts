import { getMe, updateMe, type MeProfile, type UpdateMeProfileInput } from "@/lib/api/me"

export type { MeProfile, UpdateMeProfileInput }

export interface UserProfileData {
  id: number
  uuid?: string
  customer_id?: number
  role?: string
  roles?: string[] | Array<{ name?: string; role?: string }>
  first_name: string
  last_name: string
  email: string
  phone?: string | null
  work_number?: string | null
  mobile?: string
  image?: string
  avatar?: string | null
  status?: string
  username?: string
  description?: string
  department_id?: number
  created_at?: string
  updated_at?: string
  deleted_at?: string | null
  permissions?: unknown[]
  customers?: Array<{
    id: number
    name: string
    type: "lab" | "office"
    role?: string
    role_permissions?: string[]
    department_id?: number
    is_primary?: boolean
    onboarding_completed?: boolean
    onboarding_completed_at?: string | null
    onboarding_completed_by?: number | null
    business_hours_setup_completed?: boolean
    business_hours_setup_completed_at?: string | null
    business_hours_setup_completed_by?: number | null
  }>
  is_email_verified?: boolean
  selected_location_id?: number | null
  customer?: {
    id: number
    name: string
    type: "lab" | "office"
    onboarding_completed?: boolean
    onboarding_completed_at?: string | null
    business_hours_setup_completed?: boolean
    business_hours_setup_completed_at?: string | null
  }
  departments?: unknown[]
}

function mapMeToUserProfile(data: MeProfile): UserProfileData {
  const avatarUrl = data.avatar ?? data.image ?? null
  const phone = data.phone ?? data.mobile ?? null

  return {
    ...(data as UserProfileData),
    phone,
    mobile: phone ?? undefined,
    avatar: avatarUrl,
    image: avatarUrl ?? undefined,
  }
}

/**
 * Fetch the logged-in user's profile (GET /me).
 */
export async function fetchCurrentUserProfile(): Promise<UserProfileData> {
  const profile = await getMe()
  return mapMeToUserProfile(profile)
}

/**
 * @deprecated Use fetchCurrentUserProfile — kept for existing imports.
 */
export async function fetchUserProfile(_userId?: number): Promise<UserProfileData | null> {
  return fetchCurrentUserProfile()
}

/**
 * Update the logged-in user's profile (PUT /me or POST /me with avatar).
 */
export async function updateCurrentUserProfile(
  input: UpdateMeProfileInput
): Promise<UserProfileData> {
  const profile = await updateMe(input)
  return mapMeToUserProfile(profile)
}
