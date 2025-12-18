"use client"

import { useState, useEffect } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { Button } from "@/components/ui/button"
import { useToast } from "@/hooks/use-toast"
import { SlipCreationHeader } from "@/components/slip-creation-header"
import { clearSlipCreationStorage } from "@/utils/slip-creation-storage"

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

  const handleCancel = () => {
    // Clear all slip creation storage when canceling
    clearSlipCreationStorage()
    router.back()
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
        <div className="flex justify-end items-center h-full px-6">
          <Button
            onClick={handleCancel}
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
        </div>
      </div>
    </div>
  )
}

