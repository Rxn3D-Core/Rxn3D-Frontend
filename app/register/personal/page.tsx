"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { notFound } from "next/navigation"
import { Eye, EyeOff, Loader2, Mail, UserRound } from "lucide-react"
import { RegistrationOtpField } from "@/components/registration/registration-otp-field"
import { RegistrationStepper } from "@/components/registration/registration-stepper"
import { TermsCheckbox } from "@/components/registration/terms-checkbox"
import {
  RegistrationCard,
  RegistrationPageHeader,
  RegistrationPageShell,
} from "@/components/registration/registration-page-shell"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { isOpenRegistrationEnabled } from "@/lib/config/registration"
import { registerSelfUser } from "@/lib/registration-api"
import { useAuth } from "@/contexts/auth-context"
import Link from "next/link"

const STEPS = [
  { id: "details", label: "Account details", icon: UserRound },
  { id: "verify", label: "Verify email", icon: Mail },
] as const

type PersonalStep = (typeof STEPS)[number]["id"]

export default function RegisterPersonalPage() {
  const router = useRouter()
  const { setAuthFromData } = useAuth()
  const [activeStep, setActiveStep] = useState<PersonalStep>("details")
  const [form, setForm] = useState({
    email: "",
    first_name: "",
    last_name: "",
    phone: "",
    password: "",
    password_confirmation: "",
  })
  const [otp, setOtp] = useState("")
  const [otpError, setOtpError] = useState<string | null>(null)
  const [acceptedTerms, setAcceptedTerms] = useState(false)
  const [termsError, setTermsError] = useState<string | undefined>()
  const [error, setError] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)

  if (!isOpenRegistrationEnabled) {
    notFound()
  }

  const validateDetails = () => {
    if (!form.email.trim()) {
      setError("Please enter your email address.")
      return false
    }

    if (!form.first_name || !form.last_name || !form.phone || !form.password) {
      setError("Please complete all required fields.")
      return false
    }

    if (form.password !== form.password_confirmation) {
      setError("Passwords do not match.")
      return false
    }

    setError(null)
    return true
  }

  const handleContinue = () => {
    if (!validateDetails()) return
    setOtp("")
    setOtpError(null)
    setActiveStep("verify")
  }

  const handleSubmit = async () => {
    setError(null)
    setTermsError(undefined)
    setOtpError(null)

    if (!validateDetails()) {
      setActiveStep("details")
      return
    }

    if (!acceptedTerms) {
      setTermsError("You must accept the Terms of Service and Privacy Policy.")
      return
    }

    if (otp.length !== 6) {
      setOtpError("Enter the 6-digit verification code sent to your email.")
      setError(null)
      return
    }

    setIsSubmitting(true)
    try {
      const response = await registerSelfUser({
        email: form.email.trim(),
        otp,
        accepted_terms: true,
        first_name: form.first_name,
        last_name: form.last_name,
        phone: form.phone,
        password: form.password,
        password_confirmation: form.password_confirmation,
      })

      const authPayload = response?.data?.auth
      if (authPayload) {
        if (!authPayload.permissions && authPayload.user?.permissions) {
          authPayload.permissions = authPayload.user.permissions
        }
        await setAuthFromData(authPayload)
        router.replace("/get-started")
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

  return (
    <RegistrationPageShell
      size="narrow"
      backHref="/register"
      backLabel="Choose account type"
      showLogo
    >
      <RegistrationPageHeader
        compact
        title="Create your account"
        description={
          activeStep === "details"
            ? "Enter your details to get started."
            : "Verify your email to finish signup."
        }
      />

      <RegistrationStepper
        steps={[...STEPS]}
        activeStep={activeStep}
        onStepChange={(stepId) => setActiveStep(stepId as PersonalStep)}
        compact
      />

      <RegistrationCard flat className="space-y-4">
        {activeStep === "details" ? (
          <>
            <Input
              type="email"
              id="email"
              label="Email address"
              value={form.email}
              onChange={(e) => setForm((prev) => ({ ...prev, email: e.target.value }))}
              validationState={form.email ? "valid" : "default"}
            />

            <div className="grid gap-3 sm:grid-cols-2">
              <Input
                id="first_name"
                label="First name"
                value={form.first_name}
                onChange={(e) => setForm((prev) => ({ ...prev, first_name: e.target.value }))}
                validationState={form.first_name ? "valid" : "default"}
              />
              <Input
                id="last_name"
                label="Last name"
                value={form.last_name}
                onChange={(e) => setForm((prev) => ({ ...prev, last_name: e.target.value }))}
                validationState={form.last_name ? "valid" : "default"}
              />
            </div>

            <Input
              id="phone"
              label="Phone number"
              value={form.phone}
              onChange={(e) => setForm((prev) => ({ ...prev, phone: e.target.value }))}
              validationState={form.phone ? "valid" : "default"}
            />

            <div className="relative">
              <Input
                id="password"
                type={showPassword ? "text" : "password"}
                label="Password"
                value={form.password}
                onChange={(e) => setForm((prev) => ({ ...prev, password: e.target.value }))}
                showValidIcon={false}
                className="pr-12"
              />
              <button
                type="button"
                className="absolute right-4 top-[17px] rounded-full p-1 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-600"
                onClick={() => setShowPassword(!showPassword)}
                aria-label={showPassword ? "Hide password" : "Show password"}
              >
                {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
              </button>
            </div>

            <div className="relative">
              <Input
                id="password_confirmation"
                type={showConfirmPassword ? "text" : "password"}
                label="Confirm password"
                value={form.password_confirmation}
                onChange={(e) =>
                  setForm((prev) => ({ ...prev, password_confirmation: e.target.value }))
                }
                validationState={
                  form.password_confirmation && form.password !== form.password_confirmation
                    ? "error"
                    : form.password_confirmation
                      ? "valid"
                      : "default"
                }
                errorMessage={
                  form.password_confirmation && form.password !== form.password_confirmation
                    ? "Passwords do not match"
                    : undefined
                }
                showValidIcon={false}
                className="pr-12"
              />
              <button
                type="button"
                className="absolute right-4 top-[17px] rounded-full p-1 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-600"
                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                aria-label={showConfirmPassword ? "Hide password" : "Show password"}
              >
                {showConfirmPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
              </button>
            </div>
          </>
        ) : (
          <>
            <RegistrationOtpField
              email={form.email}
              purpose="personal"
              otp={otp}
              onOtpChange={setOtp}
              firstName={form.first_name}
              disabled={!form.email.trim()}
              error={otpError}
              onError={setOtpError}
            />

            <TermsCheckbox
              checked={acceptedTerms}
              onCheckedChange={setAcceptedTerms}
              error={termsError}
            />

            <p className="text-xs text-slate-500">
              Wrong email?{" "}
              <button
                type="button"
                className="font-medium text-[#1162A8] hover:underline"
                onClick={() => setActiveStep("details")}
              >
                Edit account details
              </button>
            </p>
          </>
        )}

        {error ? (
          <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">{error}</p>
        ) : null}

        <Button
          type="button"
          size="lg"
          className="h-12 w-full"
          disabled={isSubmitting}
          onClick={activeStep === "details" ? handleContinue : handleSubmit}
        >
          {isSubmitting ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Creating account...
            </>
          ) : activeStep === "details" ? (
            "Continue"
          ) : (
            "Create account"
          )}
        </Button>

        {activeStep === "details" ? (
          <p className="text-center text-sm text-slate-600">
            Already have an account?{" "}
            <Link href="/login" className="font-semibold text-[#1162A8] hover:underline">
              Sign in
            </Link>
          </p>
        ) : null}
      </RegistrationCard>
    </RegistrationPageShell>
  )
}
