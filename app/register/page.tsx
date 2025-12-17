"use client"

import { useState, useEffect, useRef } from "react"
import { useRegistration, UserRole } from "@/contexts/registration-context"
import { SendingInvitesDialog } from "@/components/onboarding/sending-invites-dialog"
import { useRouter, useSearchParams } from "next/navigation"
import { ProfileForm } from "@/components/registration/profile-form"
import { AdminUserForm } from "@/components/registration/admin-user-form"
import { AdditionalUserForm } from "@/components/registration/additional-user-form"
import { ProgressBar } from "@/components/registration/progress-bar"
import { RegistrationTabs } from "@/components/registration/registration-tabs"
import { SuccessStep } from "@/components/registration/success-step"
import { useFormValidation } from "@/hooks/use-form-validation"
import { AuthHeader } from "@/components/auth-header"
import { useAuth } from "@/contexts/auth-context"
import { Loader2 } from "lucide-react"

export default function RegisterPage() {
  const { user, isLoading } = useAuth()
  const router = useRouter()

  const [error, setError] = useState<string | null>(null)
  const errorTimeoutRef = useRef<NodeJS.Timeout | null>(null)
  const {
    registrationData,
    activeStep,
    isSubmitting,
    progress,
    states,
    countries,
    updateRegistrationData,
    addUser,
    updateUser,
    removeUser,
    submitRegistration,
    goToNextStep,
    goToPreviousStep,
    setIsSubmitting,
    setSuccess,
    fetchStatesAndCountries,
    handleCountryChange,
    fetchRegistrationDetails,
    registrationType,
    setRegistrationType,
    error: contextError,
  } = useRegistration()

  const searchParams = useSearchParams()
  const invitation_id = searchParams.get("token") || ""
  const [isLoadingNext, setIsLoadingNext] = useState(false)

  const [activeTab, setActiveTab] = useState("profile")
  const [isSending, setIsSending] = useState(false)

  const [userForm, setUserForm] = useState({
    first_name: "",
    last_name: "",
    role: "",
    email: "",
    phone: "",
    work_number: "",
    is_doctor: false,
    use_same_details: false,
    use_doctor_profile: false,
    license_number: "",
    signature: null,
  })

  const [invitedPractices, setInvitedPractices] = useState<any[]>([])
  const [showAnimation, setShowAnimation] = useState(false)
  const {
    validationErrors,
    userValidationErrors,
    userFormValidationErrors,
    validateWebsiteUrl,
    validateEmail,
    validateProfileForm,
    validateAdminUserForm,
    validateNewUserForm,
    setValidationErrors,
    setUserValidationErrors,
    setUserFormValidationErrors,
    clearAllValidationErrors,
  } = useFormValidation(registrationType)

  useEffect(() => {
    fetchStatesAndCountries()
  }, [fetchStatesAndCountries])

  useEffect(() => {
    if (invitation_id) {
      fetchRegistrationDetails(invitation_id)
    }
  }, [invitation_id])

  useEffect(() => {
    if (!isLoading && user) {
      // Don't redirect to dashboard if onboarding is not complete
      // Let auth-context handle the redirect based on onboarding status
      // This prevents premature dashboard access
    }
  }, [user, isLoading, router])

  // If loading or already logged in, show a loading state
  if (isLoading || user) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="flex flex-col items-center space-y-4">
          <div className="flex space-x-2">
            <div className="w-3 h-3 bg-[#1162A8] rounded-full animate-bounce [animation-delay:-0.3s]"></div>
            <div className="w-3 h-3 bg-[#1162A8] rounded-full animate-bounce [animation-delay:-0.15s]"></div>
            <div className="w-3 h-3 bg-[#1162A8] rounded-full animate-bounce"></div>
          </div>
        </div>
      </div>
    )
  }

  const handleProfileFormChange = (e) => {
    const { name, value } = e.target
    if (name === "website" && value) {
      const isValidWebsite = validateWebsiteUrl(value)
      if (!isValidWebsite) {
        setValidationErrors((prev) => ({
          ...prev,
          website: "Please enter a valid website URL",
        }))
      } else {
        setValidationErrors((prev) => {
          const newErrors = { ...prev }
          delete newErrors.website
          return newErrors
        })
      }
    }

    updateRegistrationData({ [name]: value })
  }

  const handleAdminFormChange = (e: { target: { name: any; value: any } }) => {
    const { name, value } = e.target

    if (name === "email") {
      const isValidEmail = validateEmail(value)
      if (!isValidEmail && value) {
        setUserValidationErrors((prev) => ({
          ...prev,
          email: "Please enter a valid email address",
        }))
      } else {
        setUserValidationErrors((prev) => {
          const newErrors = { ...prev }
          delete newErrors.email
          return newErrors
        })
      }
    }

    updateUser(0, { [name]: value })
  }

  const handleUserFormChange = (e: { target: { name: any; value: any } }) => {
    const { name, value } = e.target

    // Validate email if that's the field being changed
    if (name === "email") {
      const isValidEmail = validateEmail(value)
      if (!isValidEmail && value) {
        setUserFormValidationErrors((prev) => ({
          ...prev,
          email: "Please enter a valid email address",
        }))
      } else {
        setUserFormValidationErrors((prev) => {
          const newErrors = { ...prev }
          delete newErrors.email
          return newErrors
        })
      }
    }

    setUserForm((prev) => ({
      ...prev,
      [name]: value,
    }))

    setUserFormValidationErrors((prevErrors) => ({
      ...prevErrors,
      [name]: "",
    }))
  }

  const validateMinUsers = () => {
    if (registrationData.users.length < 2) {
      setError("Please add at least one additional user")
      if (errorTimeoutRef.current) clearTimeout(errorTimeoutRef.current)
      errorTimeoutRef.current = setTimeout(() => setError(null), 3000)
      return false
    }
    return true
  }

  const handleContinue = async () => {
    setIsLoadingNext(true)
  
    try {
      const emails = registrationData.users.map((user, index) => ({
        id: index,
        name: user.email,
      }))
  
      setError(null)
      setInvitedPractices(emails)
  
      await handleStartOnboarding()
    } catch (error) {
      console.error("Failed to continue:", error)
    } finally {
      setIsLoadingNext(false)
    }
  }

  const handleNext = () => {
    if (activeStep === 0) {
      if (activeTab === "profile") {
        if (!validateProfileForm(registrationData, setValidationErrors)) {
          return
        }
        setActiveTab("user")
        return
      } else if (activeTab === "user") {
        if (!validateAdminUserForm(registrationData.users[0], setUserValidationErrors)) {
          return
        }
        goToNextStep()
        return
      }
    } else if (activeStep === 1) {
      // if (!validateMinUsers()) return
      setError(null)
      goToNextStep()
      return
    }

    goToNextStep()
  }

  const handleAddUser = () => {
    if (!validateNewUserForm(userForm, setUserFormValidationErrors)) {
      return
    }

    setShowAnimation(true)

    setTimeout(() => {
      addUser({
        ...userForm,
        role: userForm.role as UserRole,
      })

      setUserForm({
        first_name: "",
        last_name: "",
        role: "",
        email: "",
        phone: "",
        work_number: "",
        use_same_details: false,
        is_doctor: false,
        use_doctor_profile: false,
        license_number: "",
        signature: null,
      })

      setUserFormValidationErrors({})

      setTimeout(() => {
        setShowAnimation(false)
      }, 1000)
    }, 1500)
  }

  const handlePrevious = () => {
    if (activeStep === 0 && activeTab === "user") {
      setActiveTab("profile")
    } else {
      goToPreviousStep()
    }
  }

  const handleRemoveUser = (index: number) => {
    if (index > 0) {
      removeUser(index)
    }
  }

  const handleStartOnboarding = async () => {
    try {
      setIsSubmitting(true)
      setError(null)
      clearAllValidationErrors()

      const response = await submitRegistration(invitation_id)
      if (response.success) {
        setIsSending(true)
      } else {
        if (response.validationErrors) {
          const apiErrorsToFormFields = {
            name: "name",
            website: "website",
            address: "address",
            city: "city",
            state_id: "state_id",
            country_id: "country_id",
            postal_code: "postal_code",
            "users.0.first_name": "first_name",
            "users.0.last_name": "last_name",
            "users.0.email": "email",
            "users.0.phone": "phone",
            "users.0.work_number": "work_number",
            "users.0.license_number": "license_number",
            "users.0.signature": "signature",
          }

          const newValidationErrors = {}
          const newUserValidationErrors = {}

          Object.entries(response.validationErrors).forEach(([field, message]) => {
            const formField = apiErrorsToFormFields[field]
            if (formField) {
              if (field.startsWith("users.0")) {
                newUserValidationErrors[formField] = message
              } else {
                newValidationErrors[formField] = message
              }
            }
          })

          setValidationErrors(newValidationErrors)
          setUserValidationErrors(newUserValidationErrors)

          // If we have user validation errors, switch to user tab
          if (Object.keys(newUserValidationErrors).length > 0) {
            setActiveTab("user")
          }
          // If we have profile validation errors, switch to profile tab
          else if (Object.keys(newValidationErrors).length > 0) {
            setActiveTab("profile")
          }
        }
        setError(response.message || "Registration failed. Please try again.")
        setIsSubmitting(false)
      }

      return response
    } catch (error) {
      console.error("Registration error:", error)
      let errorMessage = "Failed to complete registration"
      if (typeof error === "object" && error !== null) {
        if ("message" in error && typeof (error as any).message === "string") {
          errorMessage = (error as any).message
        } else if ("error_description" in error && typeof (error as any).error_description === "string") {
          errorMessage = (error as any).error_description
        }
      }
      setError(errorMessage)
      setIsSubmitting(false)
      return { success: false, message: errorMessage }
    }
  }

  const handleOnboarding = () => {
    router.replace("/login")
  }

  const handleFileUpload = (e) => {
    const file = e.target.files?.[0]
    if (file) {
      updateRegistrationData({ logo: file })
    }
  }

  const handleDialogComplete = () => {
    setIsSending(false)
    goToNextStep()
  }

  return (
    <div className="min-h-screen flex flex-col">
      {!(error || contextError)?.includes("Invitation") && <AuthHeader progress={progress} />}
      {!(error || contextError)?.includes("Invitation") && <ProgressBar progress={progress} />}

      {/* Error message - use both local and context error */}
      {(error || contextError) && (
        <div
          className={`${(error || contextError)?.includes("Invitation") ? "bg-amber-50 border-amber-200 text-amber-800" : "bg-red-50 border-red-200 text-red-600"} p-4 mx-6 mt-4 rounded border flex items-center`}
        >
          {(error || contextError)?.includes("Invitation") && (
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" viewBox="0 0 20 20" fill="currentColor">
              <path
                fillRule="evenodd"
                d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z"
                clipRule="evenodd"
              />
            </svg>
          )}
          {error || contextError}
        </div>
      )}

      {/* Main Content */}
      <div className="flex-1 bg-[#f7fbff] p-6 flex justify-center">
        {/* Only show the registration form if there's no invitation error */}
        {!(error || contextError)?.includes("Invitation") ? (
          <div className="bg-white rounded-lg shadow-sm w-full max-w-4xl p-8">
            {activeStep === 0 ? (
              /* Step 1: User Profiles */
              <div>
                <div className="text-center mb-6">
                  <h1 className="text-2xl font-bold mb-2">Set Up User Profiles</h1>
                  <p className="text-sm text-[#a19d9d]">
                    Give us details about your {registrationType === "Lab" ? "dental laboratory" : "dental practice"}{" "}
                    and set up user profile.
                  </p>
                </div>

                <RegistrationTabs
                  activeTab={activeTab}
                  setActiveTab={setActiveTab}
                  registrationType={registrationType}
                />

                {activeTab === "profile" ? (
                  <ProfileForm
                    registrationData={registrationData}
                    validationErrors={validationErrors}
                    handleProfileFormChange={handleProfileFormChange}
                    handleCountryChange={handleCountryChange}
                    handleFileUpload={handleFileUpload}
                    countries={countries}
                    states={states}
                    registrationType={registrationType}
                  />
                ) : (
                  <AdminUserForm
                    adminUser={registrationData.users[0] || {}}
                    userValidationErrors={userValidationErrors}
                    handleAdminFormChange={handleAdminFormChange}
                    updateUser={updateUser}
                    registrationType={registrationType}
                  />
                )}

                {/* Navigation buttons */}
                <div className="flex justify-between mt-8">
                  <div className="space-x-4">
                    <button className="px-6 py-2 bg-[#f1f5f9] text-[#64748b] rounded">Continue Later</button>
                    <button className="px-6 py-2 bg-[#f1f5f9] text-[#64748b] rounded" onClick={handlePrevious}>
                      Previous
                    </button>
                  </div>
                  <button
                    className="px-6 py-2 bg-white text-[#1162a8] border border-[#1162a8] rounded"
                    onClick={handleNext}
                  >
                    Next
                  </button>
                </div>
              </div>
            ) : activeStep === 1 ? (
              /* Step 2: Additional Users */
              <div>
                <div className="text-center mb-6">
                  <h1 className="text-2xl font-bold mb-2">Set Up User Profiles</h1>
                  <p className="text-sm text-[#a19d9d]">
                    Give us details about your dental {registrationType === "Lab" ? "laboratory" : "practice"} and set
                    up user profile.
                  </p>
                </div>

                <RegistrationTabs activeTab="user" setActiveTab={() => {}} registrationType={registrationType} />

                <AdditionalUserForm
                  userForm={userForm}
                  users={registrationData.users}
                  userFormValidationErrors={userFormValidationErrors}
                  handleUserFormChange={handleUserFormChange}
                  handleRemoveUser={handleRemoveUser}
                  handleAddUser={handleAddUser}
                  showAnimation={showAnimation}
                  setUserForm={setUserForm}
                  registrationType={registrationType}
                />

                {/* Navigation buttons */}
                <div className="flex justify-between mt-8">
                  <div className="space-x-4">
                    <button className="px-6 py-2 bg-[#f1f5f9] text-[#64748b] rounded">Continue Later</button>
                  </div>
                  <button
                    className="px-6 py-2 bg-white text-[#1162a8] border border-[#1162a8] rounded"
                    onClick={handleContinue}
                  >
                    {isLoadingNext ? "Sending..." : "Next"}
                  </button>
                </div>

                {/* Sending invites dialog */}
                <SendingInvitesDialog
                  isOpen={isSending}
                  onComplete={handleDialogComplete}
                  practices={invitedPractices}
                />
              </div>
            ) : (
              /* Step 3: Ready to Start */
              <SuccessStep
                users={registrationData.users}
                isSubmitting={isSubmitting}
                handleOnboarding={handleOnboarding}
              />
            )}
          </div>
        ) : (
          /* Show an invitation error card */
          <div className="bg-white rounded-lg shadow-sm w-full max-w-md p-8 text-center">
            <div className="text-amber-500 mb-4">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="h-16 w-16 mx-auto"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                />
              </svg>
            </div>
            <h2 className="text-xl font-bold mb-4">Invitation Error</h2>
            <p className="mb-6 text-gray-600">{error || contextError}</p>
            <div className="flex justify-center">
              <a
                href="mailto:support@rxn3d.com"
                className="px-6 py-2 bg-[#1162a8] text-white rounded inline-flex items-center"
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  className="h-5 w-5 mr-2"
                  viewBox="0 0 20 20"
                  fill="currentColor"
                >
                  <path d="M2.003 5.884L10 9.882l7.997-3.998A2 2 0 0016 4H4a2 2 0 00-1.997 1.884z" />
                  <path d="M18 8.118l-8 4-8-4V14a2 2 0 002 2h12a2 2 0 002-2V8.118z" />
                </svg>
                Contact Support
              </a>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
