// API functions for registration

/**
 * Register a new lab
 */
export async function registerLab(formData: FormData) {
  try {
    const response = await fetch("/registration/lab", {
      method: "POST",
      body: formData,
    })

    if (!response.ok) {
      const errorData = await response.json()
      throw new Error(errorData.message || "Failed to register lab")
    }

    return await response.json()
  } catch (error) {
    console.error("Lab registration error:", error)
    throw error
  }
}

/**
 * Register a new office
 */
export async function registerOffice(formData: FormData) {
  try {
    const response = await fetch("/registration/office", {
      method: "POST",
      body: formData,
    })

    if (!response.ok) {
      const errorData = await response.json()
      throw new Error(errorData.message || "Failed to register office")
    }

    return await response.json()
  } catch (error) {
    console.error("Office registration error:", error)
    throw error
  }
}

/**
 * Get states list
 */
export async function getStates() {
  try {
    const response = await fetch("/api/states")

    if (!response.ok) {
      throw new Error("Failed to fetch states")
    }

    return await response.json()
  } catch (error) {
    console.error("Error fetching states:", error)
    throw error
  }
}

/**
 * Get countries list
 */
export async function getCountries() {
  try {
    const response = await fetch("/api/countries")

    if (!response.ok) {
      throw new Error("Failed to fetch countries")
    }

    return await response.json()
  } catch (error) {
    console.error("Error fetching countries:", error)
    throw error
  }
}
