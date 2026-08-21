"use client"

import { useCallback, useEffect, useRef, useState } from "react"
import { Turnstile, type TurnstileInstance } from "@marsidev/react-turnstile"
import { CheckCircle2, Loader2, Mail, ShieldCheck } from "lucide-react"
import { InputOTP, InputOTPGroup, InputOTPSlot } from "@/components/ui/input-otp"
import { isTurnstileEnabled, turnstileSiteKey } from "@/lib/config/registration"
import { checkRegistrationOtp, sendRegistrationOtp } from "@/lib/registration-api"
import type { RegistrationPurpose } from "@/lib/config/registration"
import { cn } from "@/lib/utils"

const RESEND_COOLDOWN_SECONDS = 30

function otpSessionKey(purpose: RegistrationPurpose, email: string) {
  return `reg-otp-sent:${purpose}:${email.toLowerCase()}`
}

interface RegistrationOtpFieldProps {
  email: string
  purpose: RegistrationPurpose
  otp: string
  onOtpChange: (otp: string) => void
  firstName?: string
  disabled?: boolean
  error?: string | null
  onError?: (message: string | null) => void
  onVerifiedChange?: (verified: boolean) => void
  emailLabel?: string
}

export function RegistrationOtpField({
  email,
  purpose,
  otp,
  onOtpChange,
  firstName,
  disabled = false,
  error,
  onError,
  onVerifiedChange,
  emailLabel = "Verification email",
}: RegistrationOtpFieldProps) {
  const turnstileRef = useRef<TurnstileInstance>(null)
  const otpSentToEmailRef = useRef<string | null>(null)
  const autoSendInFlightRef = useRef(false)
  const verifyRequestIdRef = useRef(0)

  const [turnstileToken, setTurnstileToken] = useState<string | null>(null)
  const [codeSent, setCodeSent] = useState(false)
  const [isSending, setIsSending] = useState(false)
  const [isVerifying, setIsVerifying] = useState(false)
  const [isVerified, setIsVerified] = useState(false)
  const [resendCooldown, setResendCooldown] = useState(0)
  const [localError, setLocalError] = useState<string | null>(null)

  const displayError = error ?? localError
  const trimmedEmail = email.trim()
  const normalizedEmail = trimmedEmail.toLowerCase()
  const canAutoSend =
    !disabled &&
    !!trimmedEmail &&
    !codeSent &&
    !isSending &&
    (!isTurnstileEnabled || !!turnstileToken)

  const clearErrors = useCallback(() => {
    setLocalError(null)
    onError?.(null)
  }, [onError])

  const resetVerificationState = useCallback(() => {
    setIsVerified(false)
    onVerifiedChange?.(false)
    verifyRequestIdRef.current += 1
  }, [onVerifiedChange])

  useEffect(() => {
    if (!trimmedEmail || typeof window === "undefined") return

    const sessionKey = otpSessionKey(purpose, normalizedEmail)
    if (window.sessionStorage.getItem(sessionKey) === "1") {
      otpSentToEmailRef.current = normalizedEmail
      setCodeSent(true)
    }
  }, [normalizedEmail, purpose, trimmedEmail])

  useEffect(() => {
    if (resendCooldown <= 0) return
    const timer = window.setTimeout(() => setResendCooldown((value) => value - 1), 1000)
    return () => window.clearTimeout(timer)
  }, [resendCooldown])

  useEffect(() => {
    const sentTo = otpSentToEmailRef.current
    if (sentTo === null) return

    if (sentTo !== normalizedEmail) {
      if (typeof window !== "undefined" && sentTo) {
        window.sessionStorage.removeItem(otpSessionKey(purpose, sentTo))
      }
      otpSentToEmailRef.current = null
      autoSendInFlightRef.current = false
      setCodeSent(false)
      setResendCooldown(0)
      onOtpChange("")
      resetVerificationState()
      setTurnstileToken(null)
      turnstileRef.current?.reset()
      setLocalError("Email address changed. A new verification code will be sent.")
      onError?.(null)
    }
  }, [normalizedEmail, onError, onOtpChange, resetVerificationState])

  const handleSendOtp = useCallback(
    async (isResend = false) => {
      clearErrors()

      if (!trimmedEmail) {
        const message = "Enter your email address before requesting a code."
        setLocalError(message)
        onError?.(message)
        return
      }

      if (isTurnstileEnabled && !turnstileToken) {
        const message = "Please complete the security check."
        setLocalError(message)
        onError?.(message)
        return
      }

      setIsSending(true)
      try {
        await sendRegistrationOtp({
          email: trimmedEmail,
          purpose,
          turnstileToken: turnstileToken ?? undefined,
          firstName,
        })
        otpSentToEmailRef.current = normalizedEmail
        if (typeof window !== "undefined") {
          window.sessionStorage.setItem(otpSessionKey(purpose, normalizedEmail), "1")
        }
        setCodeSent(true)
        onOtpChange("")
        resetVerificationState()
        setResendCooldown(RESEND_COOLDOWN_SECONDS)
        turnstileRef.current?.reset()
        setTurnstileToken(null)
      } catch (err) {
        const message = err instanceof Error ? err.message : "Failed to send verification code."
        setLocalError(message)
        onError?.(message)
        if (!isResend) {
          setCodeSent(false)
        }
        turnstileRef.current?.reset()
        setTurnstileToken(null)
      } finally {
        setIsSending(false)
        autoSendInFlightRef.current = false
      }
    },
    [
      clearErrors,
      firstName,
      normalizedEmail,
      onError,
      onOtpChange,
      purpose,
      resetVerificationState,
      trimmedEmail,
      turnstileToken,
    ]
  )

  useEffect(() => {
    if (!canAutoSend || autoSendInFlightRef.current) return
    if (otpSentToEmailRef.current === normalizedEmail) return

    autoSendInFlightRef.current = true
    void handleSendOtp(false)
  }, [canAutoSend, handleSendOtp, normalizedEmail])

  useEffect(() => {
    if (!codeSent || otp.length !== 6) {
      if (isVerified) {
        resetVerificationState()
      }
      return
    }

    const requestId = ++verifyRequestIdRef.current
    setIsVerifying(true)
    clearErrors()

    const timer = window.setTimeout(async () => {
      try {
        await checkRegistrationOtp({
          email: trimmedEmail,
          purpose,
          otp,
        })

        if (requestId !== verifyRequestIdRef.current) return

        setIsVerified(true)
        onVerifiedChange?.(true)
        clearErrors()
      } catch (err) {
        if (requestId !== verifyRequestIdRef.current) return

        const message = err instanceof Error ? err.message : "Invalid verification code."
        setIsVerified(false)
        onVerifiedChange?.(false)
        setLocalError(message)
        onError?.(message)
      } finally {
        if (requestId === verifyRequestIdRef.current) {
          setIsVerifying(false)
        }
      }
    }, 400)

    return () => window.clearTimeout(timer)
  }, [
    clearErrors,
    codeSent,
    isVerified,
    onError,
    onVerifiedChange,
    otp,
    purpose,
    resetVerificationState,
    trimmedEmail,
  ])

  const handleResend = () => {
    if (resendCooldown > 0 || isSending) return
    void handleSendOtp(true)
  }

  const showOtpEntry = codeSent || isSending

  return (
    <div
      className={cn(
        "overflow-hidden rounded-xl border transition-colors",
        isVerified
          ? "border-emerald-400/80 bg-gradient-to-br from-emerald-50 to-emerald-100/60"
          : showOtpEntry
            ? "border-emerald-200/80 bg-gradient-to-br from-emerald-50/80 to-blue-50/50"
            : "border-[#1162A8]/15 bg-gradient-to-br from-[#1162A8]/5 to-slate-50/80"
      )}
    >
      <div className="flex items-start gap-3 border-b border-inherit px-4 py-4 sm:px-5">
        <div
          className={cn(
            "flex h-10 w-10 shrink-0 items-center justify-center rounded-full",
            isVerified
              ? "bg-emerald-200 text-emerald-800"
              : showOtpEntry
                ? "bg-emerald-100 text-emerald-700"
                : "bg-[#1162A8]/10 text-[#1162A8]"
          )}
        >
          {isSending ? (
            <Loader2 className="h-5 w-5 animate-spin" />
          ) : isVerified ? (
            <CheckCircle2 className="h-5 w-5" />
          ) : showOtpEntry ? (
            <Mail className="h-5 w-5" />
          ) : (
            <Mail className="h-5 w-5" />
          )}
        </div>
        <div className="min-w-0 flex-1 space-y-1">
          <p className="text-xs font-medium uppercase tracking-wide text-slate-500">{emailLabel}</p>
          <p className="truncate text-sm font-semibold text-slate-800">{trimmedEmail || "—"}</p>
          <h3 className="pt-1 text-sm font-semibold text-slate-800">
            {isVerified
              ? "Email verified"
              : isSending
                ? "Sending verification code..."
                : showOtpEntry
                  ? "Check your inbox"
                  : isTurnstileEnabled
                    ? "Complete security check"
                    : "Sending verification code..."}
          </h3>
          <p className="text-xs leading-relaxed text-slate-600 sm:text-sm">
            {isVerified ? (
              <>Your email is verified. You can create your account now.</>
            ) : showOtpEntry ? (
              <>
                We sent a 6-digit code to this address. Enter it below, then submit the form.
              </>
            ) : isTurnstileEnabled ? (
              <>Complete the security check below and we&apos;ll email you a one-time code.</>
            ) : (
              <>We&apos;re sending a one-time code to confirm you own this email.</>
            )}
          </p>
        </div>
      </div>

      <div className="space-y-4 px-4 py-4 sm:px-5 sm:py-5">
        {isTurnstileEnabled && !codeSent ? (
          <div className="flex flex-col items-center gap-2 rounded-lg bg-white/70 p-3">
            <div className="flex items-center gap-2 text-xs text-slate-500">
              <ShieldCheck className="h-3.5 w-3.5" />
              Security verification
            </div>
            <Turnstile
              ref={turnstileRef}
              siteKey={turnstileSiteKey}
              options={{ theme: "light", size: "flexible" }}
              onSuccess={setTurnstileToken}
              onExpire={() => setTurnstileToken(null)}
              onError={() => setTurnstileToken(null)}
            />
          </div>
        ) : null}

        {showOtpEntry ? (
          <>
            <div className="space-y-3">
              <p className="text-center text-xs font-medium uppercase tracking-wide text-slate-500">
                Enter verification code
              </p>
              <div className="flex justify-center">
                <InputOTP maxLength={6} value={otp} onChange={onOtpChange} disabled={isSending}>
                  <InputOTPGroup className="gap-1.5 sm:gap-2">
                    {[0, 1, 2, 3, 4, 5].map((index) => (
                      <InputOTPSlot
                        key={index}
                        index={index}
                        className={cn(
                          "h-11 w-9 rounded-lg text-base font-semibold sm:h-14 sm:w-12 sm:text-lg",
                          isVerified
                            ? "border-emerald-400 bg-emerald-50/80 text-emerald-900"
                            : "border-slate-200"
                        )}
                      />
                    ))}
                  </InputOTPGroup>
                </InputOTP>
              </div>
              {isVerifying ? (
                <p className="flex items-center justify-center gap-2 text-xs text-slate-500">
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  Checking code...
                </p>
              ) : null}
            </div>

            <div className="text-center">
              {resendCooldown > 0 ? (
                <p className="text-sm text-slate-500">
                  Resend code in{" "}
                  <span className="font-medium text-slate-700">{resendCooldown}s</span>
                </p>
              ) : (
                <button
                  type="button"
                  className="text-sm font-medium text-[#1162A8] transition-colors hover:text-[#0d4f87] hover:underline disabled:cursor-not-allowed disabled:opacity-50"
                  onClick={handleResend}
                  disabled={isSending}
                >
                  {isSending ? "Sending..." : "Didn't receive it? Send again"}
                </button>
              )}
            </div>
          </>
        ) : null}

        {displayError ? (
          <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">{displayError}</p>
        ) : null}
      </div>
    </div>
  )
}
