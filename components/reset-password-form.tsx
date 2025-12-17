"use client"
import Link from "next/link"
import { AlertTriangle, ChevronLeft, ChevronRight, Eye, EyeOff, Loader2 } from "lucide-react"
import { useState, type FormEvent, useEffect } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { useAuth } from "@/contexts/auth-context"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"

export default function ResetPasswordForm() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { resetPasswordConfirm } = useAuth()

  const [newPassword, setNewPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  const [passwordError, setPasswordError] = useState("")
  const [confirmPasswordError, setConfirmPasswordError] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [isSuccess, setIsSuccess] = useState(false)
  const [currentSlideIndex, setCurrentSlideIndex] = useState(0)

  const [showNewPassword, setShowNewPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)

  const token = searchParams.get("token") || ""
  const email = (searchParams.get("email") || "").replace(" ", "+")
  useEffect(() => {
    const timer = setInterval(() => {
      nextSlide()
    }, 5000)

    return () => clearInterval(timer)
  }, [])

  const heroSlides = [
    {
      image: { src: "/images/jaw.png", alt: "impression" },
      title: (
        <>
          Simplifying workflows one
          <br />
          case at a time
        </>
      ),
      description: "Digital dentistry is here. More speed, more accuracy, less stress.",
    },
    {
      image: { src: "/images/tooth.png", alt: "digital tooth" },
      description: (
        <>
          Because crowns shouldn't
          <br />
          be complicated
        </>
      ),
      title: "Connect, manage, and streamline with intelligent tools.",
    },
    {
      image: { src: "/images/braces.png", alt: "digital dental network" },
      title: (
        <>
          One platform for all your
          <br />
          case management
        </>
      ),
      description: "From scan to smile, everything is just a click away.",
    },
  ]

  const validatePassword = (password: string): string | null => {
    if (password.length < 8) {
      return "Password must be at least 8 characters long."
    }
    if (!/[A-Z]/.test(password)) {
      return "Password must contain at least one uppercase letter."
    }
    if (!/[a-z]/.test(password)) {
      return "Password must contain at least one lowercase letter."
    }
    if (!/[0-9]/.test(password)) {
      return "Password must contain at least one number."
    }
    if (!/[!@#$%^&*(),.?\":{}|<>]/.test(password)) {
      return "Password must contain at least one special character."
    }
    return null
  }

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    setPasswordError("")
    setConfirmPasswordError("")
    setError(null)
  
    let isValid = true
  
    if (!newPassword) {
      setPasswordError("Password field is required")
      isValid = false
    } else {
      const passwordValidationError = validatePassword(newPassword)
      if (passwordValidationError) {
        setPasswordError(passwordValidationError)
        isValid = false
      }
    }
  
    if (!confirmPassword) {
      setConfirmPasswordError("Confirm password field is required")
      isValid = false
    } else if (newPassword !== confirmPassword) {
      setConfirmPasswordError("Passwords do not match")
      isValid = false
    }
  
    if (!isValid) return
  
    setIsLoading(true)
    try {
      const success = await resetPasswordConfirm(token, newPassword, confirmPassword, email)
      if (success) {
        setIsSuccess(true)
      }
    } catch (err: any) {
      setError(err.message || "An unexpected error occurred. Please try again.")
      console.error(err)
    } finally {
      setIsLoading(false)
    }
  }
  

  const nextSlide = () => setCurrentSlideIndex((prev) => (prev + 1) % heroSlides.length)
  const prevSlide = () => setCurrentSlideIndex((prev) => (prev - 1 + heroSlides.length) % heroSlides.length)

  return (
    <div className="min-h-screen flex flex-col">
      <div className="flex flex-1 flex-col md:flex-row">
        <div className="w-full md:w-1/2 p-8 md:p-16 lg:p-20 flex flex-col justify-center">
          {isSuccess ? (
            <div className="text-center space-y-4">
              <h1 className="text-3xl font-bold text-[#000000] mb-2">Password Changed!</h1>
              <div className="pt-4">
                <Link href="/login" className="text-[#1162a8] hover:underline flex items-center justify-center">
                  <ChevronLeft className="w-4 h-4 mr-1" />
                  Back to login
                </Link>
              </div>
            </div>
          ) : (
            <div className="max-w-md mx-auto w-full">
              <h1 className="text-3xl font-bold text-[#000000] mb-2">Create new password</h1>
              {error && (
                <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-700 rounded-md">
                  <div className="flex items-center">
                    <AlertTriangle className="w-5 h-5 mr-2" />
                    <span>{error}</span>
                  </div>
                </div>
              )}

              <form onSubmit={handleSubmit} className="space-y-6">
                {/* New Password Field */}
                <div className="relative">
                  <Input
                    type={showNewPassword ? "text" : "password"}
                    id="password"
                    label="Password"
                    value={newPassword}
                    onChange={(e) => {
                      setNewPassword(e.target.value)
                      if (passwordError) {
                        setPasswordError("")
                      }
                    }}
                    placeholder="Enter New Password"
                    validationState={passwordError ? "error" : newPassword ? "valid" : "default"}
                    errorMessage={passwordError}
                    disabled={isLoading}
                    showValidIcon={false}
                    className="pr-12"
                  />
                  <button
                    type="button"
                    onClick={() => setShowNewPassword(!showNewPassword)}
                    className="absolute right-4 top-[14px] text-slate-400 hover:text-slate-600 transition-colors p-1 hover:bg-slate-100 rounded-full flex items-center justify-center z-10"
                    tabIndex={-1}
                    aria-label={showNewPassword ? "Hide password" : "Show password"}
                  >
                    {showNewPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                  </button>
                </div>

                {/* Confirm Password Field */}
                <div className="relative">
                  <Input
                    type={showConfirmPassword ? "text" : "password"}
                    id="confirm-password"
                    label="Confirm Password"
                    value={confirmPassword}
                    onChange={(e) => {
                      setConfirmPassword(e.target.value)
                      if (confirmPasswordError) {
                        setConfirmPasswordError("")
                      }
                    }}
                    placeholder="Confirm New Password"
                    validationState={confirmPasswordError ? "error" : confirmPassword ? "valid" : "default"}
                    errorMessage={confirmPasswordError}
                    disabled={isLoading}
                    showValidIcon={false}
                    className="pr-12"
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    className="absolute right-4 top-[14px] text-slate-400 hover:text-slate-600 transition-colors p-1 hover:bg-slate-100 rounded-full flex items-center justify-center z-10"
                    tabIndex={-1}
                    aria-label={showConfirmPassword ? "Hide password" : "Show password"}
                  >
                    {showConfirmPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                  </button>
                </div>

                <Button
                  type="submit"
                  variant="default"
                  size="lg"
                  className="w-full"
                  disabled={isLoading}
                >
                  {isLoading ? (
                    <>
                      <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                      Updating Password...
                    </>
                  ) : (
                    "Reset Password"
                  )}
                </Button>
              </form>
            </div>
          )}
        </div>

        {/* Right Side - Hero Slides */}
        <div className="w-full md:w-1/2 relative overflow-hidden bg-[#192535]">
          {heroSlides.map((slide, index) => (
            <div
              key={index}
              className={`absolute inset-0 transition-opacity duration-500 ease-in-out ${
                currentSlideIndex === index ? "opacity-100 z-10" : "opacity-0 z-0"
              }`}
            >
              <img
                src={slide.image.src || "/placeholder.svg"}
                alt={slide.image.alt}
                className="absolute inset-0 h-full w-full object-cover dark:brightness-[0.2] dark:grayscale"
              />
              <div className="absolute bottom-0 left-0 right-0 p-8 md:p-16 flex flex-col">
                <div className="mb-16">
                  <h2
                    className={`drop-shadow-lg mb-4 ${currentSlideIndex === 1 ? "text-white text-left text-lg" : "text-[#E1FFFF] font-bold text-right text-3xl md:text-4xl"}`}
                  >
                    {slide.title}
                  </h2>
                  <p
                    className={`drop-shadow-md ${currentSlideIndex === 1 ? "text-[#E1FFFF] font-bold md:text-4xl text-left text-xl" : "text-white/90 text-right text-lg md:text-xl"}`}
                  >
                    {slide.description}
                  </p>
                </div>
              </div>
            </div>
          ))}

          {/* Navigation Controls */}
          <div className="absolute bottom-8 left-0 right-0 z-20 flex justify-center">
            <div className="flex items-center space-x-4">
              <button
                onClick={prevSlide}
                className="w-10 h-10 rounded-full border border-white/30 flex items-center justify-center hover:bg-white/10 transition-colors text-white"
                aria-label="Previous slide"
              >
                <ChevronLeft className="w-5 h-5" />
              </button>
              <div className="flex space-x-2 items-center">
                {heroSlides.map((_, idx) => (
                  <button
                    key={idx}
                    onClick={() => setCurrentSlideIndex(idx)}
                    className={`w-2 h-2 rounded-full transition-all mx-1 ${currentSlideIndex === idx ? "bg-white" : "bg-white/50 hover:bg-white/70"}`}
                    aria-label={`Go to slide ${idx + 1}`}
                  />
                ))}
              </div>
              <button
                onClick={nextSlide}
                className="w-10 h-10 rounded-full border border-white/30 flex items-center justify-center hover:bg-white/10 transition-colors text-white"
                aria-label="Next slide"
              >
                <ChevronRight className="w-5 h-5" />
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
