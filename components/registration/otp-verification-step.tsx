"use client"

import { useCallback, useRef, useState } from "react"
import { Turnstile, type TurnstileInstance } from "@marsidev/react-turnstile"
import { Loader2 } from "lucide-react"
import { InputOTP, InputOTPGroup, InputOTPSlot } from "@/components/ui/input-otp"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { isTurnstileEnabled, turnstileSiteKey } from "@/lib/config/registration"
import { sendRegistrationOtp, verifyRegistrationOtp } from "@/lib/registration-api"
import type { RegistrationPurpose } from "@/lib/config/registration"

interface OtpVerificationStepProps {
  purpose: RegistrationPurpose
  emailLabel?: string
  onVerified: (result: { email: string; registrationToken: string }) => void
}

export function OtpVerificationStep({
  purpose,
  emailLabel = "Email address",
  onVerified,
}: OtpVerificationStepProps) {
  const turnstileRef = useRef<TurnstileInstance>(null)
  const [email, setEmail] = useState("")
  const [otp, setOtp] = useState("")
  const [turnstileToken, setTurnstileToken] = useState<string | null>(null)
  const [codeSent, setCodeSent] = useState(false)
  const [isSending, setIsSending] = useState(false)
  const [isVerifying, setIsVerifying] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleSendOtp = useCallback(async () => {
    setError(null)

    if (!email.trim()) {
      setError("Please enter your email address.")
      return
    }

    if (isTurnstileEnabled && !turnstileToken) {
      setError("Please complete the security check.")
      return
    }

    setIsSending(true)
    try {
      await sendRegistrationOtp({
        email: email.trim(),
        purpose,
        turnstileToken: turnstileToken ?? undefined,
      })
      setCodeSent(true)
      turnstileRef.current?.reset()
      setTurnstileToken(null)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to send verification code.")
      turnstileRef.current?.reset()
      setTurnstileToken(null)
    } finally {
      setIsSending(false)
    }
  }, [email, purpose, turnstileToken])

  const handleVerifyOtp = useCallback(async () => {
    setError(null)

    if (otp.length !== 6) {
      setError("Please enter the 6-digit verification code.")
      return
    }

    setIsVerifying(true)
    try {
      const result = await verifyRegistrationOtp({
        email: email.trim(),
        purpose,
        otp,
      })
      onVerified({
        email: result.email,
        registrationToken: result.registration_token,
      })
    } catch (err) {
      setError(err instanceof Error ? err.message : "Verification failed.")
    } finally {
      setIsVerifying(false)
    }
  }, [email, onVerified, otp, purpose])

  return (
    <div className="mx-auto w-full max-w-md space-y-6">
      <div className="space-y-2 text-center">
        <h2 className="text-2xl font-semibold text-gray-900">Verify your email</h2>
        <p className="text-sm text-gray-600">
          We will send a 6-digit code to confirm your email before you continue.
        </p>
      </div>

      <div className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="registration-email">{emailLabel}</Label>
          <Input
            id="registration-email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@example.com"
            disabled={codeSent}
          />
        </div>

        {!codeSent ? (
          <>
            {isTurnstileEnabled ? (
              <div className="flex justify-center">
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
            <Button
              type="button"
              className="w-full bg-[#1162A8] hover:bg-[#0d4f87]"
              onClick={handleSendOtp}
              disabled={isSending}
            >
              {isSending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Sending code...
                </>
              ) : (
                "Send verification code"
              )}
            </Button>
          </>
        ) : (
          <>
            <div className="space-y-2">
              <Label>Verification code</Label>
              <div className="flex justify-center">
                <InputOTP maxLength={6} value={otp} onChange={setOtp}>
                  <InputOTPGroup>
                    <InputOTPSlot index={0} />
                    <InputOTPSlot index={1} />
                    <InputOTPSlot index={2} />
                    <InputOTPSlot index={3} />
                    <InputOTPSlot index={4} />
                    <InputOTPSlot index={5} />
                  </InputOTPGroup>
                </InputOTP>
              </div>
            </div>
            <Button
              type="button"
              className="w-full bg-[#1162A8] hover:bg-[#0d4f87]"
              onClick={handleVerifyOtp}
              disabled={isVerifying}
            >
              {isVerifying ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Verifying...
                </>
              ) : (
                "Verify and continue"
              )}
            </Button>
            <button
              type="button"
              className="w-full text-sm text-[#1162A8] hover:underline"
              onClick={() => {
                setCodeSent(false)
                setOtp("")
                setError(null)
              }}
            >
              Use a different email
            </button>
          </>
        )}

        {error ? <p className="text-sm text-red-500">{error}</p> : null}
      </div>
    </div>
  )
}
