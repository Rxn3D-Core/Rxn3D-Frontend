"use client"

import { useMemo, useState, type FormEvent } from "react"
import Link from "next/link"
import { useParams, useRouter } from "next/navigation"
import { AlertTriangle, ChevronLeft, Eye, EyeOff, Loader2, CheckCircle2, LogIn } from "lucide-react"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { useToast } from "@/hooks/use-toast"
import { useAuth } from "@/contexts/auth-context"
import { useGetUserInvitation, acceptUserInvitation } from "@/hooks/use-user-invitations"

const formatRoleLabel = (role?: string) =>
  role
    ? role
        .split("_")
        .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
        .join(" ")
    : ""

// Convert an image file to a base64 data URI (required for the doctor signature)
const fileToBase64 = (file: File): Promise<string> =>
  new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(reader.result as string)
    reader.onerror = reject
    reader.readAsDataURL(file)
  })

// Centered card wrapper. Defined at module scope so it isn't remounted on every
// render (which would drop focus from the form inputs).
function Shell({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex flex-1 items-center justify-center p-6">
      <div className="w-full max-w-md rounded-xl border border-gray-200 bg-white p-8 shadow-sm">{children}</div>
    </div>
  )
}

function InvitationHeader({ customerName, role, email }: { customerName?: string; role?: string; email?: string }) {
  return (
    <div className="mb-6 text-center">
      <h1 className="text-2xl font-bold text-gray-900">You've been invited</h1>
      <p className="mt-2 text-sm text-gray-600">
        Join <span className="font-semibold">{customerName}</span>
        {role ? (
          <>
            {" "}
            as <span className="font-semibold">{formatRoleLabel(role)}</span>
          </>
        ) : null}
        .
      </p>
      <p className="mt-1 text-xs text-gray-500">{email}</p>
    </div>
  )
}

