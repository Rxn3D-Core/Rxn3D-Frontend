"use client"
import Link from "next/link"
import Image from "next/image"
import { ChevronLeft, ChevronRight, Loader2, Clock, X, Eye, EyeOff } from "lucide-react"
import { useState, type FormEvent, useEffect } from "react"
import { useRouter } from "next/navigation"
import { useAuth } from "@/contexts/auth-context"
import { useTranslation } from "react-i18next"
import { SiteCopyrightFooter } from "@/components/site-copyright-footer"
import { useLoginMutation } from "@/hooks/use-login"
import { useSessionHistory } from "@/hooks/use-session-history"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { getLoginEmailFieldState, validateLoginEmail } from "@/lib/auth/login-email-validation"

export default function LoginForm() {
  const router = useRouter()
  const { setAuthFromData } = useAuth()
  const { t } = useTranslation()
  const [identifier, setIdentifier] = useState("")
  const [password, setPassword] = useState("")
  const [identifierTouched, setIdentifierTouched] = useState(false)
  const [identifierFocused, setIdentifierFocused] = useState(false)
  const [submitAttempted, setSubmitAttempted] = useState(false)
  const [currentSlideIndex, setCurrentSlideIndex] = useState(0)
  const [showPassword, setShowPassword] = useState(false)
  const [signedOutForIdle, setSignedOutForIdle] = useState(false)

  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    setSignedOutForIdle(params.get("idle") === "1")
  }, [])

  // TanStack Query hooks
  const loginMutation = useLoginMutation()
  const { sessionHistory, updateSessionHistory, clearSessionHistory } = useSessionHistory()

  useEffect(() => {
    const timer = setInterval(() => {
      nextSlide()
    }, 5000)

    return () => clearInterval(timer)
  }, [])

  const [heroSlides, setHeroSlides] = useState([
    {
      image: { src: "/images/jaw.png", alt: t("impression") },
      title: (
        <>
          {t("Simplifying workflows one")}
          <br />
          {t("case at a time")}
        </>
      ),
      description: t("Digital dentistry is here. More speed, more accuracy, less stress."),
    },
    {
      image: { src: "/images/tooth.png", alt: t("digital tooth") },
      description: (
        <>
          {t("Because crowns shouldn't")}
          <br />
          {t("be complicated")}
        </>
      ),
      title: t("Connect, manage, and streamline with intelligent tools."),
    },
    {
      image: { src: "/images/braces.png", alt: t("digital dental network") },
      title: (
        <>
          {t("One platform for all your")}
          <br />
          {t("case management")}
        </>
      ),
      description: t("From scan to smile, everything is just a click away."),
    },
  ])

  // Field state is derived from the current value so it never goes stale.
  // Green means "email format is valid" only; it says nothing about the account or credentials.
  const identifierField = getLoginEmailFieldState({
    value: identifier,
    touched: identifierTouched,
    submitted: submitAttempted,
    editing: identifierFocused,
  })

  const identifierMessages = {
    error:
      identifierField.issue === "required"
        ? t("Email is required")
        : t("Enter a valid email address, e.g. name@example.com"),
    warning: t("Keep typing, this email address is incomplete"),
  }

  // A failed login overrides live validation until the user edits either field.
  const identifierValidationState = loginMutation.error ? "error" : identifierField.status
  const passwordMissing = submitAttempted && !password

  // Handle form submission
  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    setSubmitAttempted(true)

    // Validate inputs; focus the first invalid field so keyboard/screen-reader users land on it
    if (!validateLoginEmail(identifier).isValid) {
      document.getElementById("identifier")?.focus()
      return
    }
    if (!password) {
      document.getElementById("password")?.focus()
      return
    }

    // Attempt login using TanStack Query mutation; let AuthProvider apply auth data and navigate
    loginMutation.mutate(
      { identifier: identifier.trim(), password },
      {
        onSuccess: (data, variables) => {
          // Apply auth data to app state and navigate (AuthProvider helper)
          if (data) {
            // setAuthFromData will update session history too when identifier provided
            setAuthFromData(data as any, variables?.identifier)
          }
        },
      }
    )
  }

  // Handle quick fill from session history
  const handleQuickFill = (sessionIdentifier: string) => {
    setIdentifier(sessionIdentifier)
    setPassword("") // Clear password field for security
    setSubmitAttempted(false)
    // Focus on password field
    document.getElementById("password")?.focus()
  }

  // Format timestamp to relative time
  const formatRelativeTime = (timestamp: number): string => {
    const now = Date.now()
    const diffInSeconds = Math.floor((now - timestamp) / 1000)

    if (diffInSeconds < 60) return t("Just now")
    if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)}${t("m ago")}`
    if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)}${t("h ago")}`
    return `${Math.floor(diffInSeconds / 86400)}${t("d ago")}`
  }

  // Handle next slide
  const nextSlide = () => {
    setCurrentSlideIndex((prevIndex) => (prevIndex + 1) % heroSlides.length)
  }

  // Handle previous slide
  const prevSlide = () => {
    setCurrentSlideIndex((prevIndex) => (prevIndex - 1 + heroSlides.length) % heroSlides.length)
  }

  return (
    <div className="min-h-screen h-screen flex flex-col overflow-hidden bg-gradient-to-br from-slate-50 to-blue-50">
      {/* Main Content Container - Takes remaining height */}
      <div className="flex min-h-0 flex-1 flex-col overflow-hidden lg:flex-row">
        {/* Left side stays fixed. Only the recent-login list scrolls. */}
        <div className="flex min-h-0 w-full flex-col overflow-hidden lg:h-full lg:w-1/2">
          <div className="flex min-h-0 flex-1 flex-col overflow-hidden px-5 py-6 sm:px-8 sm:py-8 md:px-12 lg:px-10 lg:py-6 xl:px-16">
          <div className="mx-auto my-auto flex min-h-0 w-full max-h-full max-w-[460px] flex-col overflow-hidden">
            <div className="shrink-0">
            {/* Brand + sign-in prompt */}
            <div className="mb-6 sm:mb-8">
              <Link href="/" className="mb-6 inline-block sm:mb-8" aria-label="Rxn3D home">
                <Image
                  src="/images/rxn3d-logo.svg"
                  alt="Rxn3D"
                  width={140}
                  height={45}
                  priority
                  className="h-10 w-auto sm:h-11"
                />
              </Link>
              <h1 className="text-xl font-semibold tracking-tight text-slate-800 sm:text-2xl">
                Sign in to your account to continue
              </h1>
              {signedOutForIdle ? (
                <p className="mt-3 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800">
                  {t(
                    "You were signed out after a period of inactivity. Please sign in again.",
                    "You were signed out after a period of inactivity. Please sign in again.",
                  )}
                </p>
              ) : null}
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Email input with floating label (type="text" so our own validation runs, not the browser's) */}
              <Input
                type="text"
                id="identifier"
                inputMode="email"
                autoComplete="email"
                label={t("Email")}
                value={identifier}
                onChange={(e) => {
                  setIdentifier(e.target.value)
                  // Emptying the field starts over: the next entry is "editing" again, not already-invalid
                  if (!e.target.value.trim()) {
                    setIdentifierTouched(false)
                  }
                  // Clear error when user starts typing
                  if (loginMutation.error) {
                    loginMutation.reset()
                  }
                }}
                onFocus={() => setIdentifierFocused(true)}
                onBlur={() => {
                  setIdentifierFocused(false)
                  // Only a value the user actually entered can be "invalid after blur";
                  // tabbing through an empty field must stay neutral
                  setIdentifierTouched(identifier.trim().length > 0)
                }}
                validationState={identifierValidationState}
                errorMessage={
                  loginMutation.error ? "Invalid Email" : identifierMessages.error
                }
                warningMessage={identifierMessages.warning}
                disabled={loginMutation.isPending}
              />

              {/* Password input with floating label and show/hide toggle */}
              <div className="relative">
                <Input
                  type={showPassword ? "text" : "password"}
                  id="password"
                  label={t("Password")}
                  value={password}
                  onChange={(e) => {
                    setPassword(e.target.value)
                    // Clear error when user starts typing
                    if (loginMutation.error) {
                      loginMutation.reset()
                    }
                  }}
                  // Never "valid": a non-empty password says nothing until the server authenticates it
                  validationState={loginMutation.error || passwordMissing ? "error" : "default"}
                  errorMessage={
                    loginMutation.error ? "Invalid Password" : t("Password is required")
                  }
                  disabled={loginMutation.isPending}
                  showValidIcon={false}
                  className="pr-12"
                />
                <button
                  type="button"
                  className="absolute right-4 top-[17px] text-slate-400 hover:text-slate-600 transition-colors p-1 hover:bg-slate-100 rounded-full flex items-center justify-center z-10"
                  onClick={() => setShowPassword(!showPassword)}
                  tabIndex={-1}
                  aria-label={showPassword ? "Hide password" : "Show password"}
                >
                  {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>

              {/* Links: forgot password + create account */}
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-4 text-sm">
                <Link
                  href="/forgot-password"
                  className="text-blue-600 hover:text-blue-800 font-medium hover:underline transition-colors"
                >
                  {t("login.forgotPassword")}
                </Link>
                <Link
                  href="/register"
                  className="text-blue-600 hover:text-blue-800 font-medium hover:underline transition-colors"
                >
                  {t("login.createAccount")}
                </Link>
              </div>

              {/* Submit button */}
              <Button
                type="submit"
                variant="default"
                size="lg"
                className="w-full"
                disabled={loginMutation.isPending}
              >
                {loginMutation.isPending ? (
                  <>
                    <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                    {t("Logging In...")}
                  </>
                ) : (
                  t("Log In Now")
                )}
              </Button>

              <p className="text-center text-sm text-slate-600">
                {t("login.dontHaveAccount")}{" "}
                <Link href="/register" className="font-semibold text-[#1162A8] hover:underline">
                  {t("login.signUp")}
                </Link>
              </p>
            </form>
            </div>

            {sessionHistory.length > 0 && (
              <div className="mt-5 flex min-h-0 flex-col overflow-hidden">
                <div className="my-3 flex shrink-0 items-center justify-center text-sm text-slate-500">
                  <div className="border-t border-dashed border-slate-300 flex-1"></div>
                  <span className="px-4 bg-gradient-to-br from-slate-50 to-blue-50 font-medium">
                    {t("login.continueWith")}
                  </span>
                  <div className="border-t border-dashed border-slate-300 flex-1"></div>
                </div>

                {/* Enhanced Recent Logins Header */}
                <div className="mb-3 flex shrink-0 items-center justify-between">
                  <div className="flex items-center text-sm text-slate-600 font-medium">
                    <Clock className="w-4 h-4 mr-2 text-blue-500" />
                    <span>Recent logins</span>
                  </div>
                  <button
                    onClick={clearSessionHistory}
                    className="text-xs text-slate-500 hover:text-red-600 flex items-center transition-colors hover:bg-red-50 px-2 py-1 rounded-md"
                    type="button"
                  >
                    <X className="w-3 h-3 mr-1" />
                    Clear
                  </button>
                </div>

                <div className="min-h-0 space-y-2.5 overflow-y-auto overscroll-contain pr-1 [scrollbar-width:thin] [scrollbar-color:#cbd5e1_transparent] [&::-webkit-scrollbar]:w-1.5 [&::-webkit-scrollbar-track]:bg-transparent [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:bg-slate-300">
                  {sessionHistory.map((session, index) => (
                    <button
                      key={index}
                      className="w-full border border-slate-200 rounded-xl py-2.5 px-4 text-left hover:bg-gradient-to-r hover:from-blue-50 hover:to-indigo-50 hover:border-blue-300 transition-colors duration-200 flex items-center justify-between group"
                      onClick={() => handleQuickFill(session.identifier)}
                      disabled={loginMutation.isPending}
                      type="button"
                    >
                      <div className="flex flex-col min-w-0 flex-1">
                        <span className="text-sm font-semibold text-slate-700 group-hover:text-blue-700 truncate transition-colors">
                          {session.displayName || session.identifier}
                        </span>
                        {session.displayName && (
                          <span className="text-xs text-slate-500 group-hover:text-blue-600 truncate transition-colors">
                            {session.identifier}
                          </span>
                        )}
                      </div>
                      <span className="text-xs text-slate-400 group-hover:text-blue-500 ml-2 flex-shrink-0 font-medium transition-colors">
                        {formatRelativeTime(session.timestamp)}
                      </span>
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
          </div>
        </div>

        {/* Enhanced Right Side - Hero Slides (Desktop Only) */}
        <div className="hidden lg:flex w-1/2 h-full bg-gradient-to-br from-slate-800 via-slate-900 to-blue-900 relative overflow-hidden">
          {heroSlides.map((slide, index) => (
            <div
              key={index}
              className={`absolute inset-0 transition-all duration-700 ease-in-out ${
                currentSlideIndex === index ? "opacity-100 z-10 scale-100" : "opacity-0 z-0 scale-105"
              }`}
            >
              <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/20 to-transparent z-10"></div>
              <Image
                src={slide.image.src || "/placeholder.svg"}
                alt={slide.image.alt}
                fill
                className="object-cover transition-transform duration-700"
                priority={index === 0}
                loading={index === 0 ? "eager" : "lazy"}
                quality={85}
                sizes="50vw"
              />
              <div className="absolute bottom-0 left-0 right-0 p-8 lg:p-12 xl:p-16 flex flex-col z-20">
                <div className="mb-16 animate-in slide-in-from-bottom duration-700">
                  <h2
                    className={`drop-shadow-2xl mb-6 transition-all duration-500 ${
                      currentSlideIndex === 1
                        ? "text-white text-left text-lg lg:text-xl xl:text-2xl font-medium leading-relaxed"
                        : "text-blue-100 font-bold text-right text-2xl lg:text-3xl xl:text-4xl 2xl:text-5xl leading-tight"
                    }`}
                  >
                    {slide.title}
                  </h2>
                  <p
                    className={`drop-shadow-xl transition-all duration-500 ${
                      currentSlideIndex === 1
                        ? "text-blue-100 font-bold text-2xl lg:text-3xl xl:text-4xl 2xl:text-5xl text-left leading-tight"
                        : "text-white/90 text-right text-lg lg:text-xl xl:text-2xl leading-relaxed"
                    }`}
                  >
                    {slide.description}
                  </p>
                </div>
              </div>
            </div>
          ))}

          {/* Enhanced Desktop Navigation Controls */}
          <div className="absolute bottom-8 left-0 right-0 z-30 flex justify-center">
            <div className="flex items-center space-x-6 bg-black/20 backdrop-blur-sm rounded-full px-6 py-3">
              <button
                onClick={prevSlide}
                className="w-12 h-12 rounded-full border-2 border-white/40 flex items-center justify-center hover:bg-white/20 hover:border-white/60 transition-all duration-200 text-white shadow-lg hover:shadow-xl transform hover:scale-105"
                aria-label="Previous slide"
              >
                <ChevronLeft className="w-6 h-6" />
              </button>
              <div className="flex space-x-3 items-center">
                {heroSlides.map((_, idx) => (
                  <button
                    key={idx}
                    onClick={() => setCurrentSlideIndex(idx)}
                    className={`w-3 h-3 rounded-full transition-all duration-300 ${
                      currentSlideIndex === idx 
                        ? "bg-white scale-125 shadow-lg" 
                        : "bg-white/50 hover:bg-white/80 hover:scale-110"
                    }`}
                    aria-label={`Go to slide ${idx + 1}`}
                  />
                ))}
              </div>
              <button
                onClick={nextSlide}
                className="w-12 h-12 rounded-full border-2 border-white/40 flex items-center justify-center hover:bg-white/20 hover:border-white/60 transition-all duration-200 text-white shadow-lg hover:shadow-xl transform hover:scale-105"
                aria-label="Next slide"
              >
                <ChevronRight className="w-6 h-6" />
              </button>
            </div>
          </div>
        </div>
      </div>

      <SiteCopyrightFooter />
    </div>
  )
}
