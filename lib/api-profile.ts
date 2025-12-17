import type { ProfileData } from "@/components/profile-modal"

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:3000/api"

/**
 * Fetch profile data for an office or lab
 * @param id The ID of the entity
 * @param type The type of entity (office or lab)
 * @returns The profile data
 */
export async function fetchProfileData(id: number, type: "office" | "lab"): Promise<ProfileData> {
  try {
    const token = localStorage.getItem("token")
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
    const data = responseData.data
    return {
      id: data.id,
      name: data.name,
      type: data.type,
      address: data.address || "",
      city: data.city || "",
      state: data.state || { id: 0, name: "" },
      postal_code: data.postal_code || "",
      contact_person: data.contact_person || "",
      position: data.position || "",
      contact_number: data.contact_number || "",
      email: data.email || "",
      logo_url: data.logo_url || "",
      business_hours: (data.business_settings.business_hours || []).map((hour) => ({
        id: hour.id,
        day: hour.day,
        is_open: hour.is_open,
        open_time: hour.open_time || null,
        close_time: hour.close_time || null,
        created_at: hour.created_at,
        updated_at: hour.updated_at,
      })),
      notes: data.notes || "",
      website: data.website,
      status: data.status,
      unique_code: data.unique_code,
      country: data.country,
      departments: data.departments,
      users: data.users,
      created_at: data.created_at,
      updated_at: data.updated_at,
    }
  } catch (error) {
    console.error(`Error fetching ${type} profile:`, error)
    throw error
  }
}

/**
 * Save profile data for an office or lab
 * @param data The profile data to save
 * @returns The updated profile data
 */
export async function saveProfileData(data: ProfileData): Promise<ProfileData> {
  try {
    const token = localStorage.getItem("token")
    if (!token) {
      throw new Error("Authentication token not found")
    }

    const endpoint = data.type === "office" ? "office-profile" : "lab-profile"
    const response = await fetch(`${API_BASE_URL}/${endpoint}/${data.id}`, {
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
        contact_person: data.contact_person,
        position: data.position,
        contact_number: data.contact_number,
        email: data.email,
        logo_url: data.logo_url,
        business_hours: data.business_hours,
        notes: data.notes,
      }),
    })

    if (!response.ok) {
      throw new Error(`Failed to save ${data.type} profile with status: ${response.status}`)
    }

    const responseData = await response.json()
    return responseData.data
  } catch (error) {
    console.error(`Error saving ${data.type} profile:`, error)
    throw error
  }
}
