"use client"

import { useCallback, useEffect, useRef, useState } from "react"
import { Turnstile } from "@marsidev/react-turnstile"
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
  const otpSentToEmailRef = useRef<string | null>(null)
  const initialAutoSendAttemptedRef = useRef(false)

  const [turnstileKey, setTurnstileKey] = useState(0)
  const [turnstileToken, setTurnstileToken] = useState<string | null>(null)
  const [codeSent, setCodeSent] = useState(false)
  const [isSending, setIsSending] = useState(false)
  const [isVerifying, setIsVerifying] = useState(false)
  const [isVerified, setIsVerified] = useState(false)
  const [resendCooldown, setResendCooldown] = useState(0)
  const [localError, setLocalError] = useState<string | null>(null)
  const [sendFailed, setSendFailed] = useState(false)
  /** When true, user asked to resend and must complete Turnstile again before sending. */
  const [resendCaptchaRequired, setResendCaptchaRequired] = useState(false)

  const displayError = error ?? localError
  const trimmedEmail = email.trim()
  const normalizedEmail = trimmedEmail.toLowerCase()
  const captchaSatisfied = !isTurnstileEnabled || !!turnstileToken
  const canSend =
    !disabled && !!trimmedEmail && !isSending && captchaSatisfied

  const clearErrors = useCallback(() => {
    setLocalError(null)
    onError?.(null)
  }, [onError])

  const resetVerificationState = useCallback(() => {
    setIsVerified(false)
    onVerifiedChange?.(false)
  }, [onVerifiedChange])

  const remountTurnstile = useCallback(() => {
    setTurnstileToken(null)
    setTurnstileKey((value) => value + 1)
  }, [])

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
      initialAutoSendAttemptedRef.current = false
      setCodeSent(false)
      setSendFailed(false)
      setResendCaptchaRequired(false)
      setResendCooldown(0)
      onOtpChange("")
      resetVerificationState()
      remountTurnstile()
      setLocalError("Email address changed. Request a new verification code.")
      onError?.(null)
    }
  }, [normalizedEmail, onError, onOtpChange, purpose, remountTurnstile, resetVerificationState])

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
        const message = "Please complete the security check, then click send."
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
        setSendFailed(false)
        setResendCaptchaRequired(false)
        onOtpChange("")
        resetVerificationState()
        setResendCooldown(RESEND_COOLDOWN_SECONDS)
        setTurnstileToken(null)
      } catch (err) {
        const message = err instanceof Error ? err.message : "Failed to send verification code."
        setSendFailed(true)
        setLocalError(message)
        onError?.(message)
        if (!isResend) {
          setCodeSent(false)
        }
        // Invalidate the used token but do not auto-reset the widget — that retriggers captcha loops.
        setTurnstileToken(null)
      } finally {
        setIsSending(false)
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

  // Auto-send once on first attempt (after Turnstile, or immediately when Turnstile is off).
  // Never auto-retry after failure — user must click "Try sending code again".
  useEffect(() => {
    if (disabled || !trimmedEmail || codeSent || sendFailed || isSending) return
    if (initialAutoSendAttemptedRef.current) return
    if (otpSentToEmailRef.current === normalizedEmail) return
    if (isTurnstileEnabled && !turnstileToken) return

    initialAutoSendAttemptedRef.current = true
    void handleSendOtp(false)
  }, [
    codeSent,
    disabled,
    handleSendOtp,
    isSending,
    isTurnstileEnabled,
    normalizedEmail,
    sendFailed,
    trimmedEmail,
    turnstileToken,
  ])

  useEffect(() => {
    if (!codeSent || otp.length !== 6) {
      if (isVerified) {
        resetVerificationState()
      }
      return
    }

    let cancelled = false
    setIsVerifying(true)
    clearErrors()

    const timer = window.setTimeout(async () => {
      try {
        await checkRegistrationOtp({
          email: trimmedEmail,
          purpose,
          otp,
        })

        if (cancelled) return

        setIsVerified(true)
        onVerifiedChange?.(true)
        clearErrors()
      } catch (err) {
        if (cancelled) return

        const message = err instanceof Error ? err.message : "Invalid verification code."
        setIsVerified(false)
        onVerifiedChange?.(false)
        setLocalError(message)
        onError?.(message)
      } finally {
        if (!cancelled) {
          setIsVerifying(false)
        }
      }
    }, 400)

    return () => {
      cancelled = true
      window.clearTimeout(timer)
    }
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

  const handlePrepareRetry = () => {
    clearErrors()
    remountTurnstile()
  }

  const handleRequestResend = () => {
    if (resendCooldown > 0 || isSending) return

    if (isTurnstileEnabled) {
      setResendCaptchaRequired(true)
      remountTurnstile()
      clearErrors()
      return
    }

    void handleSendOtp(true)
  }

  const showInitialTurnstile = isTurnstileEnabled && !codeSent && !sendFailed
  const showResendTurnstile = isTurnstileEnabled && codeSent && resendCaptchaRequired
  const showRetryControls = sendFailed && !codeSent

  return (
    <div
      className={cn(
        "overflow-hidden rounded-xl border transition-colors",
        isVerified
          ? "border-emerald-400/80 bg-gradient-to-br from-emerald-50 to-emerald-100/60"
          : codeSent
            ? "border-emerald-200/80 bg-gradient-to-br from-emerald-50/80 to-blue-50/50"
            : sendFailed
              ? "border-red-200/80 bg-gradient-to-br from-red-50/50 to-slate-50/80"
              : "border-[#1162A8]/15 bg-gradient-to-br from-[#1162A8]/5 to-slate-50/80"
      )}
    >
      <div className="flex items-start gap-3 border-b border-inherit px-4 py-4 sm:px-5">
        <div
          className={cn(
            "flex h-10 w-10 shrink-0 items-center justify-center rounded-full",
            isVerified
              ? "bg-emerald-200 text-emerald-800"
              : codeSent
                ? "bg-emerald-100 text-emerald-700"
                : sendFailed
                  ? "bg-red-100 text-red-700"
                  : "bg-[#1162A8]/10 text-[#1162A8]"
          )}
        >
          {isSending ? (
            <Loader2 className="h-5 w-5 animate-spin" />
          ) : isVerified ? (
            <CheckCircle2 className="h-5 w-5" />
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
                : codeSent
                  ? "Check your inbox"
                  : sendFailed
                    ? "Email could not be sent"
                    : isTurnstileEnabled
                      ? "Complete security check"
                      : "Sending verification code..."}
          </h3>
          <p className="text-xs leading-relaxed text-slate-600 sm:text-sm">
            {isVerified ? (
              <>Your email is verified. You can create your account now.</>
            ) : codeSent ? (
              <>We sent a 6-digit code to this address. Enter it below, then submit the form.</>
            ) : sendFailed ? (
              <>
                We couldn&apos;t deliver the email. Complete the security check again and click
                &quot;Try sending code again&quot;.
              </>
            ) : isSending ? (
              <>We&apos;re sending a one-time code to this address...</>
            ) : isTurnstileEnabled ? (
              <>Complete the security check and we&apos;ll email you a one-time code automatically.</>
            ) : (
              <>We&apos;re sending a one-time code to confirm you own this email...</>
            )}
          </p>
        </div>
      </div>

      <div className="space-y-4 px-4 py-4 sm:px-5 sm:py-5">
        {showInitialTurnstile ? (
          <TurnstilePanel
            turnstileKey={turnstileKey}
            onSuccess={setTurnstileToken}
            onExpire={() => setTurnstileToken(null)}
            onError={() => setTurnstileToken(null)}
          />
        ) : null}

        {showRetryControls ? (
          <div className="space-y-2">
            {sendFailed && isTurnstileEnabled ? (
              <TurnstilePanel
                turnstileKey={turnstileKey}
                onSuccess={setTurnstileToken}
                onExpire={() => setTurnstileToken(null)}
                onError={() => setTurnstileToken(null)}
              />
            ) : null}
            {sendFailed ? (
              <button
                type="button"
                className="w-full rounded-lg border border-[#1162A8]/30 bg-white px-4 py-2.5 text-sm font-medium text-[#1162A8] transition-colors hover:bg-[#1162A8]/5"
                onClick={handlePrepareRetry}
                disabled={isSending}
              >
                Reset security check
              </button>
            ) : null}
            <button
              type="button"
              className="w-full rounded-lg bg-[#1162A8] px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-[#0d4f87] disabled:cursor-not-allowed disabled:opacity-50"
              onClick={() => void handleSendOtp(false)}
              disabled={!canSend}
            >
              Try sending code again
            </button>
          </div>
        ) : null}

        {codeSent ? (
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

            {showResendTurnstile ? (
              <div className="space-y-3 rounded-lg border border-[#1162A8]/15 bg-white/70 p-3">
                <p className="text-center text-xs text-slate-600">
                  Complete the security check to send a new code.
                </p>
                <TurnstilePanel
                  turnstileKey={turnstileKey}
                  onSuccess={setTurnstileToken}
                  onExpire={() => setTurnstileToken(null)}
                  onError={() => setTurnstileToken(null)}
                />
                <button
                  type="button"
                  className="w-full rounded-lg bg-[#1162A8] px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-[#0d4f87] disabled:cursor-not-allowed disabled:opacity-50"
                  onClick={() => void handleSendOtp(true)}
                  disabled={!canSend}
                >
                  Send new code
                </button>
              </div>
            ) : (
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
                    onClick={handleRequestResend}
                    disabled={isSending}
                  >
                    Didn&apos;t receive it? Send again
                  </button>
                )}
              </div>
            )}
          </>
        ) : null}

        {displayError ? (
          <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">{displayError}</p>
        ) : null}
      </div>
    </div>
  )
}

function TurnstilePanel({
  turnstileKey,
  onSuccess,
  onExpire,
  onError,
}: {
  turnstileKey: number
  onSuccess: (token: string) => void
  onExpire: () => void
  onError: () => void
}) {
  return (
    <div className="flex flex-col items-center gap-2 rounded-lg bg-white/70 p-3">
      <div className="flex items-center gap-2 text-xs text-slate-500">
        <ShieldCheck className="h-3.5 w-3.5" />
        Security verification
      </div>
      <Turnstile
        key={turnstileKey}
        siteKey={turnstileSiteKey}
        options={{ theme: "light", size: "flexible" }}
        onSuccess={onSuccess}
        onExpire={onExpire}
        onError={onError}
      />
    </div>
  )
}
