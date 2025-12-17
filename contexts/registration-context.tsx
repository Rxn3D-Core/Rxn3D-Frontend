"use client"

import type React from "react"
import { createContext, useContext, useState, useCallback } from "react"
import { useToast } from "@/components/ui/use-toast"

// Types for registration data
export type UserRole = "lab_admin" | "lab_user" | "office_admin" | "doctor" | "office_user"

export interface RegistrationUser {
  first_name: string
  last_name: string
  role: UserRole
  email: string
  phone: string
  work_number: string
  is_doctor?: boolean
  use_same_details?: boolean
  license_number?: string
}

export interface RegistrationData {
  invitation_id?: number
  name: string
  website: string
  address: string
  city: string
  state_id: number
  postal_code: string
  country_id: number
  users: RegistrationUser[]
  logo?: File | null
}

export type RegistrationType = "Office" | "Lab"

interface ApiResponse {
  validationErrors: any
  success: boolean
  message: string
  data?: any
}

// State and Country interfaces
export interface State {
  id: number
  name: string
  code: string
}

export interface Country {
  id: number
  name: string
  code: string
}

// Context type
interface RegistrationContextType {
  registrationData: RegistrationData
  registrationType: "Lab" | "Office"
  activeStep: number
  isSubmitting: boolean
  error: string | null
  success: boolean
  progress: number
  states: State[]
  countries: Country[]

  // Methods
  setRegistrationType: (type: "Lab" | "Office") => void
  updateRegistrationData: (data: Partial<RegistrationData>) => void
  addUser: (user: RegistrationUser) => void
  updateUser: (index: number, user: Partial<RegistrationUser>) => void
  removeUser: (index: number) => void
  setActiveStep: (step: number) => void
  submitRegistration: (invitationId: string) => Promise<ApiResponse>
  resetRegistration: () => void
  goToNextStep: () => void
  goToPreviousStep: () => void
  setIsSubmitting: (isSubmitting: boolean) => void
  setSuccess: (success: boolean) => void
  setError: (error: string | null) => void
  fetchStatesAndCountries: () => Promise<void>
  handleCountryChange: (countryId: number) => Promise<void>
  fetchRegistrationDetails: (invitationId: string) => Promise<void>
}

// Default values
const defaultRegistrationData: RegistrationData = {
  name: "",
  website: "",
  address: "",
  city: "",
  state_id: 0,
  postal_code: "",
  country_id: 0,
  users: [
    {
      first_name: "",
      last_name: "",
      role: "lab_admin",
      email: "",
      phone: "",
      work_number: "",
    },
  ],
  logo: null,
}

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL

const RegistrationContext = createContext<RegistrationContextType | undefined>(undefined)