export default function UserInvitationPage() {
  const params = useParams()
  const router = useRouter()
  const { toast } = useToast()
  const { user, token: authToken, isAuthenticated, logout } = useAuth()

  const token = (Array.isArray(params?.token) ? params?.token[0] : params?.token) || ""
  const invitationPath = `/user-invitations/${token}`

  const { data: invitation, isLoading, isError } = useGetUserInvitation(token)

  const [firstName, setFirstName] = useState("")
  const [lastName, setLastName] = useState("")
  const [phone, setPhone] = useState("")
  const [password, setPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  const [licenseNumber, setLicenseNumber] = useState("")
  const [signature, setSignature] = useState<string | null>(null)
  const [signatureName, setSignatureName] = useState<string>("")
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)

  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [isSuccess, setIsSuccess] = useState(false)
  const [acceptedAsExisting, setAcceptedAsExisting] = useState(false)

  const isExpired = useMemo(() => {
    if (!invitation) return false
    if (invitation.is_expired) return true
    if (invitation.status === "Expired") return true
    if (invitation.expires_at && new Date(invitation.expires_at).getTime() < Date.now()) return true
    return false
  }, [invitation])

  const isProcessed = invitation?.status === "Accepted" || invitation?.status === "Cancelled"
  // requires_login => existing ACTIVE account: must authenticate, then accept with Bearer (token-only body).
  const requiresLogin = !!invitation?.requires_login
  const requiresDoctorDocuments = !!invitation?.requires_doctor_documents

  // A different user is signed in than the one the invitation is addressed to
  const emailMismatch =
    isAuthenticated &&
    !!user?.email &&
    !!invitation?.email &&
    user.email.toLowerCase() !== invitation.email.toLowerCase()

  const handleSignatureUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return
    const allowedTypes = ["image/jpeg", "image/jpg", "image/png", "image/gif", "image/webp"]
    if (!allowedTypes.includes(file.type)) {
      toast({ title: "Invalid file type", description: "Upload a JPG, PNG, GIF, or WEBP image.", variant: "destructive" })
      return
    }
    if (file.size > 5 * 1024 * 1024) {
      toast({ title: "File too large", description: "Signature must be smaller than 5MB.", variant: "destructive" })
      return
    }
    try {
      const base64 = await fileToBase64(file)
      setSignature(base64)
      setSignatureName(file.name)
    } catch {
      toast({ title: "Error", description: "Could not read the signature image.", variant: "destructive" })
    }
  }

  // Existing ACTIVE user accepting a second profile (authenticated, Bearer, token-only body)
  const handleAcceptExisting = async () => {
    setError(null)
    setIsSubmitting(true)
    try {
      await acceptUserInvitation(token, {}, authToken)
      setAcceptedAsExisting(true)
      setIsSuccess(true)
    } catch (err: any) {
      setError(err?.message || "Failed to accept the invitation. Please try again.")
    } finally {
      setIsSubmitting(false)
    }
  }

  // New or Invited user completing registration (no auth)
  const handleRegister = async (e: FormEvent) => {
    e.preventDefault()
    setError(null)

    if (!firstName.trim() || !lastName.trim() || !phone.trim() || !password || !confirmPassword) {
      setError("Please fill in all required fields.")
      return
    }
    if (password.length < 8) {
      setError("Password must be at least 8 characters long.")
      return
    }
    if (password !== confirmPassword) {
      setError("Passwords do not match.")
      return
    }
    if (requiresDoctorDocuments && (!licenseNumber.trim() || !signature)) {
      setError("License number and signature are required for doctors.")
      return
    }

    setIsSubmitting(true)
    try {
      await acceptUserInvitation(token, {
        first_name: firstName.trim(),
        last_name: lastName.trim(),
        phone: phone.trim(),
        password,
        password_confirmation: confirmPassword,
        ...(requiresDoctorDocuments
          ? { license_number: licenseNumber.trim(), signature: signature || undefined }
          : {}),
      })
      setAcceptedAsExisting(false)
      setIsSuccess(true)
    } catch (err: any) {
      setError(err?.message || "Failed to accept the invitation. Please try again.")
    } finally {
      setIsSubmitting(false)
    }
  }

  // ---- Render states (order matches the documented accept-page logic) ----

  if (isLoading) {
    return (
      <Shell>
        <div className="flex flex-col items-center justify-center gap-3 py-8 text-gray-600">
          <Loader2 className="h-8 w-8 animate-spin text-[#1162a8]" />
          <p>Loading your invitation…</p>
        </div>
      </Shell>
    )
  }

  if (isError || !invitation) {
    return (
      <Shell>
        <div className="text-center">
          <AlertTriangle className="mx-auto mb-3 h-10 w-10 text-red-500" />
          <h1 className="mb-2 text-xl font-bold text-gray-900">Invitation not found</h1>
          <p className="mb-6 text-sm text-gray-600">
            This invitation link is invalid or no longer exists. Please ask your administrator to send a new one.
          </p>
          <Link href="/login" className="inline-flex items-center text-[#1162a8] hover:underline">
            <ChevronLeft className="mr-1 h-4 w-4" />
            Back to login
          </Link>
        </div>
      </Shell>
    )
  }

  if (isSuccess) {
    return (
      <Shell>
        <div className="text-center">
          <CheckCircle2 className="mx-auto mb-3 h-10 w-10 text-[#119933]" />
          <h1 className="mb-2 text-xl font-bold text-gray-900">Invitation accepted!</h1>
          <p className="mb-6 text-sm text-gray-600">
            {acceptedAsExisting
              ? `You now have access to ${invitation.customer?.name}.`
              : `Your account is ready. Please log in to access ${invitation.customer?.name}.`}
          </p>
          <Button
            className="w-full bg-[#1162a8] hover:bg-[#0d5999]"
            onClick={() => router.push(acceptedAsExisting ? "/dashboard" : "/login")}
          >
            {acceptedAsExisting ? "Go to dashboard" : "Go to login"}
          </Button>
        </div>
      </Shell>
    )
  }

  if (isExpired) {
    return (
      <Shell>
        <div className="text-center">
          <AlertTriangle className="mx-auto mb-3 h-10 w-10 text-[#ff9500]" />
          <h1 className="mb-2 text-xl font-bold text-gray-900">This invitation has expired</h1>
          <p className="mb-6 text-sm text-gray-600">
            Please ask your administrator at {invitation.customer?.name} to send you a new invitation.
          </p>
          <Link href="/login" className="inline-flex items-center text-[#1162a8] hover:underline">
            <ChevronLeft className="mr-1 h-4 w-4" />
            Back to login
          </Link>
        </div>
      </Shell>
    )
  }

  if (isProcessed || invitation.already_linked) {
    return (
      <Shell>
        <div className="text-center">
          <CheckCircle2 className="mx-auto mb-3 h-10 w-10 text-[#119933]" />
          <h1 className="mb-2 text-xl font-bold text-gray-900">
            {invitation.already_linked ? "You're already a member" : "Invitation already processed"}
          </h1>
          <p className="mb-6 text-sm text-gray-600">
            {invitation.already_linked
              ? `You already have access to ${invitation.customer?.name}. Just log in to continue.`
              : "This invitation has already been used. Please log in to continue."}
          </p>
          <Button className="w-full bg-[#1162a8] hover:bg-[#0d5999]" onClick={() => router.push("/login")}>
            Go to login
          </Button>
        </div>
      </Shell>
    )
  }

  // Existing ACTIVE account → must be authenticated to accept
  if (requiresLogin) {
    // Not signed in → send to login and return here afterwards
    if (!isAuthenticated) {
      return (
        <Shell>
          <InvitationHeader customerName={invitation.customer?.name} role={invitation.role} email={invitation.email} />
          <div className="rounded-md border border-blue-100 bg-blue-50 p-3 text-sm text-blue-800">
            You already have an account with this email. Log in to add this profile.
          </div>
          <Button
            className="mt-4 w-full bg-[#1162a8] hover:bg-[#0d5999]"
            onClick={() => router.push(`/login?redirect=${encodeURIComponent(invitationPath)}`)}
          >
            <LogIn className="mr-2 h-4 w-4" />
            Log in to accept
          </Button>
        </Shell>
      )
    }

    // Signed in as a different account than the invite is addressed to
    if (emailMismatch) {
      return (
        <Shell>
          <InvitationHeader customerName={invitation.customer?.name} role={invitation.role} email={invitation.email} />
          <div className="rounded-md border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800">
            You're signed in as <span className="font-semibold">{user?.email}</span>, but this invitation is for{" "}
            <span className="font-semibold">{invitation.email}</span>. Log out and sign in as that user to accept.
          </div>
          <Button className="mt-4 w-full bg-[#1162a8] hover:bg-[#0d5999]" onClick={() => logout()}>
            Log out & switch account
          </Button>
        </Shell>
      )
    }

    // Signed in as the correct user → confirm accept (Bearer, token-only body)
    return (
      <Shell>
        <InvitationHeader customerName={invitation.customer?.name} role={invitation.role} email={invitation.email} />
        {error && (
          <div className="mb-4 flex items-center rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-700">
            <AlertTriangle className="mr-2 h-5 w-5 flex-shrink-0" />
            <span>{error}</span>
          </div>
        )}
        <p className="text-sm text-gray-600">
          Accept this invitation to add <span className="font-semibold">{invitation.customer?.name}</span> to your
          account. You can switch between profiles after signing in.
        </p>
        <Button
          className="mt-4 w-full bg-[#1162a8] hover:bg-[#0d5999]"
          onClick={handleAcceptExisting}
          disabled={isSubmitting}
        >
          {isSubmitting ? (
            <>
              <Loader2 className="mr-2 h-5 w-5 animate-spin" />
              Accepting…
            </>
          ) : (
            "Accept Invitation"
          )}
        </Button>
        <div className="mt-4 text-center">
          <Link href="/dashboard" className="inline-flex items-center text-sm text-[#1162a8] hover:underline">
            <ChevronLeft className="mr-1 h-4 w-4" />
            Back to dashboard
          </Link>
        </div>
      </Shell>
    )
  }

  // New user OR Invited user (no password yet) → full registration form
  return (
    <Shell>
      <InvitationHeader customerName={invitation.customer?.name} role={invitation.role} email={invitation.email} />

      {error && (
        <div className="mb-4 flex items-center rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-700">
          <AlertTriangle className="mr-2 h-5 w-5 flex-shrink-0" />
          <span>{error}</span>
        </div>
      )}

      <form onSubmit={handleRegister} className="space-y-4">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Input
            label="First Name *"
            placeholder="Enter first name"
            value={firstName}
            onChange={(e) => setFirstName(e.target.value)}
            disabled={isSubmitting}
          />
          <Input
            label="Last Name *"
            placeholder="Enter last name"
            value={lastName}
            onChange={(e) => setLastName(e.target.value)}
            disabled={isSubmitting}
          />
        </div>

        <Input
          label="Phone Number *"
          placeholder="Enter phone number"
          value={phone}
          onChange={(e) => setPhone(e.target.value.replace(/[^0-9+]/g, ""))}
          disabled={isSubmitting}
        />

        <div className="relative">
          <Input
            type={showPassword ? "text" : "password"}
            label="Password *"
            placeholder="Create a password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            disabled={isSubmitting}
            showValidIcon={false}
          />
          <button
            type="button"
            onClick={() => setShowPassword((v) => !v)}
            className="absolute right-3 top-1/2 z-10 -translate-y-1/2 text-gray-500 hover:text-gray-800"
            tabIndex={-1}
            aria-label={showPassword ? "Hide password" : "Show password"}
          >
            {showPassword ? <Eye className="h-5 w-5" /> : <EyeOff className="h-5 w-5" />}
          </button>
        </div>

        <div className="relative">
          <Input
            type={showConfirmPassword ? "text" : "password"}
            label="Confirm Password *"
            placeholder="Re-enter your password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            disabled={isSubmitting}
            showValidIcon={false}
          />
          <button
            type="button"
            onClick={() => setShowConfirmPassword((v) => !v)}
            className="absolute right-3 top-1/2 z-10 -translate-y-1/2 text-gray-500 hover:text-gray-800"
            tabIndex={-1}
            aria-label={showConfirmPassword ? "Hide password" : "Show password"}
          >
            {showConfirmPassword ? <Eye className="h-5 w-5" /> : <EyeOff className="h-5 w-5" />}
          </button>
        </div>

        {requiresDoctorDocuments && (
          <div className="space-y-3 rounded-lg border border-gray-200 p-3">
            <h2 className="text-sm font-semibold text-gray-900">Doctor Information</h2>
            <Input
              label="License Number *"
              placeholder="Enter license number"
              value={licenseNumber}
              onChange={(e) => setLicenseNumber(e.target.value)}
              disabled={isSubmitting}
            />
            <div>
              <label className="mb-1 block text-xs font-medium text-gray-700">Signature *</label>
              <input
                type="file"
                accept="image/jpeg,image/jpg,image/png,image/gif,image/webp"
                onChange={handleSignatureUpload}
                disabled={isSubmitting}
                className="block w-full text-sm text-gray-600 file:mr-3 file:rounded-md file:border-0 file:bg-[#1162a8] file:px-3 file:py-1.5 file:text-white"
              />
              {signatureName && <p className="mt-1 text-xs text-gray-500">{signatureName}</p>}
            </div>
          </div>
        )}

        <Button type="submit" className="w-full bg-[#1162a8] hover:bg-[#0d5999]" disabled={isSubmitting}>
          {isSubmitting ? (
            <>
              <Loader2 className="mr-2 h-5 w-5 animate-spin" />
              Creating account…
            </>
          ) : (
            "Accept & Create Account"
          )}
        </Button>

        <div className="text-center">
          <Link href="/login" className="inline-flex items-center text-sm text-[#1162a8] hover:underline">
            <ChevronLeft className="mr-1 h-4 w-4" />
            Back to login
          </Link>
        </div>
      </form>
    </Shell>
  )
}
