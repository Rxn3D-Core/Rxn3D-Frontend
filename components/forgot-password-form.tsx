"use client"
import Link from "next/link"
import { ChevronLeft, ChevronRight, Loader2 } from "lucide-react"
import { useState, type FormEvent, useEffect } from "react"
import { useAuth } from "@/contexts/auth-context"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"

export default function ForgotPasswordForm() {
  const [email, setEmail] = useState("")
  const [emailError, setEmailError] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const [isSuccess, setIsSuccess] = useState(false)
  const [currentSlideIndex, setCurrentSlideIndex] = useState(0)
  const { forgotPassword } = useAuth()

  useEffect(() => {
    const timer = setInterval(() => {
      nextSlide()
    }, 5000)

    return () => clearInterval(timer)
  }, [])

  const validateEmail = (email: string) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    return emailRegex.test(email)
  }

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

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()

    setEmailError("")
    let isValid = true

    if (!email) {
      setEmailError("Email is required")
      isValid = false
    } else if (!validateEmail(email)) {
      setEmailError("Please enter a valid email")
      isValid = false
    }

    if (!isValid) return

    setIsLoading(true)

    try {
      const success = await forgotPassword(email)

      if (success) {
        setIsSuccess(true)
      } else {
        setEmailError("Email not found")
      }
    } catch (error: any) {
      setEmailError("An error occurred. Please try again.")
    } finally {
      setIsLoading(false)
    }
  }

  const handleQuickFill = (email: string) => {
    setEmail(email)
    setEmailError("")
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
    <div className="min-h-screen flex flex-col">
      {/* Main Content */}
      <div className="flex flex-1 flex-col md:flex-row">
        {/* Left Side - Forgot Password Form */}
        <div className="w-full md:w-1/2 p-8 md:p-16 lg:p-20 flex flex-col justify-center">
          <div className="max-w-md mx-auto w-full">
            {isSuccess ? (
              <div className="text-center space-y-4">
                <h1 className="text-3xl font-bold text-[#000000] mb-2">Check your email</h1>
                <p className="text-[#545f71] mb-4">
                  We've sent a password reset link to <span className="font-medium">{email}</span>
                </p>
                <p className="text-sm text-[#707070]">If you don't see it, please check your spam folder.</p>
                <div className="pt-4">
                  <Link href="/login" className="text-[#1162a8] hover:underline flex items-center justify-center">
                    <ChevronLeft className="w-4 h-4 mr-1" />
                    Back to login
                  </Link>
                </div>
              </div>
            ) : (
              <>
                <h1 className="text-3xl font-bold text-[#000000] mb-2">Forgot password</h1>
                <p className="text-[#545f71] mb-8">Enter your username or email address</p>

                <form onSubmit={handleSubmit} className="space-y-6">
                  <Input
                    type="email"
                    id="email"
                    label="Username / Email address"
                    value={email}
                    onChange={(e) => {
                      setEmail(e.target.value)
                      if (emailError) {
                        setEmailError("")
                      }
                    }}
                    placeholder="Enter Registered Email"
                    validationState={emailError ? "error" : email ? "valid" : "default"}
                    errorMessage={emailError}
                    disabled={isLoading}
                  />

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
                        Sending...
                      </>
                    ) : (
                      "Reset Password"
                    )}
                  </Button>
                </form>

                <div className="mt-4">
                  <Link href="/login" className="text-[#1162a8] text-sm hover:underline">
                    Back to login
                  </Link>
                </div>
              </>
            )}
          </div>
        </div>

        {/* Right Side - Hero Image */}
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