export function RegistrationProvider({ children }: { children: React.ReactNode }) {
  const [registrationData, setRegistrationData] = useState<RegistrationData>({ ...defaultRegistrationData })
  const [registrationType, setRegistrationType] = useState<"Lab" | "Office">("Lab")
  const [activeStep, setActiveStep] = useState(0)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)
  const [states, setStates] = useState<State[]>([])
  const [countries, setCountries] = useState<Country[]>([])
  const { toast } = useToast()

  const calculateProgress = () => {
    const totalSteps = 3
    return Math.round(((activeStep + 1) / totalSteps) * 100)
  }

  // Update registration data
  const updateRegistrationData = (data: Partial<RegistrationData>) => {
    setRegistrationData((prev) => ({ ...prev, ...data }))
  }

  // Add a new user
  const addUser = (user: RegistrationUser) => {
    setRegistrationData((prev) => ({
      ...prev,
      users: [...prev.users, user],
    }))
  }

  // Update an existing user
  const updateUser = (index: number, userData: Partial<RegistrationUser>) => {
    setRegistrationData((prev) => {
      const updatedUsers = [...prev.users]
      updatedUsers[index] = { ...updatedUsers[index], ...userData }
      return { ...prev, users: updatedUsers }
    })
  }

  // Remove a user
  const removeUser = (index: number) => {
    setRegistrationData((prev) => {
      const updatedUsers = [...prev.users]
      updatedUsers.splice(index, 1)
      return { ...prev, users: updatedUsers }
    })
  }

  // Reset registration
  const resetRegistration = () => {
    setRegistrationData({ ...defaultRegistrationData })
    setActiveStep(0)
    setError(null)
    setSuccess(false)
  }

  // Navigation helpers
  const goToNextStep = () => {
    if (activeStep < 2) {
      setActiveStep(activeStep + 1)
    }
  }

  const goToPreviousStep = () => {
    if (activeStep > 0) {
      setActiveStep(activeStep - 1)
    }
  }

  /**
   * Handle country change and load its states
   */
  const handleCountryChange = async (countryId: number): Promise<void> => {
    try {
      // Update the registration data with the new country
      updateRegistrationData({
        country_id: countryId,
        state_id: 0, // Reset state when country changes
      })

      // Fetch states for the selected country
      if (countryId) {
        const statesData = await getStates(countryId)
        setStates(statesData)
      } else {
        setStates([])
      }
    } catch (error) {
      console.error("Error fetching states for country:", error)
      setError("Failed to load states for the selected country")
    }
  }

  // API Functions

  /**
   * Fetch states list
   */
  const getStates = async (countryId: number): Promise<State[]> => {
    try {
      const response = await fetch(`${API_BASE_URL}/general/states/${countryId}`, {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
        },
       
      })

      if (!response.ok) {
        throw new Error("Failed to fetch states")
      }

      const result = await response.json()
      if (Array.isArray(result)) {
        return result
      } else if (Array.isArray(result.data)) {
        return result.data
      } else {
        throw new Error("Invalid states format")
      }
    } catch (error) {
      console.error("Error fetching states:", error)
      setError("Failed to load states data")
      return []
    }
  }

  /**
   * Fetch countries list
   */
  const getCountries = async (): Promise<Country[]> => {
    try {
      const response = await fetch(`${API_BASE_URL}/general/countries`, {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
        },
       
      })

      if (!response.ok) {
        throw new Error("Failed to fetch countries")
      }

      const result = await response.json()
      return result.data || []
    } catch (error) {
      console.error("Error fetching countries:", error)
      setError("Failed to load countries data")
      return []
    }
  }

  /**
   * Fetch both states and countries
   */
  const fetchStatesAndCountries = useCallback(async (): Promise<void> => {
    try {
      const countriesData = await getCountries()
      setCountries(countriesData)

      if (registrationData.country_id) {
        const statesData = await getStates(registrationData.country_id)
        setStates(statesData)
      } else {
        setStates([])
      }
    } catch (error) {
      console.error("Error fetching location data:", error)
      setError("Failed to load location data. Please refresh and try again.")
    }
  }, [registrationData.country_id])

  // Submit registration
  const submitRegistration = async (invitationId: string): Promise<ApiResponse> => {
    setIsSubmitting(true)
    setError(null)

    try {
      if (!registrationData.name) {
        throw new Error("Name is required")
      }

      if (registrationData.users.length === 0) {
        throw new Error("At least one user is required")
      }

      const formData = new FormData()

      formData.append("invitation_id", invitationId)

      Object.entries(registrationData).forEach(([key, value]) => {
        if (key !== "users" && key !== "logo" && value !== null && value !== undefined) {
          formData.append(key, String(value))
        }
      })

      if (registrationData.logo) {
        formData.append("logo", registrationData.logo)
      }

      registrationData.users.forEach((user, index) => {
        Object.entries(user).forEach(([key, value]) => {
          if (value !== null && value !== undefined) {
            const formattedValue = typeof value === "boolean" ? String(value) : value
            formData.append(`users[${index}][${key}]`, formattedValue)
          }
        })
      })

      let response
      if (registrationType === "Lab") {
        response = await registerLab(formData)
      } else {
        response = await registerOffice(formData)
      }
      localStorage.setItem("onboardingComplete", "false")
      setSuccess(true)
      return { success: true, message: "Registration successful", data: response, validationErrors: null }
    } catch (err: any) {
      if (err.validationErrors) {
        setError(`Validation failed: ${Object.values(err.validationErrors).join(", ")}`)
        return {
          success: false,
          message: err.message || "Validation failed",
          validationErrors: err.validationErrors,
        }
      }

      const errorMessage = err instanceof Error ? err.message : "An unknown error occurred"
      setError(errorMessage)
      return { success: false, message: errorMessage, validationErrors: null }
    } finally {
      setIsSubmitting(false)
    }
  }

  const registerLab = async (formData: FormData) => {
    try {
      const response = await fetch(`${API_BASE_URL}/registration/lab`, {
        method: "POST",
        body: formData,
      })

      if (!response.ok) {
        const data = await response.json()

        // Better error handling for validation errors
        if (data?.errors && Object.keys(data.errors).length > 0) {
          console.error("Validation Errors:", data.errors)

          // Format validation errors for display
          const formattedErrors = Object.entries(data.errors).reduce<Record<string, string>>((acc, [field, messages]) => {
            acc[field] = Array.isArray(messages) ? messages[0] : messages
            return acc
          }, {} as Record<string, string>)

          throw {
            message: data?.error_description || "Validation failed. Please check your inputs.",
            validationErrors: formattedErrors,
          }
        }

        throw new Error(data?.error_description || "Failed to register lab")
      }

      return await response.json()
    } catch (error: any) {
      console.error("Lab registration error:", error?.message || error)
      throw error
    }
  }
  const fetchRegistrationDetails = async (invitationId: string) => {
    try {
      const response = await fetch(`${API_BASE_URL}/invitations/${invitationId}`)

      if (!response.ok) {
        const data = await response.json()

        if (response.status === 404 || data?.status_code === 404 || data.data.status == 'Accepted') {
          const errorMessage = "Invitation not found or has expired. Please contact support for assistance."
          console.error("Invitation error:", errorMessage)
          setError(errorMessage)
          return
        }

        throw new Error(data?.error_description || "Failed to fetch registration details")
      }

      const data = await response.json()
      if (data.data.status == 'Accepted') {
        const errorMessage = "Invitation not found or has expired. Please contact support for assistance."
        setError(errorMessage)
        return
      }
      const invitationType = data?.data?.type || "Lab"
      setRegistrationType(invitationType === "Office" ? "Office" : "Lab")

      const adminRole = invitationType === "Office" ? "office_admin" : "lab_admin"

      setRegistrationData({
        ...registrationData,
        name: data?.data?.name || "",
        users: [
          {
            ...registrationData.users[0],
            email: data?.data?.email || "",
            role: adminRole,
          },
        ],
      })

      setError(null)
    } catch (error) {
      setError(error instanceof Error ? error.message : "Failed to load registration details.")
    }
  }

  /**
   * Register a new office
   */
  const registerOffice = async (formData: FormData) => {
    try {
      const response = await fetch(`${API_BASE_URL}/registration/office`, {
        method: "POST",
        body: formData,
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.message || "Failed to register office")
      }

      return await response.json()
    } catch (error: any) {
      console.error("Office registration error:", error)
      throw new Error(error.message || "An error occurred during office registration")
    }
  }

  // Context value
  const value: RegistrationContextType = {
    registrationData,
    registrationType,
    activeStep,
    isSubmitting,
    error,
    success,
    progress: calculateProgress(),
    states,
    countries,

    setRegistrationType,
    updateRegistrationData,
    addUser,
    updateUser,
    removeUser,
    setActiveStep,
    submitRegistration,
    resetRegistration,
    goToNextStep,
    goToPreviousStep,
    setIsSubmitting,
    setSuccess,
    setError,
    fetchStatesAndCountries,
    handleCountryChange,
    fetchRegistrationDetails,
  }

  return <RegistrationContext.Provider value={value}>{children}</RegistrationContext.Provider>
}

export function useRegistration() {
  const context = useContext(RegistrationContext)

  if (context === undefined) {
    throw new Error("useRegistration must be used within a RegistrationProvider")
  }

  return context
}
