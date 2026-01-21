"use client"

import { useState, useEffect, useMemo, useRef } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { Button } from "@/components/ui/button"
import { useToast } from "@/hooks/use-toast"
import { SlipCreationHeader } from "@/components/slip-creation-header"
import { clearSlipCreationStorage } from "@/utils/slip-creation-storage"
import CancelSlipCreationModal from "@/components/cancel-slip-creation-modal"
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
  const [selectedDoctor, setSelectedDoctor] = useState<Doctor | null>(null)
  const [selectedLab, setSelectedLab] = useState<Lab | null>(null)
  const [createdBy, setCreatedBy] = useState<string>("")
  const [patientName, setPatientName] = useState<string>("")
  const [gender, setGender] = useState<string>("")
  const [showCancelModal, setShowCancelModal] = useState(false)
  const [showRefreshWarningModal, setShowRefreshWarningModal] = useState(false)
  const allowNavigationRef = useRef<boolean>(false)

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

  const handleCancel = () => {
    setShowCancelModal(true)
  }

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
      <div 
        className="bg-white flex-shrink-0 sticky bottom-0 left-0 right-0 z-10"
        style={{
          height: "59.94px",
          background: "#FFFFFF",
        }}
      >
        <div className="flex justify-end items-center gap-3 h-full px-6">
          <Button
            onClick={() => router.back()}
            variant="outline"
            style={{
              display: "flex",
              flexDirection: "row",
              justifyContent: "center",
              alignItems: "center",
              padding: "12px 16px",
              gap: "10px",
              minWidth: "111px",
              height: "27px",
              background: "#1162A8",
              borderRadius: "6px",
              border: "none",
              fontFamily: "Verdana",
              fontStyle: "normal",
              fontWeight: 700,
              fontSize: "12px",
              lineHeight: "22px",
              letterSpacing: "-0.02em",
              color: "#FFFFFF",
              whiteSpace: "nowrap",
            }}
            className="hover:opacity-90"
          >
            Previous
          </Button>
          <Button
            onClick={handleCancel}
            variant="outline"
            style={{
              boxSizing: "border-box",
              display: "flex",
              flexDirection: "row",
              justifyContent: "center",
              alignItems: "center",
              padding: "12px 16px",
              gap: "10px",
              minWidth: "111px",
              height: "27px",
              border: "2px solid #9BA5B7",
              borderRadius: "6px",
              fontFamily: "Verdana",
              fontStyle: "normal",
              fontWeight: 700,
              fontSize: "12px",
              lineHeight: "22px",
              letterSpacing: "-0.02em",
              color: "#9BA5B7",
              background: "transparent",
              whiteSpace: "nowrap",
            }}
            className="hover:opacity-80"
          >
            Cancel
          </Button>
        </div>
      </div>

      {/* Cancel Slip Creation Modal */}
      {showCancelModal && (
        <CancelSlipCreationModal
          open={showCancelModal}
          onCancel={() => setShowCancelModal(false)}
          onConfirm={() => {
            setShowCancelModal(false)
            setTimeout(() => {
              router.replace("/dashboard")
            }, 100)
          }}
        />
      )}

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

