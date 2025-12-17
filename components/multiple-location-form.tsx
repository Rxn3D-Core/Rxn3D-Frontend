"use client"
import { Search, ChevronLeft, ChevronRight } from "lucide-react"
import { useState, useEffect, useCallback, useRef } from "react"
import { useRouter } from "next/navigation"
import { useAuth } from "@/contexts/auth-context"
import { useToast } from "@/hooks/use-toast"
import { useOnboardingStatus } from "@/hooks/use-onboarding-status"

type Location = {
  id: number
  name: string
  address?: string
  city?: string
  state?: string
}

// Move heroSlides outside component to prevent recreation on every render
const heroSlides = [
  {
    image: { src: "/images/tooth.png", alt: "digital tooth" },
    title: "Because crowns shouldn't be complicated",
    description: "Focus on great results, not back-and-forth",
  },
  {
    image: { src: "/images/jaw.png", alt: "impression" },
    title: "Simplifying workflows one case at a time",
    description: "Digital dentistry is here. More speed, more accuracy, less stress.",
  },
  {
    image: { src: "/images/braces.png", alt: "digital dental network" },
    title: "One platform for all your case management",
    description: "From scan to smile, everything is just a click away.",
  },
]

export default function MultipleLocation() {
  // Add ref to prevent duplicate initialization (React StrictMode causes double renders in dev)
  const hasInitializedRef = useRef(false)
  
  // Add at the beginning of the component function
  const { user, token, isLoading: authLoading, setCustomerId } = useAuth()
  const { isOnboardingComplete, isLoading: onboardingLoading } = useOnboardingStatus()
  const router = useRouter()
  const { toast } = useToast()

  const [locations, setLocations] = useState<Location[]>([])
  const [filteredLocations, setFilteredLocations] = useState<Location[]>([])
  const [searchQuery, setSearchQuery] = useState("")
  const [isLoading, setIsLoading] = useState(true)
  const [currentSlideIndex, setCurrentSlideIndex] = useState(0)
  const [selectedLocationId, setSelectedLocationId] = useState<number | null>(null)
  const [fetchError, setFetchError] = useState<string | null>(null)

  // Memoize slide navigation functions
  const nextSlide = useCallback(() => {
    setCurrentSlideIndex((prev) => (prev + 1) % heroSlides.length)
  }, [])

  const prevSlide = useCallback(() => {
    setCurrentSlideIndex((prev) => (prev - 1 + heroSlides.length) % heroSlides.length)
  }, [])

  // Memoize checkOnboardingAndRedirect to prevent recreation on every render
  const checkOnboardingAndRedirect = useCallback(() => {
    if (!user) return

    // Get primary customer to check onboarding status
    let primaryCustomer = null
    if (user.customers && Array.isArray(user.customers) && user.customers.length > 0) {
      primaryCustomer = user.customers.find((c: any) => {
        return c?.is_primary === true || c?.is_primary === 1 || c?.is_primary === "1"
      }) || user.customers[0]
    } else if (user.customer) {
      primaryCustomer = user.customer
    }

    // Check onboarding status
    const onboardingCompleted = primaryCustomer?.onboarding_completed === true
    const businessHoursCompleted = primaryCustomer?.business_hours_setup_completed === true
    const isOnboardingCompleteFromData = onboardingCompleted && businessHoursCompleted

    // Only redirect to dashboard if onboarding is complete
    if (isOnboardingCompleteFromData || isOnboardingComplete) {
      router.replace("/dashboard")
    } else {
      // Redirect to onboarding if not complete
      router.replace("/onboarding/business-hours")
    }
  }, [user, isOnboardingComplete, router])

  useEffect(() => {
    if (!user && !authLoading) {
      router.replace("/login")
    }
  }, [user, router, authLoading])

  useEffect(() => {
    const timer = setInterval(() => {
      nextSlide()
    }, 5000)

    return () => clearInterval(timer)
  }, [nextSlide])

  useEffect(() => {
    // Prevent duplicate initialization in React StrictMode
    if (hasInitializedRef.current) {
      return
    }
    
    if (user?.customers && user.customers.length > 1) {
      hasInitializedRef.current = true
      const customerLocations = user.customers.map(customer => ({
        id: customer.id,
        name: customer.name,
        type: customer.type,
        role: customer.role
      }))
      setLocations(customerLocations)
      setFilteredLocations(customerLocations)
      setIsLoading(false)
    } else if (user?.customers && user.customers.length === 0) {
      setIsLoading(false)
      setFetchError("No locations found. Please contact support.")
    }
  }, [user])

  useEffect(() => {
    if (searchQuery) {
      const filtered = locations.filter((location) => 
        location.name.toLowerCase().includes(searchQuery.toLowerCase())
      )
      setFilteredLocations(filtered)
    } else {
      setFilteredLocations(locations)
    }
  }, [searchQuery, locations])

  const handleLocationSelect = useCallback(async (locationId: number) => {
    setSelectedLocationId(locationId)

    // Find the selected location
    const selectedLocation = locations.find((loc) => loc.id === locationId)

    if (selectedLocation) {
      try {
        // Call API to set customer ID
        await setCustomerId(selectedLocation.id)

        // Save to localStorage
        localStorage.setItem("selectedLocation", JSON.stringify(selectedLocation))

        toast({
          title: "Location Selected",
          description: `You've selected ${selectedLocation.name}`,
        })

        // Check onboarding status before redirecting
        setTimeout(() => {
          checkOnboardingAndRedirect()
        }, 500)
      } catch (error) {
        console.error("Failed to set customer ID:", error)
        toast({
          title: "Error",
          description: "Failed to select location. Please try again.",
          variant: "destructive",
        })
        setSelectedLocationId(null) // Reset selection on error
      }
    }
  }, [locations, setCustomerId, toast, checkOnboardingAndRedirect])

  // Safety check: Only render if there are multiple locations
  // (This should already be handled at the page level, but adding as a safeguard)
  if (!isLoading && locations.length <= 1) {
    return null
  }

  return (
    <div className="min-h-screen flex flex-col">
      <div className="flex flex-1 flex-col md:flex-row">
        {/* Left Side - Location Selection */}
        <div className="w-full md:w-1/2 p-8 md:p-16 flex flex-col">
          <div className="max-w-md mx-auto w-full">
            <h1 className="text-3xl font-bold text-[#000000] mb-2">Welcome, {user?.first_name || "User"}</h1>
            <h2 className="text-xl font-bold text-[#000000] mb-6">Choose Location</h2>

            {/* Search Box */}
            <div className="relative mb-6">
              <input
                type="text"
                placeholder="Search Location"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full px-4 py-3 pl-10 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
            </div>

            {/* Error Message */}
            {fetchError && (
              <div className="mb-4 p-3 bg-yellow-50 border border-yellow-200 text-yellow-800 rounded-md">
                <span>{fetchError}</span>
              </div>
            )}

            {/* Location List */}
            <div className="space-y-3">
              {isLoading ? (
                <div className="flex justify-center py-8">
                  <div className="flex min-h-screen items-center justify-center">
                    <div className="flex flex-col items-center space-y-4">
                      <div className="flex space-x-2">
                        <div className="w-3 h-3 bg-[#1162A8] rounded-full animate-bounce [animation-delay:-0.3s]"></div>
                        <div className="w-3 h-3 bg-[#1162A8] rounded-full animate-bounce [animation-delay:-0.15s]"></div>
                        <div className="w-3 h-3 bg-[#1162A8] rounded-full animate-bounce"></div>
                      </div>
                    </div>
                  </div>
                </div>
              ) : filteredLocations.length > 0 ? (
                filteredLocations.map((location) => (
                  <button
                    key={location.id}
                    onClick={() => handleLocationSelect(location.id)}
                    className={`w-full text-left px-4 py-3 border ${
                      selectedLocationId === location.id
                        ? "border-blue-500 bg-blue-50"
                        : "border-gray-300 hover:border-blue-300 hover:bg-blue-50"
                    } rounded-md transition-colors`}
                  >
                    {location.name}
                  </button>
                ))
              ) : (
                <div className="text-center py-4 text-gray-500">No locations found. Please try a different search.</div>
              )}
            </div>
          </div>
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
                src={slide.image.src || "/placeholder.svg?height=600&width=600&query=digital dental illustration"}
                alt={slide.image.alt}
                className="absolute inset-0 h-full w-full object-cover"
              />
              <div className="absolute bottom-0 left-0 right-0 p-8 md:p-16 flex flex-col">
                <div className="mb-16">
                  <h2 className="text-[#E1FFFF] font-bold text-2xl md:text-3xl mb-2">{slide.title}</h2>
                  <p className="text-white/90 text-lg">{slide.description}</p>
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
