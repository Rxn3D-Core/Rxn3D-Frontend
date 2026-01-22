"use client"

import { useState, useEffect, useMemo, useRef } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { Button } from "@/components/ui/button"
import { useToast } from "@/hooks/use-toast"
import { useClearCaseDesignCenterStateMutation } from "@/hooks/use-case-design-center-state"
import { SlipCreationHeader } from "@/components/slip-creation-header"
import { clearSlipCreationStorage } from "@/utils/slip-creation-storage"
import { SlipCreationFooter } from "@/components/slip-creation-footer"
import { Dialog, DialogContent, DialogOverlay, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog"

interface Doctor {
  id: number
  first_name: string
  last_name: string
  email: string
  image?: string
}

interface Lab {
  id: number
  name: string
  customer_id?: number
  logo?: string
}

export default function PatientInputPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { toast } = useToast()
  const clearCaseDesignCenterStateMutation = useClearCaseDesignCenterStateMutation()
  const [selectedDoctor, setSelectedDoctor] = useState<Doctor | null>(null)
  const [selectedLab, setSelectedLab] = useState<Lab | null>(null)
  const [createdBy, setCreatedBy] = useState<string>("")
  const [patientName, setPatientName] = useState<string>("")
  const [gender, setGender] = useState<string>("")
  const [showRefreshWarningModal, setShowRefreshWarningModal] = useState(false)
  const allowNavigationRef = useRef<boolean>(false)

  // Remove caseDesignCenterState from localStorage on page load/refresh using React Query
  useEffect(() => {
    clearCaseDesignCenterStateMutation.mutate()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Load selected doctor and lab from localStorage
  useEffect(() => {
    // Get selected doctor
    const storedDoctor = localStorage.getItem("selectedDoctor")
    if (storedDoctor) {
      try {
        const doctor = JSON.parse(storedDoctor)
        setSelectedDoctor(doctor)
      } catch (error) {
        console.error("Error parsing selected doctor:", error)
      }
    }

    // Get selected lab
    const labId = searchParams.get("labId")
    const storedLab = localStorage.getItem("selectedLab")
    if (storedLab) {
      try {
        const lab = JSON.parse(storedLab)
        setSelectedLab(lab)
      } catch (error) {
        console.error("Error parsing selected lab:", error)
      }
    }

    // Get created by from localStorage (user info)
    const userStr = localStorage.getItem("user")
    if (userStr) {
      try {
        const user = JSON.parse(userStr)
        setCreatedBy(`${user.first_name || ""} ${user.last_name || ""}`.trim())
      } catch (error) {
        console.error("Error parsing user:", error)
      }
    }
  }, [searchParams])

  // Auto-navigate to case design center when both fields are filled
  useEffect(() => {
    if (patientName.trim() && gender) {
      // Small delay to ensure user has finished typing/selecting
      const timer = setTimeout(() => {
        // Store patient data
        const patientData = {
          name: patientName.trim(),
          gender,
        }
        localStorage.setItem("patientData", JSON.stringify(patientData))

        // Navigate to case design center
        router.push("/case-design-center")
      }, 500) // 500ms delay

      return () => clearTimeout(timer)
    }
  }, [patientName, gender, router])

  // Check if there's unsaved work (patient name or gender entered)
  const hasUnsavedWork = useMemo(() => {
    return patientName.trim().length > 0 || gender.length > 0
  }, [patientName, gender])

  // Handle page refresh/navigation warning
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (hasUnsavedWork && !allowNavigationRef.current) {
        // Show browser's default confirmation
        e.preventDefault()
        e.returnValue = '' // Required for Chrome
        return '' // Required for Safari
      }
    }

    // Add event listener
    window.addEventListener('beforeunload', handleBeforeUnload)

    // Cleanup
    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload)
    }
  }, [hasUnsavedWork])

  // Handle refresh button click (F5 or Ctrl+R / Cmd+R) - show custom modal
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Detect F5 or Ctrl+R / Cmd+R
      if (e.key === 'F5' || (e.key === 'r' && (e.ctrlKey || e.metaKey))) {
        if (hasUnsavedWork && !allowNavigationRef.current) {
          e.preventDefault()
          setShowRefreshWarningModal(true)
        }
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => {
      window.removeEventListener('keydown', handleKeyDown)
    }
  }, [hasUnsavedWork])


  const handleContinue = () => {
    if (!patientName.trim()) {
      toast({
        title: "Validation Error",
        description: "Please enter a patient name",
        variant: "destructive",
      })
      return
    }

    if (!gender) {
      toast({
        title: "Validation Error",
        description: "Please select a gender",
        variant: "destructive",
      })
      return
    }

    // Store patient data
    const patientData = {
      name: patientName.trim(),
      gender,
    }
    localStorage.setItem("patientData", JSON.stringify(patientData))

    // Navigate to case design center
    router.push("/case-design-center")
  }

  return (
    <div className="min-h-screen bg-white">
      <SlipCreationHeader
        variant="full"
        sendingToLab={selectedLab}
        createdBy={createdBy}
        doctor={selectedDoctor}
        editablePatientData={{
          name: patientName,
          gender: gender,
          onNameChange: setPatientName,
          onGenderChange: setGender,
        }}
      />

      <div className="container mx-auto px-6 py-4 max-w-[1600px]">

        {/* Main Content Area - Empty for now */}
        <div className="flex flex-col items-center justify-center min-h-[400px]">
          {/* Content goes here */}
        </div>

      </div>

      {/* Footer - Consistent across all pages */}
      <SlipCreationFooter 
        showPrevious={true}
        onPrevious={() => {
          // Get user role to determine previous step
          const role = typeof window !== "undefined" ? localStorage.getItem("role") || "" : ""
          const doctorId = searchParams.get("doctorId")
          const labId = searchParams.get("labId")
          
          // If office_admin, go back to choose-lab
          if (role === "office_admin") {
            router.push("/choose-lab")
          } 
          // If doctorId exists, go back to choose-doctor
          else if (doctorId) {
            router.push(`/choose-doctor${labId ? `?labId=${labId}` : ""}`)
          }
          // Otherwise go back to choose-lab
          else {
            router.push("/choose-lab")
          }
        }}
      />

      {/* Refresh Warning Modal */}
      {showRefreshWarningModal && (
        <Dialog open={showRefreshWarningModal} onOpenChange={(open) => {
          if (!open) setShowRefreshWarningModal(false)
        }}>
          <DialogOverlay className="fixed inset-0 z-[100000] bg-black/50 backdrop-blur-sm" />
          <DialogContent className="sm:max-w-[425px] p-6 rounded-lg shadow-lg" style={{ zIndex: 100001 }}>
            <DialogHeader className="text-center">
              <DialogTitle className="text-2xl font-bold text-gray-900">Refresh Page?</DialogTitle>
              <DialogDescription className="text-gray-500 mt-2">
                Are you sure you want to refresh the page? All unsaved changes will be lost. Your work is saved in the browser, but refreshing will reset your current session.
              </DialogDescription>
            </DialogHeader>
            <div className="flex justify-center gap-4 mt-6">
              <Button 
                variant="outline" 
                onClick={() => setShowRefreshWarningModal(false)} 
                className="px-6 py-2 rounded-lg bg-transparent"
              >
                Stay on Page
              </Button>
              <Button 
                onClick={() => {
                  // Allow navigation and refresh
                  allowNavigationRef.current = true
                  setShowRefreshWarningModal(false)
                  // Trigger page refresh
                  window.location.reload()
                }} 
                className="bg-red-600 hover:bg-red-700 text-white px-6 py-2 rounded-lg"
              >
                Yes, Refresh
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      )}
    </div>
  )
}

