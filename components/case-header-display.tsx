"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { XIcon } from "lucide-react"
import Image from "next/image"
import AddSlipHeader from "./add-slip-header" // Corrected import
import { DeliveryDateModal } from "./delivery-date-modal"
import { useRouter } from "next/navigation"

interface CaseHeaderDisplayProps {
  onClose: () => void
}

export default function CaseHeaderDisplay({ onClose }: CaseHeaderDisplayProps) {
  const router = useRouter()
  const [formData, setFormData] = useState({
    office: "",
    office_id: "",
    lab: "lab1", // Default value for demonstration
    doctor: "doc1", // Default value for demonstration
    patient: "pat1", // Default value for demonstration
    caseNumber: "C-001",
    slipNumber: "S-001",
    creationDate: new Date().toISOString().split("T")[0],
    creationTime: new Date().toTimeString().split(" ")[0].substring(0, 5),
    location: "Main Office",
    status: "in-progress",
    pickupDate: "2025-07-20",
    pickupTime: "10:00",
    deliveryDate: "2025-07-22",
    deliveryTime: "15:00",
    panNumber: "PAN12345", // Example read-only value
    createdBy: "user1", // Added to match AddSlipHeader type
    caseStatus: "in-progress", // Added to match AddSlipHeader type
  })

  const [isDeliveryDateModalOpen, setIsDeliveryDateModalOpen] = useState(false)

  const handleFormChange = (field: string, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }))
  }

  const handleOpenDeliveryDateModal = () => {
    setIsDeliveryDateModalOpen(true)
  }

  const handleCloseDeliveryDateModal = () => {
    setIsDeliveryDateModalOpen(false)
  }

  const handleSaveDeliveryDate = (date: string, time: string) => {
    setFormData((prev) => ({
      ...prev,
      deliveryDate: date,
      deliveryTime: time,
    }))
    setIsDeliveryDateModalOpen(false)
  }

  return (
    <div className="flex flex-col w-full">
      {/* Top section with logo, title, and close button */}
      <div className="flex items-center justify-between p-4 border-b">
        <div className="flex items-center gap-2">
          <h2 className="text-xl font-bold">Add Slip</h2>
        </div>
        <Button
          variant="ghost"
          size="icon"
          onClick={() => {
            router.push("/dashboard")
          }}
        >
          <XIcon className="h-6 w-6" />
          <span className="sr-only">Close</span>
        </Button>
      </div>

      {/* Reusing AddSlipHeader for the main content */}
      <AddSlipHeader
        formData={formData}
        setFormData={(fn) => {
          const updated = fn(formData)
          setFormData(updated)
        }}
        selectedLabObj={null}
        selectedOfficeObj={null}
        doctorOptions={[]}
        officeOptions={[]}
        createdBy={formData.createdBy}
        onOpenDeliveryDateModal={handleOpenDeliveryDateModal}
        formErrors={{}}
        doctorDropdownOpen={false}
        setDoctorDropdownOpen={() => {}}
        isSubmitted={false}
        onContinue={() => {}}
        onOfficeSelect={() => {}}
        onRefreshOffices={() => {}}
      />

      {/* Placeholder for DeliveryDateModal - assuming it's a separate component */}
      {/* <DeliveryDateModal
        isOpen={isDeliveryDateModalOpen}
        onClose={handleCloseDeliveryDateModal}
        onSave={handleSaveDeliveryDate}
        initialDate={formData.deliveryDate}
        initialTime={formData.deliveryTime}
      /> */}
    </div>
  )
}
