"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { Loader2 } from "lucide-react"
import { ProfileForm } from "@/components/registration/profile-form"
import { AdminUserForm } from "@/components/registration/admin-user-form"
import { RegistrationOtpField } from "@/components/registration/registration-otp-field"
import { TermsCheckbox } from "@/components/registration/terms-checkbox"
import { RegistrationTabs } from "@/components/registration/registration-tabs"
import {
  RegistrationCard,
  RegistrationPageHeader,
  RegistrationPageShell,
} from "@/components/registration/registration-page-shell"
import { useRegistration, type UserRole } from "@/contexts/registration-context"
import { useFormValidation } from "@/hooks/use-form-validation"
import { useAuth } from "@/contexts/auth-context"
import { registerSelfOrganization } from "@/lib/registration-api"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { RegistrationListedSuccess } from "@/components/registration/registration-listed-success"
import type { AuthData } from "@/hooks/use-login"

interface SelfOrgRegistrationWizardProps {
  type: "Lab" | "Office"
  skipOtp?: boolean
}

type OrgStep = "profile" | "user" | "verify"

type RegistrationSuccessState = {
  organizationName: string
  locationLabel: string
  logoUrl: string | null
  pendingAuth: AuthData
}

export function SelfOrgRegistrationWizard({ type, skipOtp = false }: SelfOrgRegistrationWizardProps) {
  const router = useRouter()
  const { setAuthFromData, token: authToken, user } = useAuth()
  const {
    registrationData,
    registrationType,
    states,
    countries,
    updateRegistrationData,
    updateUser,
    fetchStatesAndCountries,
    handleCountryChange,
    setRegistrationType,
  } = useRegistration()

  const {
    validationErrors,
    userValidationErrors,
    validateWebsiteUrl,
    validateEmail,
    validateProfileForm,
    validateAdminUserForm,
    setValidationErrors,
    setUserValidationErrors,
    clearAllValidationErrors,
  } = useFormValidation(type)

  const [orgEmail, setOrgEmail] = useState("")
  const [activeTab, setActiveTab] = useState<OrgStep>("profile")
  const [otp, setOtp] = useState("")
  const [otpError, setOtpError] = useState<string | null>(null)
  const [acceptedTerms, setAcceptedTerms] = useState(false)
  const [termsError, setTermsError] = useState<string | undefined>()
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isContinuing, setIsContinuing] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [registrationSuccess, setRegistrationSuccess] = useState<RegistrationSuccessState | null>(null)

  useEffect(() => {
    if (skipOtp && !user) {
      const path = type === "Lab" ? "/register/lab" : "/register/office"
      router.replace(`/login?redirect=${path}?authenticated=1`)
    }
  }, [skipOtp, user, router, type])

  useEffect(() => {
    setRegistrationType(type)
    updateRegistrationData({
      users: [
        {
          ...registrationData.users[0],
          role: (type === "Lab" ? "lab_admin" : "office_admin") as UserRole,
          email: skipOtp ? user?.email || "" : registrationData.users[0].email,
          first_name: skipOtp ? user?.first_name || "" : registrationData.users[0].first_name,
          last_name: skipOtp ? user?.last_name || "" : registrationData.users[0].last_name,
          phone: skipOtp ? user?.phone || "" : registrationData.users[0].phone,
        },
      ],
    })
    fetchStatesAndCountries()
  }, [type, skipOtp])

  const handleProfileFormChange = (e: { target: { name: string; value: any } }) => {
    const { name, value } = e.target
    if (name === "website" && value) {
      const isValidWebsite = validateWebsiteUrl(value)
      if (!isValidWebsite) {
        setValidationErrors((prev) => ({ ...prev, website: "Please enter a valid website URL" }))
      } else {
        setValidationErrors((prev) => {
          const next = { ...prev }
          delete next.website
          return next
        })
      }
    }
    updateRegistrationData({ [name]: value })
  }

  const handleOrgEmailChange = (value: string) => {
    setOrgEmail(value)
    if (!skipOtp) {
      updateUser(0, { email: value.trim() })
    }
  }

  const handleAdminFormChange = (e: { target: { name: string; value: any } }) => {
    const { name, value } = e.target
    if (name === "email") {
      const isValidEmail = validateEmail(value)
      if (!isValidEmail && value) {
        setUserValidationErrors((prev) => ({ ...prev, email: "Please enter a valid email address" }))
      } else {
        setUserValidationErrors((prev) => {
          const next = { ...prev }
          delete next.email
          return next
        })
      }
    }
    setUserValidationErrors((prev) => {
      const next = { ...prev }
      delete next[name]
      return next
    })
    updateUser(0, { [name]: value })
  }

  const buildLocationLabel = () => {
    const city = registrationData.city?.trim()
    const stateName = states.find((state) => state.id === registrationData.state_id)?.name
    if (city && stateName) return `${city}, ${stateName}`
    if (city) return city
    if (stateName) return stateName
    return ""
  }

  const buildLogoPreviewUrl = (apiLogoUrl?: string | null) => {
    if (registrationData.logo instanceof File) {
      return URL.createObjectURL(registrationData.logo)
    }
    return apiLogoUrl || null
  }

  const handleContinueToDashboard = async () => {
    if (!registrationSuccess?.pendingAuth) return

    setIsContinuing(true)
    try {
      const authPayload = registrationSuccess.pendingAuth
      if (!authPayload.permissions && authPayload.user?.permissions) {
        authPayload.permissions = authPayload.user.permissions
      }
      await setAuthFromData(authPayload)
    } finally {
      setIsContinuing(false)
    }
  }

  const handleCloseRegistration = () => {
    if (typeof window !== "undefined" && window.opener) {
      window.close()
      return
    }
    router.push("/login")
  }

  const handleSubmit = async () => {
    setError(null)
    setTermsError(undefined)
    setOtpError(null)
    clearAllValidationErrors()

    if (!acceptedTerms) {
      setTermsError("You must accept the Terms of Service and Privacy Policy.")
      if (skipOtp) {
        setActiveTab("user")
      } else {
        setActiveTab("verify")
      }
      return
    }

    if (!validateProfileForm(registrationData, setValidationErrors)) {
      setActiveTab("profile")
      return
    }

    if (!orgEmail.trim() || !validateEmail(orgEmail)) {
      setValidationErrors((prev) => ({ ...prev, org_email: "Please enter a valid organization email." }))
      setActiveTab("profile")
      return
    }

    if (!validateAdminUserForm(registrationData.users[0], setUserValidationErrors)) {
      setActiveTab("user")
      return
    }

    if (!skipOtp && otp.length !== 6) {
      setOtpError("Enter the 6-digit verification code sent to your admin email.")
      setError(null)
      setActiveTab("verify")
      return
    }

    setIsSubmitting(true)
    try {
      const formData = new FormData()
      formData.append("accepted_terms", "1")
      formData.append("org_email", orgEmail.trim())

      if (!skipOtp) {
        formData.append("otp", otp)
      }

      Object.entries(registrationData).forEach(([key, value]) => {
        if (key !== "users" && key !== "logo" && value !== null && value !== undefined) {
          formData.append(key, String(value))
        }
      })

      if (registrationData.logo) {
        formData.append("logo", registrationData.logo)
      }

      registrationData.users.forEach((userItem, index) => {
        Object.entries(userItem).forEach(([key, value]) => {
          if (value !== null && value !== undefined && key !== "password_confirmation") {
            const formattedValue = typeof value === "boolean" ? String(value) : value
            formData.append(`users[${index}][${key}]`, formattedValue)
          }
        })
      })

      const response = await registerSelfOrganization(
        type === "Lab" ? "lab" : "office",
        formData,
        skipOtp ? authToken : null
      )

      localStorage.setItem("onboardingComplete", "false")

      const authPayload = response?.data?.auth
      if (authPayload) {
        const entityKey = type === "Lab" ? "lab" : "office"
        const registeredEntity = response?.data?.[entityKey]
        const logoUrl = buildLogoPreviewUrl(registeredEntity?.logo_url)

        setRegistrationSuccess({
          organizationName:
            registrationData.name.trim() ||
            registeredEntity?.name ||
            (type === "Lab" ? "Your lab" : "Your practice"),
          locationLabel: buildLocationLabel(),
          logoUrl,
          pendingAuth: authPayload as AuthData,
        })
        return
      }

      router.push("/login")
    } catch (err) {
      const message = err instanceof Error ? err.message : "Registration failed."
      if (/verification|code|otp/i.test(message)) {
        setOtpError(message)
        setError(null)
      } else {
        setError(message)
      }
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleNext = () => {
    if (activeTab === "profile") {
      if (!validateProfileForm(registrationData, setValidationErrors)) return
      if (!orgEmail.trim() || !validateEmail(orgEmail)) {
        setValidationErrors((prev) => ({ ...prev, org_email: "Please enter a valid organization email." }))
        return
      }
      if (!skipOtp) {
        updateUser(0, { email: orgEmail.trim() })
      }
      setActiveTab("user")
      return
    }

    if (activeTab === "user") {
      if (!validateAdminUserForm(registrationData.users[0], setUserValidationErrors)) return
      if (skipOtp) {
        void handleSubmit()
        return
      }
      setOtp("")
      setOtpError(null)
      setActiveTab("verify")
      return
    }

    void handleSubmit()
  }

  const handleBack = () => {
    if (activeTab === "verify") {
      setActiveTab("user")
    } else if (activeTab === "user") {
      setActiveTab("profile")
    } else if (skipOtp) {
      router.push("/get-started")
    } else {
      router.push("/register")
    }
  }

  const adminEmail = registrationData.users[0]?.email ?? ""
  const entityLabel = type === "Lab" ? "Lab" : "Practice"

  const stepDescription =
    registrationSuccess
      ? type === "Lab"
        ? "Your lab is listed on Rxn3D."
        : "Your practice is registered on Rxn3D."
      : activeTab === "profile"
        ? `Tell us about your ${entityLabel.toLowerCase()} and organization contact email.`
        : activeTab === "user"
          ? "Set up the primary admin account for your organization."
          : "Verify your admin email address to complete registration."

  if (registrationSuccess) {
    return (
      <RegistrationPageShell size="medium" fitViewport showLogo className="justify-center">
        <RegistrationCard className="mx-auto flex w-full max-w-lg flex-col items-center justify-center !p-6 sm:!p-8">
          <RegistrationListedSuccess
            type={type}
            organizationName={registrationSuccess.organizationName}
            locationLabel={registrationSuccess.locationLabel}
            logoUrl={registrationSuccess.logoUrl}
            isContinuing={isContinuing}
            onContinue={() => void handleContinueToDashboard()}
            onClose={handleCloseRegistration}
          />
        </RegistrationCard>
      </RegistrationPageShell>
    )
  }

  return (
    <RegistrationPageShell
      size="medium"
      fitViewport
      showLogo
      backHref={skipOtp ? "/get-started" : "/register"}
      backLabel={skipOtp ? "Back to dashboard" : "Choose account type"}
      headerAside={
        <RegistrationPageHeader
          dense
          align="right"
          badge={skipOtp ? "Add organization" : "Open registration"}
          title={`Register your ${entityLabel}`}
          description={stepDescription}
        />
      }
    >
      <div className="flex min-h-0 flex-1 flex-col sm:overflow-hidden">
        <RegistrationTabs
          activeTab={activeTab}
          setActiveTab={(tab) => setActiveTab(tab as OrgStep)}
          registrationType={registrationType}
          includeVerifyStep={!skipOtp}
          dense
        />

        <RegistrationCard className="mx-auto flex w-full min-h-0 flex-1 flex-col sm:overflow-hidden !p-4 sm:!p-5">
          <div className="min-h-0 flex-1 overflow-visible px-0.5 pb-2 pt-1 sm:overflow-y-auto sm:overscroll-contain sm:pb-2 sm:pt-2 sm:no-scrollbar">
            {activeTab === "profile" ? (
              <div className="space-y-3">
                <div>
                  <Input
                    id="org_email"
                    type="email"
                    label="Organization contact email"
                    value={orgEmail}
                    onChange={(e) => handleOrgEmailChange(e.target.value)}
                    validationState={
                      validationErrors.org_email
                        ? "error"
                        : orgEmail && validateEmail(orgEmail)
                          ? "valid"
                          : "default"
                    }
                    errorMessage={validationErrors.org_email}
                  />
                  <p className="mt-1 text-xs text-slate-500">
                    Used for organization communications. This can differ from your admin login email.
                  </p>
                </div>

                <ProfileForm
                  dense
                  registrationData={registrationData}
                  validationErrors={validationErrors}
                  handleProfileFormChange={handleProfileFormChange}
                  handleCountryChange={handleCountryChange}
                  handleFileUpload={(e) => {
                    const file = e.target.files?.[0] || null
                    updateRegistrationData({ logo: file })
                  }}
                  countries={countries}
                  states={states}
                  registrationType={registrationType}
                />
              </div>
            ) : activeTab === "user" ? (
              <div className="space-y-3">
                <AdminUserForm
                  dense
                  allowAdminEmailEdit={!skipOtp}
                  adminUser={registrationData.users[0]}
                  userValidationErrors={userValidationErrors}
                  handleAdminFormChange={handleAdminFormChange}
                  updateUser={updateUser}
                  registrationType={registrationType}
                />
                {skipOtp ? (
                  <TermsCheckbox
                    checked={acceptedTerms}
                    onCheckedChange={setAcceptedTerms}
                    error={termsError}
                  />
                ) : null}
              </div>
            ) : (
              <div className="space-y-3">
                <RegistrationOtpField
                  email={adminEmail}
                  purpose={type === "Lab" ? "lab" : "office"}
                  otp={otp}
                  onOtpChange={setOtp}
                  firstName={registrationData.users[0]?.first_name}
                  disabled={!adminEmail.trim()}
                  error={otpError}
                  onError={setOtpError}
                  emailLabel="Admin login email"
                />

                <TermsCheckbox
                  checked={acceptedTerms}
                  onCheckedChange={setAcceptedTerms}
                  error={termsError}
                />

                <p className="text-xs text-slate-500">
                  Need to change your admin email?{" "}
                  <button
                    type="button"
                    className="font-medium text-[#1162A8] hover:underline"
                    onClick={() => setActiveTab("user")}
                  >
                    Go back to admin account
                  </button>
                </p>
              </div>
            )}
          </div>

          {error ? (
            <p className="mt-3 shrink-0 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">{error}</p>
          ) : null}

          <div className="mt-4 flex shrink-0 flex-col-reverse gap-3 border-t border-slate-100 pt-4 sm:flex-row sm:justify-between">
            <Button
              type="button"
              variant="outline"
              className="w-full sm:min-w-[120px] sm:w-auto"
              onClick={handleBack}
            >
              Back
            </Button>
            <Button
              type="button"
              size="lg"
              className="w-full sm:min-w-[160px] sm:w-auto"
              onClick={handleNext}
              disabled={isSubmitting}
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Submitting...
                </>
              ) : activeTab === "profile" || activeTab === "user" ? (
                skipOtp && activeTab === "user" ? (
                  "Create account"
                ) : (
                  "Continue"
                )
              ) : (
                "Create account"
              )}
            </Button>
          </div>
        </RegistrationCard>
      </div>
    </RegistrationPageShell>
  )
}
